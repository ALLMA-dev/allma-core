import { Handler } from 'aws-lambda';
import {
    RetryableStepError,
    SfnActionType,
    FlowDefinition,
    StepInstance,
    ProcessorOutput,
    ProcessorInput,
    StepType,
    StepDefinition,
    StepInstanceSchema,
    FlowRuntimeState,
    AllmaError,
    ContentBasedRetryableError,
} from '@allma/core-types';
import {
    log_info, log_error, log_debug, log_warn, deepMerge, isObject,
} from '@allma/core-sdk';
import { loadFlowDefinition, loadStepDefinition } from '../../allma-core/config-loader.js';
import { handleTerminalError } from './error-handler.js';
import { determineNextSfnAction, resolveNextStep } from './transition-resolver.js';
import { handleAsyncResume, handleWaitForEvent } from './async-handler.js';
import { executeStandardStep } from './step-executor.js';
import { handleParallelFork, handleParallelAggregation } from './parallel-handler.js';
import { prepareStepInput } from '../../allma-core/data-mapper.js';
import { executionLoggerClient } from '../../allma-core/execution-logger-client.js';

/**
 * Recursively traverses a configuration object and rewrites simple JSONPaths
 * to be relative to the map state's parent context.
 * @param obj The configuration object or array to traverse.
 * @param prefix The prefix to add (e.g., '$.mapContext.runtimeState.currentContextData').
 * @returns The object with rewritten paths.
 */
function rewriteJsonPathsInConfig(obj: any, prefix: string): any {
    if (Array.isArray(obj)) {
        return obj.map(item => rewriteJsonPathsInConfig(item, prefix));
    }
    if (isObject(obj)) {
        const newObj: Record<string, any> = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = rewriteJsonPathsInConfig(obj[key], prefix);
            }
        }
        return newObj;
    }
    if (typeof obj === 'string' && obj.startsWith('$.') && !obj.startsWith('$.currentItem') && !obj.startsWith('$.mapContext')) {
        // This is a simple root path that needs rewriting.
        // We remove the '$' from the original path and prepend the prefix.
        return `${prefix}${obj.substring(1)}`;
    }
    // Return primitives and already-correct paths as-is.
    return obj;
}

/**
 * AWS Lambda handler for the "IterativeStepProcessor" state.
 * This is the main worker Lambda in the ALLMA orchestration loop.
 * It orchestrates step execution by delegating to specialized modules.
 */
