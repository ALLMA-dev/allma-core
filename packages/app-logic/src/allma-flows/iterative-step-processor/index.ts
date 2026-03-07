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
    isS3Pointer,
    isS3OutputPointerWrapper,
    ENV_VAR_NAMES,
} from '@allma/core-types';
import {
    log_info, log_error, log_debug, log_warn, deepMerge, resolveS3Pointer, isObject, offloadIfLarge,
} from '@allma/core-sdk';
import { loadFlowDefinition } from '../../allma-core/config-loader.js';
import { handleTerminalError } from './error-handler.js';
import { determineNextSfnAction, resolveNextStep } from './transition-resolver.js';
import { handleAsyncResume, handleWaitForEvent } from './async-handler.js';
import { executeStandardStep } from './step-executor.js';
import { handleParallelFork, handleParallelAggregation } from './parallel-handler.js';
import { prepareStepInput } from '../../allma-core/data-mapper.js';
import { executionLoggerClient } from '../../allma-core/execution-logger-client.js';
import { handleSyncFlowStart, handleSyncFlowResult } from './sync-flow-handler.js';

const EXECUTION_TRACES_BUCKET_NAME = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME];

/**
 * AWS Lambda handler for the "IterativeStepProcessor" state.
 * This is the main worker Lambda in the ALLMA orchestration loop.
 * It orchestrates step execution by delegating to specialized modules.
 */
