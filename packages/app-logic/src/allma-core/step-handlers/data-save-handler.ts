import {
  FlowRuntimeState,
  StepDefinition,
  StepHandler,
  SYSTEM_STEP_DEFINITIONS,
  StepType,
  SystemModuleIdentifiers,
} from '@allma/core-types';
import { log_error } from '@allma/core-sdk';
import { executeDynamoDBUpdate } from '../data-savers/dynamodb-update-item.js';
import { executeDynamoDBQueryAndUpdate } from '../data-savers/dynamodb-query-and-update.js';
import { executeS3Saver } from '../data-savers/s3-saver.js';
import { renderNestedTemplates } from '../../allma-core/utils/template-renderer.js';

const dataSaveModuleRegistry = SYSTEM_STEP_DEFINITIONS
    .filter(def => def.stepType === StepType.DATA_SAVE)
    .reduce((acc, def) => {
        switch (def.moduleIdentifier) {
            case SystemModuleIdentifiers.DYNAMODB_UPDATE_ITEM:
                acc[def.moduleIdentifier] = executeDynamoDBUpdate;
                break;
            case SystemModuleIdentifiers.DYNAMODB_QUERY_AND_UPDATE:
                acc[def.moduleIdentifier] = executeDynamoDBQueryAndUpdate;
                break;
            case SystemModuleIdentifiers.S3_DATA_SAVER:
                acc[def.moduleIdentifier] = executeS3Saver;
                break;
        }
        return acc;
    }, {} as Record<string, StepHandler>);

/**
 * Main handler for DATA_SAVE steps. It acts as a dispatcher based on the moduleIdentifier
 * from the step's customConfig.
 */
export const handleDataSave: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>, // This contains dynamic data from inputMappings
  runtimeState: FlowRuntimeState,
) => {
  const correlationId = runtimeState.flowExecutionId;
  const moduleIdentifier = (stepDefinition as any).moduleIdentifier;

  if (typeof moduleIdentifier !== 'string' || !moduleIdentifier) {
    const errorMessage = `Module identifier is missing for DATA_SAVE step ${stepDefinition.id}.`;
    log_error(errorMessage, { stepInstanceId: runtimeState.currentStepInstanceId }, correlationId);
    throw new Error(errorMessage);
  }

  const handler = dataSaveModuleRegistry[moduleIdentifier];

  if (handler) {
    // Isolate templating string resolution to the customConfig only
    const rawCustomConfig = (stepDefinition as any).customConfig || {};
    const templateContext = { ...runtimeState.currentContextData, ...runtimeState, ...stepInput };
    const renderedCustomConfig = await renderNestedTemplates(rawCustomConfig, templateContext, correlationId) || {};

    const combinedInput = {
        ...renderedCustomConfig,
        ...stepInput,
    };

    return handler(stepDefinition, combinedInput, runtimeState);
  } else {
    log_error(`Unsupported moduleIdentifier for DATA_SAVE step: '${moduleIdentifier}'`, {}, correlationId);
    throw new Error(`Unsupported DATA_SAVE module: ${moduleIdentifier}`);
  }
};