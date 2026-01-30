
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
} from '@allma/core-types';
import {
    log_info, log_error, log_warn, log_debug, resolveS3Pointer,
} from '@allma/core-sdk';
import { processStepOutput, getSmartValueByJsonPath } from '../../allma-core/data-mapper.js';
import { executionLoggerClient } from '../../allma-core/execution-logger-client.js';
import { resolveNextStep } from './transition-resolver.js';

const s3Client = new S3Client({});
const EXECUTION_TRACES_BUCKET_NAME = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME];
const SFN_INLINE_PAYLOAD_LIMIT_BYTES = 250 * 1024; // 250KB, slightly less than the 256KB hard limit.

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

    // If no dataPath is specified, log a warning about the potential for data growth.
    if (!aggregationConfig.dataPath) {
        log_warn(`No 'dataPath' provided in aggregationConfig. The entire branch output context will be aggregated. This can lead to excessive data growth in loops. It is recommended to specify a dataPath (e.g., '$.output').`, { stepInstanceId: runtimeState.currentStepInstanceId }, correlationId);
    }
    
    // Step 1: Process all branch outputs to extract data or preserve errors.
    const processedOutputs = branchOutputs.map(branchResult => {
        if (branchResult.error) {
            return { branchId: branchResult.branchId, error: branchResult.error };
        }
        
        const dataToExtractFrom = branchResult.output;
        
        // If no dataPath, the output is the full branch context.
        if (!aggregationConfig.dataPath) {
            return { branchId: branchResult.branchId, output: dataToExtractFrom };
        }

        // With dataPath, extract the specific value.
        try {
            const extractedValue = JSONPath({ path: aggregationConfig.dataPath, json: dataToExtractFrom, wrap: false });
            return { branchId: branchResult.branchId, output: extractedValue };
        } catch (e: any) {
            log_warn(`Failed to apply dataPath '${aggregationConfig.dataPath}' to a branch output.`, { branchId: branchResult.branchId, error: e.message }, correlationId);
            // Treat this as a branch error if we're failing on errors
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
        if (branchResult.output && isS3OutputPointerWrapper(branchResult.output)) {
            log_info(`Resolving S3 output pointer for branch '${branchResult.branchId}' before aggregation.`, { pointer: branchResult.output._s3_output_pointer }, correlationId);
            try {
                const resolvedData = await resolveS3Pointer(branchResult.output._s3_output_pointer, correlationId);
                return { ...branchResult, output: resolvedData };
            } catch (e: any) {
                log_error(`Failed to resolve S3 output pointer for branch '${branchResult.branchId}'. Treating as branch error.`, { error: e.message }, correlationId);
                return { 
                    ...branchResult, 
                    output: undefined, 
                    error: { 
                        errorName: 'S3OutputPointerResolutionError', 
                        errorMessage: e.message,
                        isRetryable: false
                    } 
                };
            }
        }
        return branchResult;
    });

    const resolvedBranchOutputs = await Promise.all(resolutionPromises);

    const aggregationResult = aggregateBranchOutputs(
        resolvedBranchOutputs,
        aggregationConfig,
        runtimeState,
        correlationId
    );

    if (aggregationResult === null) {
        return { updatedRuntimeState: runtimeState, nextStepId: undefined };
    }

    if (stepInstanceConfig.outputMappings) {
        processStepOutput(stepInstanceConfig.outputMappings, aggregationResult, runtimeState.currentContextData, correlationId);
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
            outputData: aggregationResult,
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
    
    // ALWAYS resolve the itemsPath first, hydrating from S3 if necessary.
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
    
    // ALWAYS construct the full branch payloads first.
    const branchesToExecute: BranchExecutionPayload[] = [];
    for (const item of itemsToProcess) {
        const itemContext = { ...runtimeState.currentContextData, currentItem: item };
        
        for (const branchTemplate of branchTemplates) {
            if (branchTemplate.condition) {
                const { value: conditionMet } = await getSmartValueByJsonPath(branchTemplate.condition, itemContext, true, correlationId);
                if (!conditionMet) {
                    log_debug(`Skipping branch '${branchTemplate.branchId}' for item due to condition not met.`, { condition: branchTemplate.condition }, correlationId);
                    continue;
                }
            }
            
            branchesToExecute.push({
                branchId: branchTemplate.branchId,
                branchDefinition: branchTemplate,
                branchInput: itemContext,
                parentFlowExecutionId: correlationId,
                parentFlowDefinitionId: runtimeState.flowDefinitionId,
                parentFlowDefinitionVersion: runtimeState.flowDefinitionVersion,
                enableExecutionLogs: runtimeState.enableExecutionLogs,
            });
        }
    }
    
    // ONLY NOW, check the size and decide whether to offload.
    const totalSize = Buffer.byteLength(JSON.stringify(branchesToExecute), 'utf-8');

    if (totalSize > SFN_INLINE_PAYLOAD_LIMIT_BYTES) {
        log_warn(`Branch payload for parallel step is large (${totalSize} bytes). Automatically creating S3 manifest and switching to Distributed Map.`, {}, correlationId);
        
        const manifestContent = branchesToExecute.map(payload => JSON.stringify(payload)).join('\n');
        
        const manifestKey = `manifests/${correlationId}/${stepInstanceConfig.stepInstanceId}-${new Date().toISOString()}.jsonl`;
        await s3Client.send(new PutObjectCommand({
            Bucket: EXECUTION_TRACES_BUCKET_NAME,
            Key: manifestKey,
            Body: manifestContent,
            ContentType: 'application/x-jsonlines',
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
            branchesToExecute,
            aggregationConfig: finalAggregationConfig,
            originalStepInstanceId: stepInstanceConfig.stepInstanceId,
        }
    };
};