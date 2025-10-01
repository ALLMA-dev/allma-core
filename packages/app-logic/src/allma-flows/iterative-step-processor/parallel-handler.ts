import { JSONPath } from 'jsonpath-plus';
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
} from '@allma/core-types';
import {
    log_info, log_error, log_warn, log_debug, resolveS3Pointer,
} from '@allma/core-sdk';
import { getSmartValueByJsonPath, processStepOutput } from '../../allma-core/data-mapper.js';
import { executionLoggerClient } from '../../allma-core/execution-logger-client.js';
import { resolveNextStep } from './transition-resolver.js';

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
            // NOTE: If failOnBranchError is false, any errors from failing branches are currently ignored by this strategy.
            // This is because the result is a primitive number, and cannot have an `_branchErrors` property attached.
            // For detailed error handling, use COLLECT_ARRAY and perform the sum manually.
            break;

        case AggregationStrategy.CUSTOM_MODULE:
            log_error('CUSTOM_MODULE aggregation strategy not yet implemented.', {}, correlationId);
            // For now, fall back to collecting an array to avoid breaking the flow.
            aggregatedResult = successfulResults;
            break;

        case AggregationStrategy.COLLECT_ARRAY:
        default:
            if (aggregationConfig.failOnBranchError) {
                // Just the successful outputs (extracted data only)
                aggregatedResult = successfulResults;
            } else {
                // Include both successful outputs and error information
                // For successful branches, include just the output data
                // For failed branches, include error information
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
 * @returns The updated FlowRuntimeState after aggregation and output mapping.
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

    // Before aggregation, resolve any S3 pointers in the branch outputs.
    const resolutionPromises = parallelAggregateInput.branchOutputs.map(async (branchResult) => {
        if (branchResult.output && isS3OutputPointerWrapper(branchResult.output)) {
            log_info(`Resolving S3 output pointer for branch '${branchResult.branchId}' before aggregation.`, { pointer: branchResult.output._s3_output_pointer }, correlationId);
            try {
                const resolvedData = await resolveS3Pointer(branchResult.output._s3_output_pointer, correlationId);
                // Return a new object with the resolved data.
                return { ...branchResult, output: resolvedData };
            } catch (e: any) {
                log_error(`Failed to resolve S3 output pointer for branch '${branchResult.branchId}'. Treating as branch error.`, { error: e.message }, correlationId);
                // If resolution fails, convert it into a branch error so it's handled correctly by aggregation logic.
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
        // If it's not a pointer, return it as is.
        return branchResult;
    });

    const resolvedBranchOutputs = await Promise.all(resolutionPromises);

    const aggregationResult = aggregateBranchOutputs(
        resolvedBranchOutputs,
        aggregationConfig,
        runtimeState,
        correlationId
    );

    // aggregationResult is null if a branch failed and failOnBranchError is true.
    // In that case, runtimeState is already updated with FAILED status.
    if (aggregationResult === null) {
        return { updatedRuntimeState: runtimeState, nextStepId: undefined };
    }

    // Apply output mappings *before* resolving the next step, so conditional transitions can see the result.
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
            inputMappingResult: parallelAggregateInput.branchOutputs, // Input to aggregation is the array of branch results
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
 * @returns A ProcessorOutput object for the SFN `PARALLEL_FORK` or `PARALLEL_FORK_S3` action, or null if no branches are executed.
 */
export const handleParallelFork = async (
    stepInstanceConfig: StepInstance,
    runtimeState: FlowRuntimeState,
    correlationId: string
): Promise<ProcessorOutput | null> => {
    log_info(`Step '${stepInstanceConfig.stepInstanceId}' is a parallel fork. Preparing branches.`, {}, correlationId);
    
    const branchTemplates = stepInstanceConfig.parallelBranches || [];
    if (branchTemplates.length === 0) {
         log_warn(`Step '${stepInstanceConfig.stepInstanceId}' is PARALLEL_FORK_MANAGER but has no parallelBranches defined.`, {}, correlationId);
         return null;
    }

    const itemsPath = (stepInstanceConfig as any).itemsPath;
    if (!itemsPath) {
        throw new Error(`Parallel fork step '${stepInstanceConfig.stepInstanceId}' must have an 'itemsPath' defined.`);
    }

    const maxConcurrency = stepInstanceConfig.aggregationConfig?.maxConcurrency ?? 0;
    const finalAggregationConfig: AggregationConfig = {
        strategy: AggregationStrategy.COLLECT_ARRAY,
        failOnBranchError: true,
        ...stepInstanceConfig.aggregationConfig,
        maxConcurrency,
    };
    
    // FIX: Perform a simple, non-hydrating lookup first to check for an S3 pointer wrapper.
    const itemsValueWrapper = JSONPath({ path: itemsPath, json: runtimeState.currentContextData, wrap: false });
    
    if (isS3OutputPointerWrapper(itemsValueWrapper)) {
        const s3Pointer = itemsValueWrapper._s3_output_pointer;
        log_info(`Initiating S3-powered distributed map state`, { s3Pointer, itemsPath }, correlationId);
        
        if (runtimeState.enableExecutionLogs) {
            await executionLoggerClient.logStepExecution({
                flowExecutionId: correlationId,
                stepInstanceId: stepInstanceConfig.stepInstanceId,
                stepDefinitionId: stepInstanceConfig.stepDefinitionId || 'parallel_fork_manager',
                stepType: 'PARALLEL_FORK_MANAGER_S3',
                status: 'COMPLETED',
                startTime: runtimeState._internal?.currentStepStartTime || new Date().toISOString(),
                eventTimestamp: new Date().toISOString(),
                endTime: new Date().toISOString(),
                inputMappingContext: runtimeState.currentContextData,
                outputData: { s3Manifest: s3Pointer },
            });
        }

        return {
            runtimeState,
            sfnAction: SfnActionType.PARALLEL_FORK_S3,
            s3ItemReader: {
                bucket: s3Pointer.bucket,
                key: s3Pointer.key,
                parallelBranches: branchTemplates,
                aggregationConfig: finalAggregationConfig,
                originalStepInstanceId: stepInstanceConfig.stepInstanceId,
            }
        };
    }

    // If it's not a pointer wrapper, proceed with the smart (hydrating) getter for in-memory iteration.
    const { value: itemsValue, events } = await getSmartValueByJsonPath(itemsPath, runtimeState.currentContextData, correlationId);

    let itemsToProcess: any[] = [];
    if (Array.isArray(itemsValue)) {
        itemsToProcess = itemsValue;
    } else if (itemsValue) {
        itemsToProcess = [itemsValue];
    }

    const branchesToExecute: BranchExecutionPayload[] = [];

    for (const item of itemsToProcess) {
        const itemContext = { ...runtimeState.currentContextData, currentItem: item };
        
        for (const branchTemplate of branchTemplates) {
            if (branchTemplate.condition) {
                const conditionMet = !!JSONPath({ path: branchTemplate.condition, json: itemContext, wrap: false });
                if (!conditionMet) {
                    log_info(`Skipping branch '${branchTemplate.branchId}' for item due to condition not met.`, { condition: branchTemplate.condition }, correlationId);
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
                durationMs: runtimeState._internal?.currentStepStartTime ? (new Date(eventTimestamp).getTime() - new Date(runtimeState._internal.currentStepStartTime).getTime()) : 0,
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
            durationMs: runtimeState._internal?.currentStepStartTime ? (new Date(eventTimestamp).getTime() - new Date(eventTimestamp).getTime()) : 0,
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