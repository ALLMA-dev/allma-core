import {
  FlowRuntimeState,
  StepDefinition,
  DataTransformationStepSchema,
  StepHandler,
  SystemModuleIdentifiers,
  SYSTEM_STEP_DEFINITIONS,
  StepType,
} from '@allma/core-types';
import { log_error } from '@allma/core-sdk';
import { executeComposeObjectTransformer } from '../data-transformers/compose-object-transformer.js';
import { executeGenerateArrayTransformer } from '../data-transformers/generate-array-transformer.js';
import { executeArrayAggregatorTransformer } from '../data-transformers/array-aggregator-transformer.js';
import { executeFlattenArrayTransformer } from '../data-transformers/flatten-array-transformer.js';
import { executeDateTimeCalculator } from '../data-transformers/date-time-calculator.js';

const dataTransformationModuleRegistry = SYSTEM_STEP_DEFINITIONS
  .filter(def => def.stepType === StepType.DATA_TRANSFORMATION)
  .reduce((acc, def) => {
    switch (def.moduleIdentifier) {
      case SystemModuleIdentifiers.COMPOSE_OBJECT_FROM_INPUT:
        acc[def.moduleIdentifier] = executeComposeObjectTransformer;
        break;
      case SystemModuleIdentifiers.GENERATE_ARRAY:
        acc[def.moduleIdentifier] = executeGenerateArrayTransformer;
        break;
      case SystemModuleIdentifiers.ARRAY_AGGREGATOR:
        acc[def.moduleIdentifier] = executeArrayAggregatorTransformer;
        break;
      case SystemModuleIdentifiers.FLATTEN_ARRAY:
        acc[def.moduleIdentifier] = executeFlattenArrayTransformer;
        break;
      case SystemModuleIdentifiers.DATE_TIME_CALCULATOR:
        acc[def.moduleIdentifier] = executeDateTimeCalculator;
        break;
    }
    return acc;
  }, {} as Record<string, StepHandler>);

/**
 * Main handler for DATA_TRANSFORMATION steps. It acts as a dispatcher based on the moduleIdentifier.
 */
export const handleDataTransformation: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
) => {
  const correlationId = runtimeState.flowExecutionId;
  const parsedStepDef = DataTransformationStepSchema.safeParse(stepDefinition);

  if (!parsedStepDef.success) {
    log_error("StepDefinition for DATA_TRANSFORMATION is invalid.", { errors: parsedStepDef.error.flatten() }, correlationId);
    throw new Error("Invalid StepDefinition for DATA_TRANSFORMATION.");
  }

  const { moduleIdentifier, customConfig } = parsedStepDef.data;

  const handler = moduleIdentifier ? dataTransformationModuleRegistry[moduleIdentifier] : undefined;

  if (handler) {
    // Combine static config with dynamic input to make modules more configurable.
    // stepInput (from mappings) takes precedence over customConfig.
    const combinedInput = {
      ...(customConfig || {}),
      ...stepInput,
    };
    return handler(stepDefinition, combinedInput, runtimeState);
  } else {
    log_error(`Unsupported or missing moduleIdentifier for DATA_TRANSFORMATION step: '${moduleIdentifier}'`, {}, correlationId);
    throw new Error(`Unsupported or unconfigured DATA_TRANSFORMATION module: ${moduleIdentifier}`);
  }
};
