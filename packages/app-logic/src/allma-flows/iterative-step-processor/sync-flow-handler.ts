import { v4 as uuidv4 } from 'uuid';
import {
    FlowRuntimeState,
    StepInstance,
    SfnActionType,
    ProcessorOutput,
    StartFlowExecutionInput,
    ProcessorInput,
    FlowDefinition,
    S3Pointer,
    isS3OutputPointerWrapper,
    AllmaError,
    ENV_VAR_NAMES,
} from '@allma/core-types';
import { log_info, log_error, log_warn, log_debug, resolveS3Pointer, offloadIfLarge } from '@allma/core-sdk';
import { prepareStepInput, processStepOutput, setByDotNotation } from '../../allma-core/data-mapper.js';
import { TemplateService } from '../../allma-core/template-service.js';
import { renderNestedTemplates } from '../../allma-core/utils/template-renderer.js';
import { executionLoggerClient } from '../../allma-core/execution-logger-client.js';

const EXECUTION_TRACES_BUCKET_NAME = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME]!;

/**
 * Prepares the input for a synchronous sub-flow execution and signals the orchestrator.
 * @returns A `ProcessorOutput` object instructing the SFN to start a sync execution.
 */
export async function handleSyncFlowStart(
    stepInstanceConfig: StepInstance,
    runtimeState: FlowRuntimeState,
    correlationId: string
): Promise<ProcessorOutput> {
    const templateService = TemplateService.getInstance();
    const templateContext = { ...runtimeState, ...runtimeState.currentContextData };

    // Render configuration specific to this step
    const renderedFlowDefId = await templateService.render((stepInstanceConfig as any).flowDefinitionId, templateContext, correlationId);
    const renderedFlowVersion = await templateService.render((stepInstanceConfig as any).flowVersion || 'LATEST_PUBLISHED', templateContext, correlationId);

    // Prepare initial context for the sub-flow using inputMappings
    const { preparedInput } = await prepareStepInput(
        stepInstanceConfig.inputMappings || {},
        templateContext,
        true, // Always hydrate pointers for sub-flows
        correlationId
    );

    // Apply literals to the prepared input. This matches standard async step behavior.
    if (stepInstanceConfig.literals) {
        for (const [targetPath, literalValue] of Object.entries(stepInstanceConfig.literals)) {
            log_debug(`Applying literal value in sync subflow start`, { targetPath, valuePreview: JSON.stringify(literalValue).substring(0, 200) }, correlationId);
            setByDotNotation(preparedInput, targetPath, literalValue);
        }
    }

    const rawCustomConfig = (stepInstanceConfig as any).customConfig || {};
    const renderedCustomConfig = await renderNestedTemplates(rawCustomConfig, templateContext, correlationId) || {};

    const { initialContextData, ...restOfStepInput } = preparedInput;

    // --- SFN Payload Limit Protection for Sub-flows ---
    let finalInitialContextData = initialContextData || {};
    
    if (EXECUTION_TRACES_BUCKET_NAME) {
        const offloadedSyncInput = await offloadIfLarge(
            finalInitialContextData,
            EXECUTION_TRACES_BUCKET_NAME,
            `sync_flow_input/${correlationId}/${stepInstanceConfig.stepInstanceId}`,
            correlationId,
            200 * 1024 // Offload inputs over 200KB seamlessly
        );

        if (offloadedSyncInput && isS3OutputPointerWrapper(offloadedSyncInput)) {
            log_info(`Synchronous sub-flow initialContextData offloaded to S3.`, {}, correlationId);
            finalInitialContextData = { _s3_context_pointer: offloadedSyncInput._s3_output_pointer };
        } else {
            finalInitialContextData = offloadedSyncInput as Record<string, any>;
        }
    }
    // --- END Limit Protection ---

    // Construct the standard input for starting a flow
    const finalStartInput: StartFlowExecutionInput = {
        ...renderedCustomConfig,
        ...restOfStepInput,
        flowDefinitionId: renderedFlowDefId,
        flowVersion: renderedFlowVersion,
        initialContextData: finalInitialContextData,
        flowExecutionId: uuidv4(), // The sub-flow gets its own unique ID
        triggerSource: `SyncSubFlow from ${runtimeState.flowExecutionId}:${runtimeState.currentStepInstanceId}`,
        enableExecutionLogs: runtimeState.enableExecutionLogs,
    };

    return {
        runtimeState: runtimeState, // Return the state *before* the sub-flow runs
        sfnAction: SfnActionType.START_SYNC_FLOW_EXECUTION,
        syncFlowExecutionInput: finalStartInput,
    };
}

