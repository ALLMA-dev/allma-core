import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  DynamoDBLoaderCustomConfigSchema,
  FlowRuntimeState,
  StepHandler,
  TransientStepError,
  StepDefinition
} from '@allma/core-types';
import { log_error, log_info, log_warn } from '@allma/core-sdk';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * A standard StepHandler for fetching data from DynamoDB based on a declarative config.
 * It now expects a pre-rendered configuration.
 */
export const handleDynamoDBLoader: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
) => {
  const correlationId = runtimeState.flowExecutionId;

  // The stepInput is now the combined, rendered input.
  const configParseResult = DynamoDBLoaderCustomConfigSchema.safeParse(stepInput);
  if (!configParseResult.success) {
    log_error("Invalid stepInput for system/dynamodb-data-loader.", { errors: configParseResult.error.flatten(), receivedInput: stepInput }, correlationId);
    throw new Error(`Invalid stepInput for dynamodb-data-loader: ${configParseResult.error.message}`);
  }
  const config = configParseResult.data;
  log_info(`Executing DynamoDB Data Loader operation: ${config.operation}`, { tableName: config.tableName }, correlationId);
  
  let ddbCommand: GetCommand | QueryCommand | ScanCommand;
  let ddbCommandParams: any;

  try {
    let result: any;
    
    switch (config.operation) {
      case 'GET': {
        ddbCommand = new GetCommand({
          TableName: config.tableName,
          Key: config.key, // Use directly, already rendered
          ProjectionExpression: config.projectionExpression,
          ExpressionAttributeNames: config.expressionAttributeNames,
        });
        ddbCommandParams = ddbCommand.input;
        const response = await ddbDocClient.send(ddbCommand);
        result = response.Item || null;
        break;
      }

      case 'QUERY': {
        ddbCommand = new QueryCommand({
          TableName: config.tableName,
          IndexName: config.indexName,
          Select: config.select,
          KeyConditionExpression: config.keyConditionExpression,
          FilterExpression: config.filterExpression,
          ProjectionExpression: config.projectionExpression,
          ExpressionAttributeValues: config.expressionAttributeValues, // Use directly
          ExpressionAttributeNames: config.expressionAttributeNames,
          Limit: config.limit,
          ScanIndexForward: config.scanIndexForward,
        });
        ddbCommandParams = ddbCommand.input;
        const response = await ddbDocClient.send(ddbCommand);
        if (config.select === 'COUNT') {
          // The response from a COUNT query in DynamoDB returns 'Count' and 'ScannedCount'.
          // 'Items' will be undefined. We return an object with the count.
          result = { Count: response.Count, ScannedCount: response.ScannedCount };
        } else {
          // Default behavior: return the array of items.
          result = response.Items || [];
        }
        break;
      }

      case 'SCAN': {
        log_warn('Executing a SCAN operation. This can be slow and expensive. Use with caution in production.', { tableName: config.tableName }, correlationId);
        ddbCommand = new ScanCommand({
          TableName: config.tableName,
          IndexName: config.indexName,
          Select: config.select,
          FilterExpression: config.filterExpression,
          ProjectionExpression: config.projectionExpression,
          ExpressionAttributeValues: config.expressionAttributeValues, // Use directly
          ExpressionAttributeNames: config.expressionAttributeNames,
          Limit: config.limit,
        });
        ddbCommandParams = ddbCommand.input;
        const response = await ddbDocClient.send(ddbCommand);

        if (config.select === 'COUNT') {
            result = { Count: response.Count, ScannedCount: response.ScannedCount };
        } else {
            result = response.Items || [];
        }
        break;
      }
    }

    return {
      outputData: {
        content: result,
        _meta: { dynamodb_params: ddbCommandParams },
      }
    };
  } catch (error: any) {
    log_error(`DynamoDB operation '${config.operation}' failed.`, { tableName: config.tableName, error: error.message, params: ddbCommandParams }, correlationId);
    (error as any).details = { ...(error as any).details, dynamodb_params: ddbCommandParams };
    if (['ProvisionedThroughputExceededException', 'ThrottlingException'].includes(error.name)) {
      throw new TransientStepError(`DynamoDB operation failed due to throttling: ${error.message}`);
    }
    throw error;
  }
};