import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import {
  FlowRuntimeState,
  StepHandler,
  StepHandlerOutput,
  TransientStepError,
  StartFlowExecutionInputSchema,
  ENV_VAR_NAMES,
  StepDefinition,
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

  console.log(`Starting new flow execution with input:`, stepInput, correlationId);
  
  // The input is already merged and rendered by the dispatcher.
  const validationResult = StartFlowExecutionInputSchema.safeParse(stepInput);

  if (!validationResult.success) {
    log_error("Invalid input for system-start-flow-execution module.", { 
        errors: validationResult.error.flatten(), 
        receivedInput: stepInput
    }, correlationId);
    throw new Error(`Invalid input for start-flow-execution: ${validationResult.error.message}`);
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
    // If the queue is FIFO, we could generate a group ID here.
    // MessageGroupId: runtimeState.flowExecutionId, 
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
