import { FlowRuntimeState } from '../runtime/core.js';
import { StepDefinition } from './definitions.js';

/**
 * Standardized output from any step handler.
 */
export interface StepHandlerOutput {
  outputData: Record<string, any> | undefined;
  specializedOutput?: Record<string, any>;
}

/**
 * The functional interface for a step handler module.
 */
export type StepHandler = (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState
) => Promise<StepHandlerOutput>;
