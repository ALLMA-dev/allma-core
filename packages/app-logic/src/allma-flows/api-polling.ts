import { Handler } from 'aws-lambda';
import { JSONPath } from 'jsonpath-plus';
import { ApiCallDefinition, FlowRuntimeState, isS3Pointer } from '@allma/core-types';
import { log_error, log_info, resolveS3Pointer } from '@allma/core-sdk';
import { executeConfiguredApiCall } from '../allma-core/utils/api-executor';

interface PollingLambdaInput {
  apiCallDefinition: ApiCallDefinition;
  exitConditions: { 
    successCondition: string; 
    failureCondition: string; 
  };
  flowContext: FlowRuntimeState;
}

interface PollingLambdaOutput {
  isSuccessConditionMet: boolean;
  isFailureConditionMet: boolean;
  responseData: any; 
}

export const handler: Handler<PollingLambdaInput, PollingLambdaOutput> = async (event) => {
  const { apiCallDefinition, exitConditions, flowContext } = event;
  const correlationId = flowContext.flowExecutionId;
  log_info('Executing polling check', {}, correlationId);

  try {
    // --- HYDRATE STATE IF IT WAS OFFLOADED BY PREVIOUS STEP ---
    const s3ContextPointer = (flowContext.currentContextData as any)._s3_context_pointer;
    if (s3ContextPointer && isS3Pointer(s3ContextPointer)) {
        log_info('Hydrating offloaded context in api-polling.', {}, correlationId);
        const fullContext = await resolveS3Pointer(s3ContextPointer, correlationId);
        flowContext.currentContextData = { ...fullContext, ...flowContext.currentContextData };
        delete (flowContext.currentContextData as any)._s3_context_pointer;
    }
    // --- END HYDRATION ---

    const templateSourceData = { ...flowContext.currentContextData, ...flowContext };
    const response = await executeConfiguredApiCall(
        apiCallDefinition,
        flowContext,
        correlationId,
        templateSourceData
    );

    const responseData = response.data;
    
    const successResult = JSONPath({ path: exitConditions.successCondition, json: responseData, wrap: false });
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
    log_error('API call within polling loop failed.', { error: error.message }, correlationId);
    throw error;
  }
};