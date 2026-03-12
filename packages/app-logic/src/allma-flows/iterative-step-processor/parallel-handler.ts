import { JSONPath } from 'jsonpath-plus';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
    FlowRuntimeState,
    StepInstance,
    AggregationConfig,
    AggregationStrategy,
    BranchResult,
    ProcessorOutput,
    ProcessorInput,
    SfnActionType,
    BranchExecutionPayload,
    FlowDefinition,
    isS3OutputPointerWrapper,
    StepType,
    ENV_VAR_NAMES,
    PermanentStepError,
    S3Pointer,
    MappingEvent,
} from '@allma/core-types';
import {
    log_info, log_error, log_warn, log_debug, resolveS3Pointer, offloadIfLarge,
} from '@allma/core-sdk';
import { processStepOutput, getSmartValueByJsonPath } from '../../allma-core/data-mapper.js';
import { executionLoggerClient } from '../../allma-core/execution-logger-client.js';
import { resolveNextStep } from './transition-resolver.js';

// Configure client with adaptive retry strategy to smoothly handle massive traffic spikes
const s3Client = new S3Client({ maxAttempts: 10, retryMode: 'adaptive' });
const EXECUTION_TRACES_BUCKET_NAME = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME];

// Reduced to 100KB to ensure that combining it with runtimeState doesn't exceed SFN's 256KB limit.
const SFN_INLINE_PAYLOAD_LIMIT_BYTES = 100 * 1024; 

// Read global limit. Default to a safe "soft limit" of 20 if undefined.
const GLOBAL_MAX_CONCURRENCY_STR = process.env[ENV_VAR_NAMES.MAX_CONCURRENT_STEP_EXECUTIONS];
const GLOBAL_MAX_CONCURRENCY = GLOBAL_MAX_CONCURRENCY_STR ? parseInt(GLOBAL_MAX_CONCURRENCY_STR, 10) : 20;

/**
 * Aggregates the results from parallel branch executions based on the defined strategy.
 * Mutates runtimeState on failure.
 * @returns The aggregated data, or null if aggregation causes the flow to fail.
 */
