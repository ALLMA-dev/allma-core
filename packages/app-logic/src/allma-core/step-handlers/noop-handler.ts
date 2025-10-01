// packages/allma-app-logic/src/allma-core/step-handlers/noop-handler.ts

import { FlowRuntimeState, StepDefinition, StepHandler } from '@allma/core-types';
import { log_info } from '@allma/core-sdk';

export const handleNoOp: StepHandler = async (
    stepDefinition: StepDefinition,
    stepInput: Record<string, any>,
    runtimeState: FlowRuntimeState
) => {
  log_info(`Executing NO_OP step: ${stepDefinition.name}`, { inputData: stepInput }, runtimeState.flowExecutionId);

  // NO_OP step simply passes through its input as its output.
  return {
    outputData: {
      ...stepInput,
      message: `NO_OP step '${stepDefinition.name}' executed successfully.`,
    },
  };
};
