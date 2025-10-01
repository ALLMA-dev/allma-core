import {
  FlowRuntimeState,
  StepDefinition,
  StepHandler,
} from '@allma/core-types';
import { log_error } from '@allma/core-sdk';
import { getModuleHandler } from '../module-registry.js';

/**
 * Handler for DATA_LOAD steps.
 * This function acts as a generic dispatcher, looking up the appropriate
 * module handler in the central registry and executing it.
 */
export const handleDataLoad: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
) => {
  const correlationId = runtimeState.flowExecutionId;

  // The module identifier now comes directly from the authoritative, merged stepDefinition.
  const moduleIdentifier = (stepDefinition as any).moduleIdentifier;

  // Validate that we have a module identifier to work with.
  if (typeof moduleIdentifier !== 'string' || !moduleIdentifier) {
    const errorMessage = `Module identifier is missing or not a string for step ${stepDefinition.id}.`;
    log_error(errorMessage, { stepDefinition }, correlationId);
    throw new Error(errorMessage);
  }

  // Look up the handler in our central registry.
  const moduleHandler = getModuleHandler(moduleIdentifier);

  if (moduleHandler) {
    // Per the new standardized pattern, we combine the static (but rendered)
    // customConfig from the step definition with the dynamic input from the
    // previous step. This combined object becomes the definitive input for the module.
    const customConfig = (stepDefinition as any).customConfig || {};
    const combinedInput = { ...customConfig, ...stepInput };

    // We now pass the authoritative `stepDefinition` down to the module handler,
    // but the module handler should source all its data and config from the
    // `combinedInput`.
    return moduleHandler(stepDefinition, combinedInput, runtimeState);
  } else {
    log_error(`No handler registered in the module registry for identifier: '${moduleIdentifier}'`, {}, correlationId);
    throw new Error(`Unsupported DATA_LOAD module: ${moduleIdentifier}`);
  }
};