function aggregateBranchOutputs(
    branchOutputs: BranchResult[],
    aggregationConfig: AggregationConfig,
    runtimeState: FlowRuntimeState,
    correlationId: string
): Record<string, any> | null {
    log_debug('Aggregating branch outputs.', { branchOutputs, aggregationConfig }, correlationId);

    if (!aggregationConfig.dataPath) {
        log_warn(`No 'dataPath' provided in aggregationConfig. The entire branch result (from '$.output' of the branch context) will be aggregated.`, { stepInstanceId: runtimeState.currentStepInstanceId }, correlationId);
    }
    
    // Step 1: Process all branch outputs to extract data or preserve errors.
    const processedOutputs = branchOutputs.map(branchResult => {
        if (branchResult.error) {
            return { branchId: branchResult.branchId, error: branchResult.error };
        }
        
        const dataToExtractFrom = branchResult.output;
        
        if (!aggregationConfig.dataPath) {
            return { branchId: branchResult.branchId, output: dataToExtractFrom };
        }

        try {
            const extractedValue = JSONPath({ path: aggregationConfig.dataPath, json: dataToExtractFrom, wrap: false });
            return { branchId: branchResult.branchId, output: extractedValue };
        } catch (e: any) {
            log_warn(`Failed to apply dataPath '${aggregationConfig.dataPath}' to a branch output.`, { branchId: branchResult.branchId, error: e.message }, correlationId);
            return { branchId: branchResult.branchId, error: { errorName: 'DataPathError', errorMessage: `Failed to extract data using path: ${e.message}`, isRetryable: false } };
        }
    });

    const successfulResults = processedOutputs.filter(res => !res.error).map(res => res.output);
    const errorResults = processedOutputs.filter(res => res.error);

    // Step 2: Check for failures if failOnBranchError is true.
    if (aggregationConfig.failOnBranchError && errorResults.length > 0) {
        log_error('Aggregation failed due to branch error(s) and failOnBranchError is true.', {
            branchErrors: errorResults
        }, correlationId);
        runtimeState.errorInfo = {
            errorName: 'ParallelBranchExecutionError',
            errorMessage: `One or more parallel branches failed. First error: ${errorResults[0].error?.errorMessage}`,
            errorDetails: { branchErrors: errorResults },
            isRetryable: false,
        };
        runtimeState.status = 'FAILED';
        return null;
    }

    // Step 3: Perform aggregation based on strategy.
    let aggregatedResult: any;
    switch (aggregationConfig.strategy) {
        case AggregationStrategy.MERGE_OBJECTS:
            aggregatedResult = {};
            for (const output of successfulResults) {
                if (typeof output === 'object' && output !== null && !Array.isArray(output)) {
                    Object.assign(aggregatedResult, output);
                } else {
                    log_warn('MERGE_OBJECTS strategy encountered non-object output from a branch, skipping.', { output }, correlationId);
                }
            }
            if (!aggregationConfig.failOnBranchError && errorResults.length > 0) {
                aggregatedResult._branchErrors = errorResults;
            }
            break;
            
        case AggregationStrategy.SUM:
            aggregatedResult = successfulResults.reduce((sum, output) => {
                if (typeof output === 'number') {
                    return sum + output;
                }
                log_warn('SUM aggregation strategy encountered non-numeric output from a branch, skipping.', { output }, correlationId);
                return sum;
            }, 0);
            break;

        case AggregationStrategy.CUSTOM_MODULE:
            log_error('CUSTOM_MODULE aggregation strategy not yet implemented.', {}, correlationId);
            aggregatedResult = successfulResults;
            break;

        case AggregationStrategy.COLLECT_ARRAY:
        default:
            if (aggregationConfig.failOnBranchError) {
                aggregatedResult = successfulResults;
            } else {
                aggregatedResult = processedOutputs.map(processedOutput => {
                    if (processedOutput.error) {
                        return { branchId: processedOutput.branchId, error: processedOutput.error };
                    } else {
                        return processedOutput.output;
                    }
                });
            }
            break;
    }

    return { aggregatedData: aggregatedResult };
}

/**
 * Handles the aggregation of results from a parallel step.
 */
