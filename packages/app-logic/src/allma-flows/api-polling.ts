import { Handler } from 'aws-lambda';
import { JSONPath } from 'jsonpath-plus';
import { ApiCallDefinition, FlowRuntimeState } from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';
import { executeConfiguredApiCall } from '../allma-core/utils/api-executor';

// The input to this Lambda from the polling Step Function
interface PollingLambdaInput {
  // This is the definition of the API call to be polled.
  apiCallDefinition: ApiCallDefinition;
  // Conditions to check against the API response.
  exitConditions: { 
    successCondition: string; // JSONPath
    failureCondition: string; // JSONPath
  };
  // The full context of the main flow, needed for templating.
  flowContext: FlowRuntimeState;
}

// The output of this Lambda, used by the Choice state in the polling SFN.
interface PollingLambdaOutput {
  isSuccessConditionMet: boolean;
  isFailureConditionMet: boolean;
  responseData: any; // The raw data from the API response
}

export const handler: Handler<PollingLambdaInput, PollingLambdaOutput> = async (event) => {
  const { apiCallDefinition, exitConditions, flowContext } = event;
  const correlationId = flowContext.flowExecutionId;
  log_info('Executing polling check', {}, correlationId);

  try {
    // 1. Reuse the centralized API execution logic.
    // We pass flowContext as the runtimeState, which is what the utility expects.
    const response = await executeConfiguredApiCall(
        apiCallDefinition,
        flowContext,
        correlationId
    );

    // 2. Perform the logic unique to polling: evaluate exit conditions.
    const responseData = response.data;
    
    // Evaluate success condition. A truthy result means the loop succeeds.
    const successResult = JSONPath({ path: exitConditions.successCondition, json: responseData, wrap: false });
    
    // Evaluate failure condition. A truthy result means the loop fails.
    const failureResult = JSONPath({ path: exitConditions.failureCondition, json: responseData, wrap: false });

    const isSuccessConditionMet = !!successResult;
    const isFailureConditionMet = !!failureResult;
    
    log_info('Polling exit conditions evaluated', { isSuccessConditionMet, isFailureConditionMet }, correlationId);

    return {
      isSuccessConditionMet,
      isFailureConditionMet,
      responseData: responseData,
    };
  } catch (error: any) {
    // If the API call itself fails (e.g., 500 error), the polling SFN has its own retry logic
    // on the Lambda task. We must re-throw the error for that to work.
    log_error('API call within polling loop failed.', { error: error.message }, correlationId);
    throw error;
  }
};
