import { 
    ApiCallStepSchema, 
    FlowRuntimeState, 
    StepDefinition,
    StepHandler
} from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';
import { executeConfiguredApiCall } from '../utils/api-executor';

export const handleApiCall: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState
) => {
  const correlationId = runtimeState.flowExecutionId;
  const parsedStepDef = ApiCallStepSchema.safeParse(stepDefinition);

  if (!parsedStepDef.success) {
    log_error("StepDefinition for API_CALL is invalid.", { errors: parsedStepDef.error.flatten() }, correlationId);
    throw new Error("Invalid StepDefinition for API_CALL.");
  }
  const { data: apiStepDef } = parsedStepDef;
  log_info(`Executing API_CALL step: ${apiStepDef.name}`, {}, correlationId);

  // The core logic is now delegated to the utility function.
  // The handler's job is to extract the correct configuration from the step definition
  // and pass it to the executor.
  try {
    const response = await executeConfiguredApiCall(
        apiStepDef, // The parsed step definition matches the utility's input type
        runtimeState, 
        correlationId
    );

    // The entire response (status, headers, data) is available for output mapping.
    // This matches the previous behavior.
    return {
      outputData: {
        status: response.status,
        headers: response.headers,
        data: response.data,
      },
    };
  } catch (error: any) {
    // The utility function already logs the details. We just re-throw the error
    // so the iterative-step-processor can handle retries or fallbacks.
    log_error(`API_CALL step '${apiStepDef.name}' failed.`, { error: error.message }, correlationId);
    throw error;
  }
};