export const handler: Handler<ProcessorInput, ProcessorOutput | void> = async (event, context) => {
    const isMapContext = Object.prototype.hasOwnProperty.call(event, 'mapContext');
    const originalEvent = event;
    let runtimeState: FlowRuntimeState;

    if (isMapContext) {
        const mapEvent = event as any;
        runtimeState = mapEvent.mapContext.runtimeState;
        runtimeState.currentContextData = {
            ...mapEvent.mapContext.runtimeState.currentContextData,
            currentItem: mapEvent.currentItem,
        };
        event = {
            runtimeState: runtimeState,
            sfnAction: SfnActionType.PROCESS_STEP
        };
    } else {
        runtimeState = event.runtimeState;
    }

    const { taskToken, parallelAggregateInput, resumePayload, pollingResult } = originalEvent;
    const correlationId = runtimeState.flowExecutionId;

    let flowDef: FlowDefinition | undefined;
    let stepInstance: StepInstance | undefined;

    try {
        if (resumePayload || pollingResult) {
            flowDef = await loadFlowDefinition(runtimeState.flowDefinitionId, runtimeState.flowDefinitionVersion, correlationId);
            runtimeState = handleAsyncResume(originalEvent, runtimeState, flowDef);

            // After resuming, the async step has "completed". We must resolve its successor immediately.
            const completedStepConfig = flowDef.steps[runtimeState.currentStepInstanceId!];
            const { nextStepId } = await resolveNextStep(completedStepConfig, runtimeState);
            runtimeState.currentStepInstanceId = nextStepId;
        }

        if (parallelAggregateInput) {
            if (!flowDef) {
                flowDef = await loadFlowDefinition(runtimeState.flowDefinitionId, runtimeState.flowDefinitionVersion, correlationId);
            }
            const aggregationResult = await handleParallelAggregation(parallelAggregateInput, runtimeState, flowDef, correlationId);
            runtimeState = aggregationResult.updatedRuntimeState;
            runtimeState.currentStepInstanceId = aggregationResult.nextStepId;

            // After aggregation, return to let the next SFN iteration process the next step.
            // This aligns behavior with other async steps (wait, poll) and simplifies flow logic.
            const nextActionDetails = await determineNextSfnAction(runtimeState, flowDef, correlationId);

            const isDirectInvocation = !context.functionName;
            if (runtimeState._internal && !isDirectInvocation) {
                delete runtimeState._internal.currentStepStartTime;
                delete runtimeState._internal.currentStepHandlerResult;
                if (Object.keys(runtimeState._internal).length === 0) {
                    delete runtimeState._internal;
                }
            }

            const finalOutput: ProcessorOutput = {
                runtimeState,
                sfnAction: nextActionDetails.sfnAction,
                ...(nextActionDetails.pollingTaskInput && { pollingTaskInput: nextActionDetails.pollingTaskInput })
            };
            return finalOutput;
        }

        const currentStepInstanceId = runtimeState.currentStepInstanceId;
        if (currentStepInstanceId) {
            log_info(`Processing step: '${currentStepInstanceId}'`, { inMapContext: isMapContext }, correlationId);
            if (!flowDef) {
                flowDef = await loadFlowDefinition(runtimeState.flowDefinitionId, runtimeState.flowDefinitionVersion, correlationId);
            }

            const originalStepInstance = flowDef.steps[currentStepInstanceId];

            if (!originalStepInstance) {
                throw new Error(`Configuration for step '${currentStepInstanceId}' not found in flow definition.`);
            }

            if (isMapContext) {
                log_debug(`Rewriting JSONPaths for map context execution of step '${currentStepInstanceId}'`, {}, correlationId);
                stepInstance = rewriteJsonPathsInConfig(originalStepInstance, '$.mapContext.runtimeState.currentContextData');
            } else {
                stepInstance = originalStepInstance;
            }

            const parsedStepInstance = StepInstanceSchema.safeParse(stepInstance);
            if (!parsedStepInstance.success) throw new Error(`Config for step '${currentStepInstanceId}' is invalid: ${parsedStepInstance.error.message}`);
            stepInstance = parsedStepInstance.data;

            const overrides = runtimeState.executionOverrides?.stepOverrides?.[currentStepInstanceId];
            if (overrides) {
                log_info(`Applying step overrides for '${currentStepInstanceId}'`, { overrides }, correlationId);
                stepInstance = deepMerge(stepInstance, overrides) as StepInstance;
            }

            const stepStartTime = new Date().toISOString();
            if (!runtimeState._internal) {
                runtimeState._internal = {};
            }
            runtimeState._internal.currentStepStartTime = stepStartTime;

            const { stepType } = stepInstance;

            if (stepType === StepType.END_FLOW) {
                log_info(`Step '${currentStepInstanceId}' is an END_FLOW step. Terminating this flow path.`, {}, correlationId);

                if (runtimeState.enableExecutionLogs) {
                    const stepEndTime = new Date().toISOString();
                    await executionLoggerClient.logStepExecution({
                        flowExecutionId: correlationId,
                        branchId: runtimeState.branchId,
                        branchExecutionId: runtimeState.branchExecutionId,
                        stepInstanceId: currentStepInstanceId,
                        stepDefinitionId: stepInstance.stepDefinitionId || 'system-end-flow',
                        stepType: stepType,
                        status: 'COMPLETED',
                        eventTimestamp: stepEndTime,
                        startTime: runtimeState._internal?.currentStepStartTime || stepEndTime,
                        endTime: stepEndTime,
                        durationMs: runtimeState._internal?.currentStepStartTime ? (new Date(stepEndTime).getTime() - new Date(runtimeState._internal.currentStepStartTime).getTime()) : 0,
                        attemptNumber: 1,
                        inputMappingContext: runtimeState.currentContextData,
                    });
                }

                runtimeState.currentStepInstanceId = undefined;
            } else if (stepType === StepType.PARALLEL_FORK_MANAGER) {
                const currentAttempt = (runtimeState.stepRetryAttempts[currentStepInstanceId] || 0) + 1;
                runtimeState.stepRetryAttempts[currentStepInstanceId] = currentAttempt;

                if (runtimeState.enableExecutionLogs) {
                    await executionLoggerClient.logStepExecution({
                        flowExecutionId: correlationId,
                        branchId: runtimeState.branchId,
                        branchExecutionId: runtimeState.branchExecutionId,
                        stepInstanceId: currentStepInstanceId,
                        stepDefinitionId: stepInstance.stepDefinitionId || 'parallel_fork_manager',
                        stepType: stepType,
                        status: 'STARTED',
                        eventTimestamp: stepStartTime,
                        startTime: stepStartTime,
                        attemptNumber: currentAttempt,
                        inputMappingContext: runtimeState.currentContextData,
                        stepInstanceConfig: stepInstance,
                    });
                }

                const forkOutput = await handleParallelFork(stepInstance, runtimeState, correlationId);
                if (forkOutput) {
                    return forkOutput;
                }
                const { nextStepId } = await resolveNextStep(stepInstance, runtimeState);
                runtimeState.currentStepInstanceId = nextStepId;

            } else {
                const stepDef = stepInstance as unknown as StepDefinition; 
                if (stepDef.stepType !== stepType) {
                    log_warn(`Step type mismatch for '${currentStepInstanceId}'. FlowDef says '${stepType}', but resolved StepDef is '${stepDef.stepType}'. Using resolved StepDef type.`, {}, correlationId);
                }

                if (taskToken && stepType === StepType.WAIT_FOR_EXTERNAL_EVENT) {
                    await handleWaitForEvent(taskToken, stepDef, runtimeState, correlationId);
                    return;
                }

                const contextForMappings = isMapContext ? (originalEvent as any) : { ...runtimeState, ...runtimeState.currentContextData };

                // *** Determine hydration strategy BEFORE preparing input ***
                const shouldHydrateInputPointers = stepInstance.stepType !== StepType.CUSTOM_LAMBDA_INVOKE || (stepInstance.customConfig as any)?.hydrateInputFromS3 === true;

                const { preparedInput, events: inputMappingEvents } = await prepareStepInput(
                    stepInstance.inputMappings || {},
                    contextForMappings,
                    shouldHydrateInputPointers,
                    correlationId
                );

                const { updatedRuntimeState, nextStepId } = await executeStandardStep(
                    stepInstance,
                    stepDef,
                    runtimeState,
                    preparedInput,
                    inputMappingEvents,
                    stepStartTime,
                    correlationId
                );

                runtimeState = updatedRuntimeState;
                runtimeState.currentStepInstanceId = nextStepId;
            }

            if (currentStepInstanceId) {
                if (runtimeState.stepRetryAttempts) {
                    delete runtimeState.stepRetryAttempts[currentStepInstanceId];
                }
            }
        } else {
            log_info("Flow path complete. No next step.", {}, correlationId);
            if (runtimeState.status === 'RUNNING') runtimeState.status = 'COMPLETED';
        }
    } catch (error: any) {
        if (error instanceof RetryableStepError || error instanceof ContentBasedRetryableError) {
            throw error;
        }

        if (stepInstance && runtimeState.currentStepInstanceId) {
            const stepEndTime = new Date().toISOString();
            const errorInfo: AllmaError = {
                errorName: error.name || 'StepProcessingError',
                errorMessage: error.message,
                errorDetails: {
                    failedStepInstanceId: runtimeState.currentStepInstanceId,
                    cause: error.cause,
                    stack: error.stack?.substring(0, 5000),
                    ...error.details
                },
                isRetryable: false,
            };

            if (runtimeState.enableExecutionLogs) {
                log_error(`Logging preliminary step failure for '${runtimeState.currentStepInstanceId}' before calling handleTerminalError.`, { errorInfo }, correlationId);
                await executionLoggerClient.logStepExecution({
                    flowExecutionId: correlationId,
                    branchId: runtimeState.branchId,
                    branchExecutionId: runtimeState.branchExecutionId,
                    stepInstanceId: runtimeState.currentStepInstanceId,
                    stepDefinitionId: stepInstance.stepDefinitionId || 'unknown-def',
                    stepType: stepInstance.stepType,
                    status: 'FAILED',
                    eventTimestamp: stepEndTime,
                    startTime: runtimeState._internal?.currentStepStartTime || stepEndTime,
                    endTime: stepEndTime,
                    durationMs: runtimeState._internal?.currentStepStartTime ? (new Date(stepEndTime).getTime() - new Date(runtimeState._internal.currentStepStartTime).getTime()) : 0,
                    attemptNumber: runtimeState.stepRetryAttempts?.[runtimeState.currentStepInstanceId] || 1,
                    errorInfo: errorInfo,
                    stepInstanceConfig: stepInstance,
                });
            }

            runtimeState = await handleTerminalError(
                error,
                stepInstance,
                runtimeState,
            );
        } else {
            runtimeState.status = 'FAILED';
            runtimeState.errorInfo = { errorName: 'ConfigurationError', errorMessage: error.message, isRetryable: false, errorDetails: { stack: error.stack } };
            runtimeState.currentStepInstanceId = undefined;
            log_error('Catastrophic configuration error in step processor.', { error: error.message }, correlationId);
        }
    }

    let finalSfnAction = SfnActionType.PROCESS_STEP;
    let pollingTaskInput: any;

    if (runtimeState.currentStepInstanceId && runtimeState.status === 'RUNNING') {
        if (!flowDef) flowDef = await loadFlowDefinition(runtimeState.flowDefinitionId, runtimeState.flowDefinitionVersion, correlationId);
        const nextActionDetails = await determineNextSfnAction(runtimeState, flowDef, correlationId);
        finalSfnAction = nextActionDetails.sfnAction;
        pollingTaskInput = nextActionDetails.pollingTaskInput;
    } else if (runtimeState.status === 'RUNNING' && !runtimeState.currentStepInstanceId) {
        runtimeState.status = 'COMPLETED';
    }

    // This block handles the final cleanup at the very end of a branch's lifecycle.
    if ((isMapContext || runtimeState.branchId) && !runtimeState.currentStepInstanceId) {
        if (runtimeState.currentContextData?.currentItem) {
            log_debug("End of branch reached. Cleaning up 'currentItem' from context.", { branchId: runtimeState.branchId }, correlationId);
            delete runtimeState.currentContextData.currentItem;
        }
    }

    const isDirectInvocation = !context.functionName;
    if (runtimeState._internal && !isDirectInvocation) {
        delete runtimeState._internal.currentStepStartTime;
        delete runtimeState._internal.currentStepHandlerResult;
        if (Object.keys(runtimeState._internal).length === 0) {
            delete runtimeState._internal;
        }
    }

    const finalOutput: ProcessorOutput = {
        runtimeState,
        sfnAction: finalSfnAction,
        ...(pollingTaskInput && { pollingTaskInput })
    };

    log_debug(`IterativeStepProcessor final output for ${runtimeState.currentStepInstanceId || 'end-of-flow'}:`, finalOutput.pollingTaskInput ? { ...finalOutput, pollingTaskInput: 'OMITTED_FOR_BREVITY' } : finalOutput, correlationId);

    return finalOutput;
};