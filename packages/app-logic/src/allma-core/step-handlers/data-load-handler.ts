import {
  FlowRuntimeState,
  StepDefinition,
  StepHandler,
} from '@allma/core-types';
import { log_error } from '@allma/core-sdk';
import { getModuleHandler } from '../module-registry.js';
import { renderNestedTemplates } from '../../allma-core/utils/template-renderer.js';

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
    // Isolate templating string resolution to the customConfig only
    const rawCustomConfig = (stepDefinition as any).customConfig || {};
    const templateContext = { ...runtimeState.currentContextData, ...runtimeState, ...stepInput };
    const renderedCustomConfig = await renderNestedTemplates(rawCustomConfig, templateContext, correlationId) || {};

    // Combine the rendered static customConfig with the dynamic input from the mappings.
    const combinedInput = { ...renderedCustomConfig, ...stepInput };

    // We pass the authoritative `stepDefinition` down to the module handler,
    // but the module handler sources all its active data from the `combinedInput`.
    return moduleHandler(stepDefinition, combinedInput, runtimeState);
  } else {
    log_error(`No handler registered in the module registry for identifier: '${moduleIdentifier}'`, {}, correlationId);
    throw new Error(`Unsupported DATA_LOAD module: ${moduleIdentifier}`);
  }
};