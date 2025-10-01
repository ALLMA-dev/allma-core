import {
    FlowRuntimeState,
    StepInstance,
    AllmaError,
} from '@allma/core-types';
import {
    log_warn,
    log_error,
} from '@allma/core-sdk';

/**
 * Handles a terminal (non-retryable) error for a step. It updates the 
 * runtimeState with error information and determines if a fallback step should be 
 * executed or if the flow should fail.
 *
 * NOTE: Logging is now handled by the step-executor's catch block. This function's
 * only responsibility is to mutate the runtime state for flow control.
 *
 * @returns The updated FlowRuntimeState, now marked as FAILED or ready for a fallback.
 */
export const handleTerminalError = async (
    error: any,
    stepInstanceConfig: StepInstance,
    runtimeState: FlowRuntimeState,
): Promise<FlowRuntimeState> => {
    const correlationId = runtimeState.flowExecutionId;
    const currentStepInstanceId = runtimeState.currentStepInstanceId!;

    // The logging is already done by the step-executor's catch block.
    // This function's only job is to update the runtimeState for the next transition.
    const errorInfo: AllmaError = {
        errorName: error.name || 'StepProcessingError',
        errorMessage: error.message,
        errorDetails: { 
            failedStepInstanceId: currentStepInstanceId, 
            cause: error.cause, 
            stack: error.stack?.substring(0, 5000),
            ...error.details // Merge details from the thrown error (e.g., dynamodb_params)
        },
        isRetryable: false,
    };
    runtimeState.errorInfo = errorInfo;

    if (stepInstanceConfig.onError?.fallbackStepInstanceId) {
        log_warn(`Step '${currentStepInstanceId}' failed. Transitioning to fallback step '${stepInstanceConfig.onError.fallbackStepInstanceId}'.`, { error: error.message }, correlationId);
        runtimeState.currentStepInstanceId = stepInstanceConfig.onError.fallbackStepInstanceId;
        runtimeState.status = 'RUNNING'; // Still running if there's a fallback
        delete runtimeState.errorInfo; // Clear flow-level error if we have a fallback
    } else {
        log_error(`Error processing step '${currentStepInstanceId}'. No fallback configured. Flow will fail.`, { error: error.message }, correlationId);
        runtimeState.status = 'FAILED';
        runtimeState.currentStepInstanceId = undefined; // No next step, flow ends
    }
    
    return runtimeState;
};