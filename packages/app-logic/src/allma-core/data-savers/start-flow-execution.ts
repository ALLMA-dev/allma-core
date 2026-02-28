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
import { TemplateService } from '../template-service.js';
import { renderNestedTemplates } from '../utils/template-renderer.js';

const sqsClient = new SQSClient({});
const FLOW_START_QUEUE_URL = process.env[ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_URL];

/**
 * A generic data-saving module that starts a new, independent flow execution
 * by sending a message to the central flow start SQS queue.
 * This is a "trigger and forget" operation.
 *
 * @param stepInput The mapped inputs for the new flow configuration.
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

  // 1. Parse the step's own configuration
  const stepConfigValidation = StartFlowExecutionStepPayloadSchema.safeParse(stepDefinition);
  if (!stepConfigValidation.success) {
    log_error("Invalid step definition for system/start-flow-execution module.", {
      errors: stepConfigValidation.error.flatten(),
    }, correlationId);
    throw new Error(`Invalid step definition for start-flow-execution: ${stepConfigValidation.error.message}`);
  }
  const { flowDefinitionId, flowVersion } = stepConfigValidation.data;

  // 2. Perform Explicit Sub-Rendering
  // We manually evaluate templates for the string fields belonging strictly to this logic's configuration.
  const templateService = TemplateService.getInstance();
  const templateContext = { ...runtimeState.currentContextData, ...runtimeState, ...stepInput };

  const renderedFlowDefId = await templateService.render(flowDefinitionId, templateContext, correlationId);
  const renderedFlowVersion = await templateService.render(flowVersion, templateContext, correlationId);
  
  const rawCustomConfig = (stepDefinition as any).customConfig || {};
  const renderedCustomConfig = await renderNestedTemplates(rawCustomConfig, templateContext, correlationId) || {};

  // 3. Construct Payload
  // The `stepInput` contains data from `inputMappings`. `initialContextData` is expected here.
  const { initialContextData, ...restOfStepInput } = stepInput;

  const payloadForSqs: Partial<StartFlowExecutionInput> = {
    ...renderedCustomConfig,
    ...restOfStepInput,
    flowDefinitionId: renderedFlowDefId,
    flowVersion: renderedFlowVersion,
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