export const handler: Handler<ProcessorInput, ProcessorOutput | void> = async (event, context) => {
    console.log("IterativeStepProcessor RAW_EVENT:", JSON.stringify(event, null, 2));

    const originalEvent = event;
    let runtimeState: FlowRuntimeState = event.runtimeState;
    const isBranchExecution = !!runtimeState.branchId;

    const { taskToken, parallelAggregateInput, resumePayload, pollingResult, syncFlowResult } = originalEvent;
    const correlationId = runtimeState.flowExecutionId;

    let flowDef: FlowDefinition | undefined;
    let stepInstance: StepInstance | undefined;

    try {
        // --- HYDRATION LOGIC ---
        // This logic handles context passed via S3 for large parallel jobs or auto-offloaded states.
        const s3ContextPointer = (runtimeState.currentContextData as any)._s3_context_pointer;
        if (s3ContextPointer && isS3Pointer(s3ContextPointer)) {
            log_info('State hydration pointer detected. Hydrating shared context from S3.', { pointer: s3ContextPointer }, correlationId);
            const parentContext = await resolveS3Pointer(s3ContextPointer, correlationId);
            
            // Merge the parent context with the current branch context (which contains 'currentItem').
            runtimeState.currentContextData = { ...parentContext, ...runtimeState.currentContextData };
            delete (runtimeState.currentContextData as any)._s3_context_pointer;
            
            log_debug('Shared context hydrated successfully.', { finalContextKeys: Object.keys(runtimeState.currentContextData) }, correlationId);
        }
        // --- END HYDRATION LOGIC ---

        if (syncFlowResult) {
            log_info('Processing result from synchronous sub-flow execution.', {}, correlationId);
            if (!flowDef) {
                flowDef = await loadFlowDefinition(runtimeState.flowDefinitionId, runtimeState.flowDefinitionVersion, correlationId);
            }
            runtimeState = await handleSyncFlowResult(originalEvent, runtimeState, flowDef, correlationId);
            const { nextStepId } = await resolveNextStep(flowDef.steps[runtimeState.currentStepInstanceId!], runtimeState);
            runtimeState.currentStepInstanceId = nextStepId;
        } else if (resumePayload || pollingResult) {
            if (!flowDef) {
                flowDef = await loadFlowDefinition(runtimeState.flowDefinitionId, runtimeState.flowDefinitionVersion, correlationId);
            }
            runtimeState = handleAsyncResume(originalEvent, runtimeState, flowDef);

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

            const nextActionDetails = await determineNextSfnAction(runtimeState, flowDef, correlationId);

            const isDirectInvocation = !context.functionName;
            if (runtimeState._internal && !isDirectInvocation) {
                delete runtimeState._internal.currentStepStartTime;
                delete runtimeState._internal.currentStepHandlerResult;
                if (Object.keys(runtimeState._internal).length === 0) {
                    delete runtimeState._internal;
                }
            }

            let finalOutput: ProcessorOutput = {
                runtimeState,
                sfnAction: nextActionDetails.sfnAction,
                ...(nextActionDetails.pollingTaskInput && { pollingTaskInput: nextActionDetails.pollingTaskInput })
            };
            
            if (EXECUTION_TRACES_BUCKET_NAME) {
                const offloadedContext = await offloadIfLarge(
                    runtimeState.currentContextData,
                    EXECUTION_TRACES_BUCKET_NAME,
                    `flow_state/${correlationId}/${runtimeState.currentStepInstanceId || 'end'}`,
                    correlationId,
                    200 * 1024 // 200KB safe threshold for SFN
                );
                if (offloadedContext && isS3OutputPointerWrapper(offloadedContext)) {
                    log_warn(`IterativeStepProcessor context size exceeded threshold. Auto-offloaded currentContextData to S3.`, {}, correlationId);
                    runtimeState.currentContextData = { _s3_context_pointer: offloadedContext._s3_output_pointer };
                }
            }
            return finalOutput;
        }

        const currentStepInstanceId = runtimeState.currentStepInstanceId;
        if (currentStepInstanceId) {
            log_info(`Processing step: '${currentStepInstanceId}'`, { isBranchExecution }, correlationId);
            
            const stepStartTime = new Date().toISOString();
            if (!runtimeState._internal) {
                runtimeState._internal = {};
            }
            runtimeState._internal.currentStepStartTime = stepStartTime;

            if (!flowDef) {
                flowDef = await loadFlowDefinition(runtimeState.flowDefinitionId, runtimeState.flowDefinitionVersion, correlationId);
            }

            stepInstance = flowDef.steps[currentStepInstanceId];

            if (!stepInstance) {
                throw new Error(`Configuration for step '${currentStepInstanceId}' not found in flow definition.`);
            }

            const parsedStepInstance = StepInstanceSchema.safeParse(stepInstance);
            if (!parsedStepInstance.success) throw new Error(`Config for step '${currentStepInstanceId}' is invalid: ${parsedStepInstance.error.message}`);
            stepInstance = parsedStepInstance.data;

            const overrides = runtimeState.executionOverrides?.stepOverrides?.[currentStepInstanceId];
            if (overrides) {
                log_info(`Applying step overrides for '${currentStepInstanceId}'`, { overrides }, correlationId);
                stepInstance = deepMerge(stepInstance, overrides) as StepInstance;
            }

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
                    if (EXECUTION_TRACES_BUCKET_NAME) {
                        const offloadedContext = await offloadIfLarge(
                            forkOutput.runtimeState.currentContextData,
                            EXECUTION_TRACES_BUCKET_NAME,
                            `flow_state/${correlationId}/${forkOutput.runtimeState.currentStepInstanceId || 'end'}`,
                            correlationId,
                            200 * 1024
                        );
                        if (offloadedContext && isS3OutputPointerWrapper(offloadedContext)) {
                            forkOutput.runtimeState.currentContextData = { _s3_context_pointer: offloadedContext._s3_output_pointer };
                        }
                    }
                    return forkOutput;
                }
                const { nextStepId } = await resolveNextStep(stepInstance, runtimeState);
                runtimeState.currentStepInstanceId = nextStepId;

            } else if (stepType === StepType.START_FLOW_EXECUTION && (stepInstance as any).customConfig?.sync === true) {
                log_info(`Step '${currentStepInstanceId}' is a synchronous START_FLOW_EXECUTION. Preparing sub-flow.`, {}, correlationId);
                const syncOutput = await handleSyncFlowStart(stepInstance, runtimeState, correlationId);
                if (EXECUTION_TRACES_BUCKET_NAME) {
                    const offloadedContext = await offloadIfLarge(
                        syncOutput.runtimeState.currentContextData,
                        EXECUTION_TRACES_BUCKET_NAME,
                        `flow_state/${correlationId}/${syncOutput.runtimeState.currentStepInstanceId || 'end'}`,
                        correlationId,
                        200 * 1024
                    );
                    if (offloadedContext && isS3OutputPointerWrapper(offloadedContext)) {
                        syncOutput.runtimeState.currentContextData = { _s3_context_pointer: offloadedContext._s3_output_pointer };
                    }
                }
                return syncOutput;
            } else {
                const stepDef = stepInstance as unknown as StepDefinition; 
                if (stepDef.stepType !== stepType) {
                    log_warn(`Step type mismatch for '${currentStepInstanceId}'. FlowDef says '${stepType}', but resolved StepDef is '${stepDef.stepType}'. Using resolved StepDef type.`, {}, correlationId);
                }

                if (taskToken && stepType === StepType.WAIT_FOR_EXTERNAL_EVENT) {
                    await handleWaitForEvent(taskToken, stepDef, runtimeState, correlationId);
                    return;
                }

                let contextForMappings = { ...runtimeState, ...runtimeState.currentContextData };

                const currentItem = runtimeState.currentContextData?.currentItem;
                if (isObject(currentItem) && isS3OutputPointerWrapper(currentItem)) {
                    log_info('Branch step requires hydration. Creating temporary hydrated context.', { keys: Object.keys(currentItem) }, correlationId);
                    
                    const { _s3_output_pointer, ...restOfCurrentItem } = currentItem;
                    const hydratedContent = await resolveS3Pointer(_s3_output_pointer, correlationId);

                    let mergedCurrentItem;
                    if (isObject(hydratedContent)) {
                        mergedCurrentItem = { ...hydratedContent, ...restOfCurrentItem };
                    } else {
                        mergedCurrentItem = { ...restOfCurrentItem, content: hydratedContent };
                    }
                    contextForMappings.currentItem = mergedCurrentItem;
                    log_info('Successfully hydrated and merged currentItem for step execution.', { finalKeys: Object.keys(mergedCurrentItem) }, correlationId);
                }
                
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

    if (isBranchExecution && !runtimeState.currentStepInstanceId) {
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

    if (EXECUTION_TRACES_BUCKET_NAME) {
        const offloadedContext = await offloadIfLarge(
            runtimeState.currentContextData,
            EXECUTION_TRACES_BUCKET_NAME,
            `flow_state/${correlationId}/${runtimeState.currentStepInstanceId || 'end'}`,
            correlationId,
            200 * 1024 // 200KB safe threshold for SFN
        );

        if (offloadedContext && isS3OutputPointerWrapper(offloadedContext)) {
            log_warn(`IterativeStepProcessor context size exceeded threshold. Auto-offloaded currentContextData to S3.`, {}, correlationId);
            runtimeState.currentContextData = { 
                _s3_context_pointer: offloadedContext._s3_output_pointer 
            };
        }
    }

    log_debug(`IterativeStepProcessor final output for ${runtimeState.currentStepInstanceId || 'end-of-flow'}:`, finalOutput.pollingTaskInput ? { ...finalOutput, pollingTaskInput: 'OMITTED_FOR_BREVITY' } : finalOutput, correlationId);

    return finalOutput;
};