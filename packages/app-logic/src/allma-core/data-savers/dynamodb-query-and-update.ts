import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { FlowRuntimeState, StepHandler, StepHandlerOutput, TransientStepError, StepDefinition } from '@allma/core-types';
import { log_error, log_info, log_debug, log_warn } from '@allma/core-sdk';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Defines the schema for the customConfig of this specific step.
const DynamoDBQueryAndUpdateConfigSchema = z.object({
  query: z.object({
    tableName: z.string().min(1),
    // NEW: Optional array of primary key attribute names for performance.
    keyAttributes: z.array(z.string()).min(1).optional(),
    indexName: z.string().min(1).optional(),
    keyConditionExpression: z.string().min(1),
    expressionAttributeValues: z.record(z.any()),
    // Limit the number of items to query (and attempt to update).
    // This also protects against overly large transactions.
    limit: z.number().int().min(1).max(1000000).default(100),
  }),
  update: z.object({
    updateExpression: z.string().min(1),
    expressionAttributeNames: z.record(z.string()).optional(),
    expressionAttributeValues: z.record(z.any()).optional(),
    // Optional, user-provided condition to add to the per-item update check.
    conditionExpression: z.string().optional(),
  }),
});

/**
 * A system module that atomically finds items via a query and applies an update to them.
 * This is ideal for work queue patterns where multiple workers need to claim jobs.
 */
export const executeDynamoDBQueryAndUpdate: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;
  const validationResult = DynamoDBQueryAndUpdateConfigSchema.safeParse(stepInput);

  if (!validationResult.success) {
    const errorMsg = `Invalid input for system/dynamodb-query-and-update module.`;
    log_error(errorMsg, { errors: validationResult.error.flatten(), receivedInput: stepInput }, correlationId);
    throw new Error(`${errorMsg}: ${validationResult.error.message}`);
  }

  const config = validationResult.data;
  log_info(`Executing query-and-update on table: ${config.query.tableName}`, { limit: config.query.limit }, correlationId);

  // 1. Query for candidate items to claim.
  const queryCommand = new QueryCommand({
    TableName: config.query.tableName,
    IndexName: config.query.indexName,
    KeyConditionExpression: config.query.keyConditionExpression,
    ExpressionAttributeValues: config.query.expressionAttributeValues,
    Limit: config.query.limit,
  });

  const queryResult = await ddbDocClient.send(queryCommand);
  if (!queryResult.Items || queryResult.Items.length === 0) {
    log_info('Query returned no items to process.', {}, correlationId);
    return {
      outputData: { updatedItemCount: 0, items: [] },
    };
  }
  log_debug(`Found ${queryResult.Items.length} candidate items to claim.`, {}, correlationId);

  // 2. Determine key schema (efficiently).
  let keyAttributes: string[];
  if (config.query.keyAttributes) {
    keyAttributes = config.query.keyAttributes;
    log_debug('Using key attributes from configuration.', { keyAttributes }, correlationId);
  } else {
    log_warn(`'keyAttributes' not provided in config for table '${config.query.tableName}'. Falling back to DescribeTableCommand. For better performance, please specify the primary key attributes in the step configuration.`, {}, correlationId);
    const tableDescription = await ddbDocClient.send(
      new DescribeTableCommand({ TableName: config.query.tableName })
    );
    const keySchema = tableDescription.Table?.KeySchema;
    if (!keySchema) throw new Error(`Could not determine key schema for table ${config.query.tableName}`);
    keyAttributes = keySchema.map(k => k.AttributeName!);
  }

  // 3. Attempt to update each candidate item individually with a condition check.
  const successfullyUpdatedItems: Record<string, any>[] = [];
  const updatePromises = queryResult.Items.map(async (item) => {
    const itemKey = Object.fromEntries(keyAttributes.map(k => {
      if (item[k] === undefined) {
        throw new Error(`Primary key attribute '${k}' not found in item returned from query. Ensure the index projects all primary key attributes.`);
      }
      return [k, item[k]];
    }));

    const updateCommand = new UpdateCommand({
      TableName: config.query.tableName,
      Key: itemKey,
      UpdateExpression: config.update.updateExpression,
      // The condition ensures we only update the item if it still exists and meets any extra user criteria.
      // This is the core of the atomic claim, preventing race conditions.
      ConditionExpression: config.update.conditionExpression,
      ExpressionAttributeNames: config.update.expressionAttributeNames,
      ExpressionAttributeValues: config.update.expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    try {
      const updateResult = await ddbDocClient.send(updateCommand);
      if (updateResult.Attributes) {
        successfullyUpdatedItems.push(updateResult.Attributes);
      }
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        // This is an expected outcome during a race condition, not a system error.
        log_debug(`Conditional check failed for an item, likely claimed by another worker.`, { key: itemKey }, correlationId);
      } else if (['ProvisionedThroughputExceededException', 'ThrottlingException'].includes(error.name)) {
        throw new TransientStepError(`DynamoDB update failed due to throttling: ${error.message}`);
      } else {
        // Re-throw unexpected errors to fail the step.
        throw error;
      }
    }
  });

  await Promise.all(updatePromises);

  log_info(`Successfully claimed and updated ${successfullyUpdatedItems.length} out of ${queryResult.Items.length} candidate items.`, {}, correlationId);

  return {
    outputData: {
      updatedItemCount: successfullyUpdatedItems.length,
      items: successfullyUpdatedItems,
    },
  };
};
