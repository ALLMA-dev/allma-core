import { StepType, StepHandler, SYSTEM_STEP_DEFINITIONS, SystemModuleIdentifiers } from '@allma/core-types';
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

// Import module executors for the new dispatcher handlers
import { executeSqsSender } from '../data-savers/sqs-sender.js';
import { executeSnsPublisher } from '../data-savers/sns-publisher.js';
import { executeStartFlowExecution } from '../data-savers/start-flow-execution.js';



// --- Dispatcher for MESSAGING steps ---
const messagingModuleRegistry = SYSTEM_STEP_DEFINITIONS
    .filter(def => def.stepType === StepType.MESSAGING)
    .reduce((acc, def) => {
        switch (def.moduleIdentifier) {
            case SystemModuleIdentifiers.SQS_SEND:
                acc[def.moduleIdentifier] = executeSqsSender;
                break;
            case SystemModuleIdentifiers.SNS_PUBLISH:
                acc[def.moduleIdentifier] = executeSnsPublisher;
                break;
        }
        return acc;
    }, {} as Record<string, StepHandler>);
export const handleMessaging: StepHandler = async (stepDefinition, stepInput, runtimeState) => {
  const moduleIdentifier = (stepDefinition as any).moduleIdentifier;
  if (typeof moduleIdentifier !== 'string' || !moduleIdentifier) {
    throw new Error(`Module identifier is missing for MESSAGING step ${stepDefinition.id}.`);
  }
  const handler = messagingModuleRegistry[moduleIdentifier];
  if (handler) {
    const combinedInput = { ...((stepDefinition as any).customConfig || {}), ...stepInput };
    return handler(stepDefinition, combinedInput, runtimeState);
  }
  throw new Error(`Unsupported MESSAGING module: ${moduleIdentifier}`);
};

// --- Dispatcher for START_FLOW_EXECUTION steps ---
const flowControlModuleRegistry = SYSTEM_STEP_DEFINITIONS
    .filter(def => def.stepType === StepType.START_FLOW_EXECUTION)
    .reduce((acc, def) => {
        if (def.moduleIdentifier === SystemModuleIdentifiers.START_FLOW_EXECUTION) {
            acc[def.moduleIdentifier] = executeStartFlowExecution;
        }
        return acc;
    }, {} as Record<string, StepHandler>);
export const handleStartFlowExecution: StepHandler = async (stepDefinition, stepInput, runtimeState) => {
    const moduleIdentifier = (stepDefinition as any).moduleIdentifier;
    if (typeof moduleIdentifier !== 'string' || !moduleIdentifier) {
        throw new Error(`Module identifier is missing for START_FLOW_EXECUTION step ${stepDefinition.id}.`);
    }
    const handler = flowControlModuleRegistry[moduleIdentifier];
    if (handler) {
        const combinedInput = { ...((stepDefinition as any).customConfig || {}), ...stepInput };
        return handler(stepDefinition, combinedInput, runtimeState);
    }
    throw new Error(`Unsupported START_FLOW_EXECUTION module: ${moduleIdentifier}`);
};


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
  [StepType.MESSAGING]: handleMessaging,
  [StepType.START_FLOW_EXECUTION]: handleStartFlowExecution,
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