/**
 * Processes the result from a completed synchronous sub-flow execution.
 * @returns The updated parent flow's runtime state.
 */
export async function handleSyncFlowResult(
    event: ProcessorInput,
    runtimeState: FlowRuntimeState,
    flowDef: FlowDefinition,
    correlationId: string
): Promise<FlowRuntimeState> {
    const { syncFlowResult } = event;
    const currentStepId = runtimeState.currentStepInstanceId!;
    const stepInstanceConfig = flowDef.steps[currentStepId];

    if (!syncFlowResult || !syncFlowResult.Output) {
        log_error('Sync flow execution result is missing or has no Output.', { syncFlowResult }, correlationId);
        throw new Error('Synchronous sub-flow execution failed to return a valid output.');
    }

    let finalOutputFromSubFlow: { 
        status: string; 
        finalContextData?: Record<string, any>;
        finalContextDataS3Pointer?: S3Pointer;
        errorInfo?: AllmaError;
    };

    try {
        finalOutputFromSubFlow = typeof syncFlowResult.Output === 'string'
            ? JSON.parse(syncFlowResult.Output)
            : syncFlowResult.Output;
        log_info('Successfully parsed output from synchronous sub-flow.', {}, correlationId);
    } catch (e: any) {
        log_error('Failed to parse JSON output from synchronous sub-flow.', { output: syncFlowResult.Output, error: e.message }, correlationId);
        throw new Error('Failed to parse output from synchronous sub-flow.');
    }

    if (finalOutputFromSubFlow.status === 'FAILED') {
        log_error('Synchronous sub-flow failed.', { errorInfo: finalOutputFromSubFlow.errorInfo }, correlationId);
        throw new Error(`Synchronous sub-flow failed: ${finalOutputFromSubFlow.errorInfo?.errorMessage || 'Unknown error'}`);
    }

    let subFlowContext: Record<string, any>;
    if (finalOutputFromSubFlow.finalContextDataS3Pointer) {
        log_info('Sub-flow output is an S3 pointer. Resolving context data...', {}, correlationId);
        subFlowContext = await resolveS3Pointer(finalOutputFromSubFlow.finalContextDataS3Pointer, correlationId, true);
    } else if (finalOutputFromSubFlow.finalContextData) {
        subFlowContext = finalOutputFromSubFlow.finalContextData;
    } else {
        log_warn('Sub-flow completed but returned no context data or pointer.', {}, correlationId);
        subFlowContext = {};
    }

    // Use default mapping if none is provided
    const effectiveOutputMappings =
        stepInstanceConfig.outputMappings === undefined
            ? { [`$.steps_output.${currentStepId}`]: '$' }
            : stepInstanceConfig.outputMappings;

    // Merge the sub-flow's context into the parent's context
    const outputMappingEvents = await processStepOutput(effectiveOutputMappings, subFlowContext, runtimeState.currentContextData, correlationId);

    // Log the completion of the synchronous step itself
    const stepEndTime = new Date().toISOString();
    if (runtimeState.enableExecutionLogs) {
        await executionLoggerClient.logStepExecution({
            flowExecutionId: correlationId,
            branchId: runtimeState.branchId ?? undefined,
            branchExecutionId: runtimeState.branchExecutionId ?? undefined,
            stepInstanceId: currentStepId,
            stepDefinitionId: stepInstanceConfig.stepDefinitionId ?? undefined,
            stepType: stepInstanceConfig.stepType,
            status: 'COMPLETED',
            startTime: runtimeState._internal?.currentStepStartTime || stepEndTime,
            eventTimestamp: stepEndTime,
            endTime: stepEndTime,
            durationMs: runtimeState._internal?.currentStepStartTime ? new Date(stepEndTime).getTime() - new Date(runtimeState._internal.currentStepStartTime).getTime() : 0,
            attemptNumber: runtimeState.stepRetryAttempts?.[currentStepId] || 1,
            outputData: subFlowContext, // Log the actual resolved context
            mappingEvents: outputMappingEvents,
            outputMappingContext: runtimeState.currentContextData,
            stepInstanceConfig: stepInstanceConfig,
        });
    }

    return runtimeState;
}