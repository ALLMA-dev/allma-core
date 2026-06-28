import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  FlowRuntimeState,
  StepHandler,
  StepHandlerOutput,
  TransientStepError,
  StepDefinition,
  DynamoDBUpdateItemCustomConfigSchema as DynamoDBUpdateConfigSchema,
} from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * A generic data-saving module that performs a DynamoDB UpdateItem operation.
 * It now expects a pre-rendered input object.
 */
export const executeDynamoDBUpdate: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;
  
  // The input is already merged and rendered by the dispatcher.
  const validationResult = DynamoDBUpdateConfigSchema.safeParse(stepInput);

  if (!validationResult.success) {
    log_error("Invalid input for system/dynamodb-update-item module.", { errors: validationResult.error.flatten(), receivedInput: stepInput }, correlationId);
    throw new Error(`Invalid input for dynamodb-update-item: ${validationResult.error.message}`);
  }

  const config = validationResult.data;
  
  log_info(`Performing DynamoDB update on table: ${config.tableName}`, { key: config.key }, correlationId);

  const command = new UpdateCommand({
    TableName: config.tableName,
    Key: config.key,
    UpdateExpression: config.updateExpression,
    ExpressionAttributeNames: config.expressionAttributeNames,
    ExpressionAttributeValues: config.expressionAttributeValues,
    ConditionExpression: config.conditionExpression,
    ReturnValues: 'UPDATED_NEW',
  });

  try {
    const result = await ddbDocClient.send(command);
    return {
      outputData: {
        updatedAttributes: result.Attributes,
        _meta: { 
          status: 'SUCCESS',
          dynamodb_params: command.input,
        },
      },
    };
  } catch (error: any) {
    log_error(`Failed to update item in DynamoDB table: ${config.tableName}`, { error: error.message, name: error.name, params: command.input }, correlationId);
    (error as any).details = { ...(error as any).details, dynamodb_params: command.input };
    if (['ProvisionedThroughputExceededException', 'ThrottlingException'].includes(error.name)) {
      throw new TransientStepError(`DynamoDB update failed due to throttling: ${error.message}`);
    }
    throw error;
  }
};
