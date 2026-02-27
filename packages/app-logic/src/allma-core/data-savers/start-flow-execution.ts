import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import {
  FlowRuntimeState,
  StepHandler,
  StepHandlerOutput,
  TransientStepError,
  StartFlowExecutionInputSchema,
  ENV_VAR_NAMES,
  StepDefinition,
  StartFlowExecutionInput,
  StartFlowExecutionStepPayloadSchema,
} from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';
import { v4 as uuidv4 } from 'uuid';

const sqsClient = new SQSClient({});
const FLOW_START_QUEUE_URL = process.env[ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_URL];

/**
 * A generic data-saving module that starts a new, independent flow execution
 * by sending a message to the central flow start SQS queue.
 * This is a "trigger and forget" operation.
 *
 * @param stepInput The pre-rendered configuration object, which should match StartFlowExecutionInput.
 * @param runtimeState The current flow runtime state for context and logging.
 * @returns A StepHandlerOutput containing the SQS MessageId on success.
 */
export const executeStartFlowExecution: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;

  if (!FLOW_START_QUEUE_URL) {
    throw new Error('Configuration error: ALLMA_FLOW_START_REQUEST_QUEUE_URL is not set. Cannot start a new flow.');
  }

  // 1. Parse the step's own configuration from the (already rendered) stepDefinition.
  // The step-executor ensures that template strings in these fields are resolved.
  const stepConfigValidation = StartFlowExecutionStepPayloadSchema.safeParse(stepDefinition);
  if (!stepConfigValidation.success) {
    log_error("Invalid step definition for system/start-flow-execution module.", {
      errors: stepConfigValidation.error.flatten(),
    }, correlationId);
    throw new Error(`Invalid step definition for start-flow-execution: ${stepConfigValidation.error.message}`);
  }
  const { flowDefinitionId, flowVersion } = stepConfigValidation.data;

  // 2. The `stepInput` contains data from `inputMappings`. `initialContextData` is expected here.
  // Any other properties from `inputMappings` are passed through.
  const { initialContextData, ...restOfStepInput } = stepInput;

  // 3. Construct the final payload for SQS, which must match StartFlowExecutionInputSchema.
  // We combine the configuration from the step definition with the dynamic data from input mappings.
  const payloadForSqs: Partial<StartFlowExecutionInput> = {
    ...restOfStepInput,
    flowDefinitionId,
    flowVersion,
    initialContextData: initialContextData || {},
  };

  // 4. Validate the constructed payload.
  const validationResult = StartFlowExecutionInputSchema.safeParse(payloadForSqs);

  if (!validationResult.success) {
    log_error("Invalid final input for system/start-flow-execution module. Check step configuration and input mappings.", {
      errors: validationResult.error.flatten(),
      constructedPayload: payloadForSqs,
    }, correlationId);
    throw new Error(`Invalid final input for start-flow-execution: ${validationResult.error.message}`);
  }

  const payload = validationResult.data;

  // Ensure the new flow has a unique execution ID.
  const newFlowExecutionId = payload.flowExecutionId || uuidv4();

  const finalPayload: typeof payload = {
    ...payload,
    flowExecutionId: newFlowExecutionId,
    // Enhance trigger source for better traceability
    triggerSource: `ParentFlow:${runtimeState.flowExecutionId}:${runtimeState.currentStepInstanceId} -> ${payload.triggerSource || 'Unknown'}`,
  };

  log_info(`Sending request to start new flow execution`, {
    queueUrl: FLOW_START_QUEUE_URL,
    newFlowExecutionId: newFlowExecutionId,
    flowToStart: finalPayload.flowDefinitionId,
  }, correlationId);

  const command = new SendMessageCommand({
    QueueUrl: FLOW_START_QUEUE_URL,
    MessageBody: JSON.stringify(finalPayload),
  });

  try {
    const result = await sqsClient.send(command);
    log_info(`Successfully sent message to start new flow.`, { messageId: result.MessageId }, correlationId);
    return {
      outputData: {
        sqsMessageId: result.MessageId,
        startedFlowExecutionId: newFlowExecutionId,
        _meta: { status: 'SUCCESS' },
      },
    };
  } catch (error: any) {
    log_error(`Failed to send message to SQS queue: ${FLOW_START_QUEUE_URL}`, { error: error.message }, correlationId);
    if (['ServiceUnavailable', 'ThrottlingException'].includes(error.name)) {
      throw new TransientStepError(`SQS send failed due to a transient error: ${error.message}`);
    }
    throw error;
  }
};