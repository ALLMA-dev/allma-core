import {
  StepType,
  type FlowDefinition,
  type FlowRuntimeState,
  type StepInstance,
} from '@allma/core-types';

/**
 * Test fixture builders. Each returns a minimal-but-valid object with sensible defaults and
 * accepts a shallow `overrides` patch (merged at the top level). Keep these generic — they
 * must never encode product-specific shapes.
 */

const FIXED_TIMESTAMP = '2024-01-01T00:00:00.000Z';
const FIXED_EXECUTION_ID = '00000000-0000-4000-8000-000000000000';

/** Build a single step instance. Defaults to a terminal NO_OP step. */
export const makeStepInstance = (overrides: Partial<StepInstance> = {}): StepInstance => ({
  stepInstanceId: 'step-1',
  stepType: StepType.NO_OP,
  ...overrides,
});

/** Build a flow definition with one NO_OP start step unless overridden. */
export const makeFlowDefinition = (overrides: Partial<FlowDefinition> = {}): FlowDefinition => ({
  id: 'flow-test',
  version: 1,
  isPublished: false,
  startStepInstanceId: 'step-1',
  steps: { 'step-1': makeStepInstance() },
  enableExecutionLogs: false,
  flowVariables: {},
  createdAt: FIXED_TIMESTAMP,
  updatedAt: FIXED_TIMESTAMP,
  ...overrides,
});

/** Build the runtime state for an in-flight flow. `currentContextData` defaults to `{}`. */
export const makeRuntimeState = (overrides: Partial<FlowRuntimeState> = {}): FlowRuntimeState => ({
  flowDefinitionId: 'flow-test',
  flowDefinitionVersion: 1,
  flowExecutionId: FIXED_EXECUTION_ID,
  enableExecutionLogs: false,
  status: 'RUNNING',
  startTime: FIXED_TIMESTAMP,
  currentContextData: {},
  stepRetryAttempts: {},
  transitionCounts: {},
  ...overrides,
});

/**
 * Build a `currentContextData` object. Just a passthrough that documents intent at call
 * sites and gives a single place to evolve the default context shape.
 */
export const makeContext = (
  data: Record<string, unknown> = {}
): Record<string, unknown> => ({ ...data });