export const handleParallelAggregation = async (
    parallelAggregateInput: Exclude<ProcessorInput['parallelAggregateInput'], undefined>,
    runtimeState: FlowRuntimeState,
    flowDef: FlowDefinition,
    correlationId: string
): Promise<{ updatedRuntimeState: FlowRuntimeState; nextStepId: string | undefined; }> => {
    log_info('Performing parallel branch aggregation.', { originalStepInstanceId: parallelAggregateInput.originalStepInstanceId }, correlationId);
    
    const originalStepId = parallelAggregateInput.originalStepInstanceId;
    const stepInstanceConfig = flowDef.steps[originalStepId];
    if (!stepInstanceConfig) throw new Error(`Config for parent parallel step '${originalStepId}' not found.`);

    const aggregationConfig: AggregationConfig = parallelAggregateInput.aggregationConfig || {
        strategy: AggregationStrategy.COLLECT_ARRAY,
        failOnBranchError: true,
        maxConcurrency: 0,
    };

    const resolutionPromises = parallelAggregateInput.branchOutputs.map(async (branchResult) => {
        let finalizeOutput = branchResult.output;
        
        // Parse stringified JSON output from SFN RUN_JOB execution if necessary
        if (typeof finalizeOutput === 'string') {
            try {
                finalizeOutput = JSON.parse(finalizeOutput);
            } catch (e) {
                // Not JSON, leave it as is
            }
        }

        // 1. Handle offloaded branch context first
        // SFN explicitly sets this field if it evaluates currentContextData._s3_context_pointer as present
        if (finalizeOutput && typeof finalizeOutput === 'object' && finalizeOutput._branch_context_s3_pointer) {
            log_info(`Resolving S3 branch context pointer for branch '${branchResult.branchId}' before aggregation.`, {}, correlationId);
            try {
                const resolvedContext = await resolveS3Pointer(finalizeOutput._branch_context_s3_pointer, correlationId, true);
                finalizeOutput = resolvedContext.output || {};
            } catch (e: any) {
                log_error(`Failed to resolve S3 pointer for branch '${branchResult.branchId}'. Treating as branch error.`, { error: e.message }, correlationId);
                return { 
                    branchId: branchResult.branchId, 
                    error: { errorName: 'S3PointerResolutionError', errorMessage: e.message, isRetryable: false } 
                };
            }
        }

        // Handle Branch's FinalizeOutput object appropriately
        if (finalizeOutput && typeof finalizeOutput === 'object') {
            if (finalizeOutput.status === 'FAILED') {
                return {
                    branchId: branchResult.branchId,
                    error: finalizeOutput.errorInfo || { errorName: 'BranchFailed', errorMessage: 'Branch flow failed', isRetryable: false }
                };
            }

            if (finalizeOutput.finalContextDataS3Pointer) {
                log_info(`Resolving S3 final context pointer for branch '${branchResult.branchId}' before aggregation.`, {}, correlationId);
                try {
                    const resolvedData = await resolveS3Pointer(finalizeOutput.finalContextDataS3Pointer, correlationId, true);
                    finalizeOutput = resolvedData; 
                } catch (e: any) {
                    log_error(`Failed to resolve S3 pointer for branch '${branchResult.branchId}'. Treating as branch error.`, { error: e.message }, correlationId);
                    return { 
                        branchId: branchResult.branchId, 
                        error: { errorName: 'S3PointerResolutionError', errorMessage: e.message, isRetryable: false } 
                    };
                }
            } else if (finalizeOutput.finalContextData) {
                finalizeOutput = finalizeOutput.finalContextData;
            }
        }

        // Fallback for standard S3 output pointers if manually passed or correctly extracted
        if (finalizeOutput && isS3OutputPointerWrapper(finalizeOutput)) {
             log_info(`Resolving direct S3 output pointer for branch '${branchResult.branchId}' before aggregation.`, {}, correlationId);
             try {
                 const resolvedData = await resolveS3Pointer(finalizeOutput._s3_output_pointer, correlationId, true);
                 const { _s3_output_pointer, ...otherKeys } = finalizeOutput;
                 
                 let finalOutput = resolvedData;
                 if (Object.keys(otherKeys).length > 0) {
                     if (typeof resolvedData === 'object' && resolvedData !== null && !Array.isArray(resolvedData)) {
                         finalOutput = { ...resolvedData, ...otherKeys };
                     } else {
                         finalOutput = { content: resolvedData, ...otherKeys };
                     }
                 }
                 
                 return { ...branchResult, output: finalOutput };
             } catch (e: any) {
                 return { branchId: branchResult.branchId, error: { errorName: 'S3OutputPointerResolutionError', errorMessage: e.message, isRetryable: false } };
             }
        }

        return { ...branchResult, output: finalizeOutput };
    });

    const resolvedBranchOutputs = await Promise.all(resolutionPromises);

    const aggregationResult = aggregateBranchOutputs(
        resolvedBranchOutputs,
        aggregationConfig,
        runtimeState,
        correlationId
    );

    if (aggregationResult === null) {
        // Explicitly log the failure state of the aggregator
        if (runtimeState.enableExecutionLogs) {
            await executionLoggerClient.logStepExecution({
                flowExecutionId: correlationId,
                stepInstanceId: originalStepId,
                stepDefinitionId: stepInstanceConfig.stepDefinitionId || 'parallel_fork_manager',
                stepType: 'PARALLEL_AGGREGATOR',
                status: 'FAILED',
                startTime: runtimeState._internal?.currentStepStartTime || new Date().toISOString(),
                eventTimestamp: new Date().toISOString(),
                endTime: new Date().toISOString(),
                inputMappingResult: parallelAggregateInput.branchOutputs,
                errorInfo: runtimeState.errorInfo,
                outputMappingContext: runtimeState.currentContextData,
            });
        }
        return { updatedRuntimeState: runtimeState, nextStepId: undefined };
    }

    if (!EXECUTION_TRACES_BUCKET_NAME) {
        throw new PermanentStepError('ALLMA_EXECUTION_TRACES_BUCKET_NAME is not configured.');
    }

    const s3KeyPrefix = `step_outputs/${runtimeState.flowExecutionId}/${originalStepId}`;
    let finalOutputForMapping;

    if (stepInstanceConfig.forceS3Offload) {
        log_info(`'forceS3Offload' is true for step '${originalStepId}'. Offloading output regardless of size.`, {}, correlationId);
        finalOutputForMapping = await offloadIfLarge(aggregationResult, EXECUTION_TRACES_BUCKET_NAME, s3KeyPrefix, correlationId, 0);
    } else if (stepInstanceConfig.disableS3Offload) {
        log_info(`S3 offload is disabled for step '${originalStepId}'.`, {}, correlationId);
        finalOutputForMapping = aggregationResult;
    } else {
        // Automatically offload the result if it's large, preventing Step Functions DataLimitExceeded error
        finalOutputForMapping = await offloadIfLarge(aggregationResult, EXECUTION_TRACES_BUCKET_NAME, s3KeyPrefix, correlationId);
    }

    const effectiveOutputMappings = stepInstanceConfig.outputMappings === undefined
        ? { [`$.steps_output.${originalStepId}`]: '$' }
        : stepInstanceConfig.outputMappings;

    let outputMappingEvents: MappingEvent[] = [];
    if (Object.keys(effectiveOutputMappings).length > 0 && finalOutputForMapping) {
        outputMappingEvents = processStepOutput(effectiveOutputMappings, finalOutputForMapping, runtimeState.currentContextData, correlationId);
    }
    
    const { nextStepId, transitionDetails } = await resolveNextStep(stepInstanceConfig, runtimeState);

    const eventTimestamp = new Date().toISOString();
    if (runtimeState.enableExecutionLogs) {
        await executionLoggerClient.logStepExecution({
            flowExecutionId: correlationId,
            stepInstanceId: originalStepId,
            stepDefinitionId: stepInstanceConfig.stepDefinitionId || 'parallel_fork_manager',
            stepType: 'PARALLEL_AGGREGATOR',
            status: 'COMPLETED',
            startTime: runtimeState._internal?.currentStepStartTime || new Date().toISOString(),
            eventTimestamp: eventTimestamp,
            endTime: eventTimestamp,
            inputMappingResult: parallelAggregateInput.branchOutputs,
            outputData: finalOutputForMapping, 
            mappingEvents: outputMappingEvents, 
            outputMappingContext: runtimeState.currentContextData, // Ensured the final context is captured
            logDetails: {
                transitionEvaluation: transitionDetails,
            }
        });
    }

    return { updatedRuntimeState: runtimeState, nextStepId };
};

