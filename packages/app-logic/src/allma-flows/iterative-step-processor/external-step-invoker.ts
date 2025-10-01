import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { PermanentStepError } from '@allma/core-types';
import { StepHandlerOutput, StepInstance, FlowRuntimeState, ExternalStepRegistryItem, ExternalStepRegistryItemSchema, ENV_VAR_NAMES } from '@allma/core-types';

const ALLMA_CONFIG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME];
if (!ALLMA_CONFIG_TABLE_NAME) {
  throw new Error(`Missing required environment variable: ${ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME}`);
}

const lambdaClient = new LambdaClient({});
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Invokes an external step Lambda function based on its module identifier.
 *
 * @param moduleIdentifier The unique identifier for the external step.
 * @param stepDefinition The definition of the step instance.
 * @param stepInput The input data for the step.
 * @param runtimeState The current state of the flow execution.
 * @returns The output of the external step handler.
 */
export async function invokeExternalStep(
  moduleIdentifier: string,
  stepDefinition: StepInstance,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> {
  // 1. Discover the Lambda ARN from the registry
  const registryItem = await getExternalStepRegistryItem(moduleIdentifier);
  if (!registryItem) {
    throw new PermanentStepError(`No external step registration found for moduleIdentifier: ${moduleIdentifier}`);
  }

  // 2. Construct the payload for the external Lambda
  const payload = {
    stepDefinition,
    stepInput,
    runtimeState,
  };

  // 3. Invoke the Lambda
  const command = new InvokeCommand({
    FunctionName: registryItem.lambdaArn,
    Payload: JSON.stringify(payload),
    InvocationType: 'RequestResponse', // Synchronous invocation
  });

  const response = await lambdaClient.send(command);

  // 4. Handle the response
  if (response.FunctionError) {
    if (response.Payload) {
        const errorPayload = JSON.parse(new TextDecoder().decode(response.Payload));
        throw new PermanentStepError(`External step Lambda for ${moduleIdentifier} failed: ${errorPayload.errorMessage}`, {
            cause: errorPayload,
        });
    } else {
        throw new PermanentStepError(`External step Lambda for ${moduleIdentifier} failed with an unknown error and no payload.`);
    }
  }

  if (!response.Payload) {
    throw new PermanentStepError(`External step Lambda for ${moduleIdentifier} returned a successful response with no payload.`);
  }

  const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
  
  // TODO: Add validation for the response payload against StepHandlerOutputSchema
  return responsePayload as StepHandlerOutput;
}

/**
 * Retrieves an external step's registration details from DynamoDB.
 *
 * @param moduleIdentifier The identifier of the module to retrieve.
 * @returns The registry item, or null if not found.
 */
async function getExternalStepRegistryItem(moduleIdentifier: string): Promise<ExternalStepRegistryItem | null> {
  const command = new GetCommand({
    TableName: ALLMA_CONFIG_TABLE_NAME,
    Key: {
      PK: `EXTERNAL_STEP#${moduleIdentifier}`,
      SK: 'METADATA',
    },
  });

  const result = await ddbDocClient.send(command);
  if (!result.Item) {
    return null;
  }

  const parsed = ExternalStepRegistryItemSchema.safeParse(result.Item);
  if (!parsed.success) {
    // Log a warning, but don't fail the execution
    console.warn(`Invalid external step registry item found for ${moduleIdentifier}:`, parsed.error);
    return null;
  }

  return parsed.data;
}
