import { StepType, StepHandler } from '@allma/core-types';
import { log_error } from '@allma/core-sdk';

// Import handlers for specific step types
import { handleLlmInvocation } from './llm-invocation-handler.js';
import { handleNoOp } from './noop-handler.js';
import { handleApiCall } from './api-call-handler.js';
import { handlePollExternalApi } from './poll-external-api-handler.js';
import { handleWaitForExternalEvent } from './wait-for-external-event-handler.js';
import { handleDataLoad } from './data-load-handler.js';
import { handleDataTransformation } from './data-transformation-handler.js';
import { handleDataSave } from './data-save-handler.js';
import { handleCustomLambdaInvoke } from './custom-lambda-invoke-handler.js';
import { handleMcpCall } from './mcp-call-handler.js';

// Import module executors for the new dispatcher handlers
import { executeSqsSender } from '../data-savers/sqs-sender.js';
import { executeSnsPublisher } from '../data-savers/sns-publisher.js';
import { executeStartFlowExecution } from '../data-savers/start-flow-execution.js';
import { executeSendEmail } from './email/send-email-handler.js';


const handlerRegistry: Partial<Record<StepType, StepHandler>> = {
  [StepType.LLM_INVOCATION]: handleLlmInvocation,
  [StepType.NO_OP]: handleNoOp,
  [StepType.API_CALL]: handleApiCall,
  [StepType.POLL_EXTERNAL_API]: handlePollExternalApi,
  [StepType.WAIT_FOR_EXTERNAL_EVENT]: handleWaitForExternalEvent,
  [StepType.DATA_LOAD]: handleDataLoad,
  [StepType.DATA_TRANSFORMATION]: handleDataTransformation,
  [StepType.DATA_SAVE]: handleDataSave,
  [StepType.CUSTOM_LAMBDA_INVOKE]: handleCustomLambdaInvoke,
  [StepType.START_FLOW_EXECUTION]: executeStartFlowExecution,
  [StepType.MCP_CALL]: handleMcpCall,

  
  [StepType.EMAIL]: executeSendEmail,
  [StepType.SQS_SEND]: executeSqsSender,
  [StepType.SNS_PUBLISH]: executeSnsPublisher,

  // Start point steps are entry points and perform no action during execution.
  // They are treated as NO_OPs to simply pass control to the next step.
  [StepType.EMAIL_START_POINT]: handleNoOp,
  [StepType.SCHEDULE_START_POINT]: handleNoOp,

  // Future handlers would be registered here
};

export function getStepHandler(stepType: StepType): StepHandler {
  const handler = handlerRegistry[stepType];
  if (!handler) {
    log_error(`No step handler registered for stepType: ${stepType}`);
    throw new Error(`Unsupported stepType: ${stepType}`);
  }
  return handler;
}