/**
 * Handles a parallel fork step by preparing branch payloads.
 */
export const handleParallelFork = async (
    stepInstanceConfig: StepInstance,
    runtimeState: FlowRuntimeState,
    correlationId: string
): Promise<ProcessorOutput | null> => {
    if (stepInstanceConfig.stepType !== StepType.PARALLEL_FORK_MANAGER) {
        throw new Error(`handleParallelFork called with incorrect step type: ${stepInstanceConfig.stepType}`);
    }

    log_info(`Step '${stepInstanceConfig.stepInstanceId}' is a parallel fork. Preparing branches.`, {}, correlationId);
    
    const { itemsPath, parallelBranches, aggregationConfig } = stepInstanceConfig;

    const branchTemplates = parallelBranches || [];
    if (branchTemplates.length === 0) {
         log_warn(`Step '${stepInstanceConfig.stepInstanceId}' is PARALLEL_FORK_MANAGER but has no parallelBranches defined.`, {}, correlationId);
         return null;
    }

    if (!itemsPath) {
        throw new Error(`Parallel fork step '${stepInstanceConfig.stepInstanceId}' must have an 'itemsPath' defined.`);
    }

    const userMaxConcurrency = aggregationConfig?.maxConcurrency;
    const safeLimit = Math.max(1, Math.floor(GLOBAL_MAX_CONCURRENCY * 0.8));
    let effectiveMaxConcurrency = safeLimit;
    if (userMaxConcurrency && userMaxConcurrency > 0) {
        effectiveMaxConcurrency = Math.min(userMaxConcurrency, safeLimit);
        if (effectiveMaxConcurrency !== userMaxConcurrency) {
            log_warn(`User requested maxConcurrency ${userMaxConcurrency} clamped to ${effectiveMaxConcurrency} (80% of global limit ${GLOBAL_MAX_CONCURRENCY}).`, {}, correlationId);
        }
    } else {
        log_info(`No specific maxConcurrency set in step. Defaulting to safe limit: ${safeLimit} (80% of global limit).`, {}, correlationId);
    }

    const finalAggregationConfig: AggregationConfig = {
        strategy: AggregationStrategy.COLLECT_ARRAY,
        failOnBranchError: true,
        ...aggregationConfig,
        maxConcurrency: effectiveMaxConcurrency,
    };
    
    const { value: itemsValue, events } = await getSmartValueByJsonPath(itemsPath, runtimeState.currentContextData, true, correlationId);

    let itemsToProcess: any[] = [];
    if (Array.isArray(itemsValue)) {
        itemsToProcess = itemsValue;
    } else if (itemsValue) {
        itemsToProcess = [itemsValue];
    }
    
    if (!EXECUTION_TRACES_BUCKET_NAME) {
        throw new PermanentStepError('ALLMA_EXECUTION_TRACES_BUCKET_NAME is not configured.');
    }
    
    const branchesToExecute: BranchExecutionPayload[] = [];
    for (const item of itemsToProcess) {
        const itemContext = { ...runtimeState.currentContextData, currentItem: item };
        
        for (const branchTemplate of branchTemplates) {
            if (branchTemplate.condition) {
                const { value: conditionMet } = await getSmartValueByJsonPath(branchTemplate.condition, itemContext, true, correlationId);
                if (!conditionMet) {
                    continue;
                }
            }
            
            // Offload the `currentItem` if it's large before creating the payload
            const offloadedItem = await offloadIfLarge(
                item,
                EXECUTION_TRACES_BUCKET_NAME,
                `branch_inputs/${correlationId}/${branchTemplate.branchId}-${uuidv4()}`,
                correlationId
            );

            // Only put currentItem in branchInput. SFN States.JsonMerge natively merges it dynamically over S3 pointers.
            const branchInputPayload = {
                currentItem: offloadedItem,
            };

            branchesToExecute.push({
                branchId: branchTemplate.branchId,
                branchDefinition: branchTemplate,
                branchInput: branchInputPayload, // Use the minimal context for the branch
                parentFlowExecutionId: correlationId,
                parentFlowDefinitionId: runtimeState.flowDefinitionId,
                parentFlowDefinitionVersion: runtimeState.flowDefinitionVersion,
                enableExecutionLogs: runtimeState.enableExecutionLogs,
            });
        }
    }
    
    // Check the size of the combined branches AND the runtimeState context to ensure
    // the Lambda's response payload won't exceed the 256KB Step Functions limit.
    const branchesSize = Buffer.byteLength(JSON.stringify(branchesToExecute), 'utf-8');
    const stateSize = Buffer.byteLength(JSON.stringify(runtimeState), 'utf-8');
    const totalOutputSize = branchesSize + stateSize;

    if (totalOutputSize > SFN_INLINE_PAYLOAD_LIMIT_BYTES) {
        log_warn(`Branch payload + state is large (${totalOutputSize} bytes). Automatically creating S3 manifest and switching to Distributed Map.`, {}, correlationId);
        
        const offloadedSharedContext = await offloadIfLarge(
            runtimeState.currentContextData,
            EXECUTION_TRACES_BUCKET_NAME,
            `shared_context/${correlationId}/${stepInstanceConfig.stepInstanceId}`,
            correlationId,
            0 // Force offload for state payload limits
        );
        
        if (offloadedSharedContext && isS3OutputPointerWrapper(offloadedSharedContext)) {
            runtimeState.currentContextData = { _s3_context_pointer: offloadedSharedContext._s3_output_pointer };
        }

        const manifestContent = JSON.stringify(branchesToExecute);
        const manifestKey = `manifests/${correlationId}/${stepInstanceConfig.stepInstanceId}-${new Date().toISOString()}.json`;

        await s3Client.send(new PutObjectCommand({
            Bucket: EXECUTION_TRACES_BUCKET_NAME,
            Key: manifestKey,
            Body: manifestContent,
            ContentType: 'application/json',
        }));

        log_info(`Auto-created manifest for Distributed Map with ${branchesToExecute.length} branch executions.`, { manifestKey }, correlationId);

        return {
            runtimeState,
            sfnAction: SfnActionType.PARALLEL_FORK_S3,
            s3ItemReader: {
                bucket: EXECUTION_TRACES_BUCKET_NAME,
                key: manifestKey,
                parallelBranches: branchTemplates,
                aggregationConfig: finalAggregationConfig,
                originalStepInstanceId: stepInstanceConfig.stepInstanceId,
            }
        };
    }

    const eventTimestamp = new Date().toISOString();
    
    if (branchesToExecute.length === 0) {
        log_info('No branches eligible for execution in parallel step.', {}, correlationId);
        if (runtimeState.enableExecutionLogs) {
            await executionLoggerClient.logStepExecution({
                flowExecutionId: correlationId,
                stepInstanceId: stepInstanceConfig.stepInstanceId,
                stepDefinitionId: stepInstanceConfig.stepDefinitionId || 'parallel_fork_manager',
                stepType: 'PARALLEL_FORK_MANAGER',
                status: 'COMPLETED',
                startTime: runtimeState._internal?.currentStepStartTime || eventTimestamp,
                eventTimestamp: eventTimestamp,
                endTime: eventTimestamp,
                durationMs: 0,
                inputMappingContext: runtimeState.currentContextData,
                mappingEvents: events,
                outputData: {
                    itemsPath: itemsPath,
                    resolvedItemCount: itemsToProcess.length,
                    executedBranchCount: 0,
                    message: "Fork completed but no branches were executed. This is usually because the 'itemsPath' resolved to an empty array or no items met their branch conditions.",
                    itemsPreview: itemsToProcess.slice(0, 5)
                },
            });
        }
        return null;
    }

    if (runtimeState.enableExecutionLogs) {
        await executionLoggerClient.logStepExecution({
            flowExecutionId: correlationId,
            stepInstanceId: stepInstanceConfig.stepInstanceId,
            stepDefinitionId: stepInstanceConfig.stepDefinitionId || 'parallel_fork_manager',
            stepType: 'PARALLEL_FORK_MANAGER',
            status: 'COMPLETED',
            startTime: runtimeState._internal?.currentStepStartTime || eventTimestamp,
            eventTimestamp: eventTimestamp,
            endTime: eventTimestamp,
            durationMs: 0,
            inputMappingContext: runtimeState.currentContextData, 
            mappingEvents: events,
            outputData: { 
                itemsPath: itemsPath,
                resolvedItemCount: itemsToProcess.length,
                executedBranchCount: branchesToExecute.length,
            },
        });
    }

    return {
        runtimeState,
        sfnAction: SfnActionType.PARALLEL_FORK,
        parallelForkInput: {
            branchesToExecute: branchesToExecute,
            aggregationConfig: finalAggregationConfig,
            originalStepInstanceId: stepInstanceConfig.stepInstanceId,
        }
    };
};