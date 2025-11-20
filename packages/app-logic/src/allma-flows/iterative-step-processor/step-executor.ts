import {
    FlowRuntimeState,
    StepInstance,
    StepDefinition,
    RetryableStepError,
    ContentBasedRetryableError,
    ENV_VAR_NAMES,
    MappingEvent,
    AllmaError,
    StepType,
    DelayOptions,
} from '@allma/core-types';
import {
    log_info,
    log_debug,
    offloadIfLarge,
    log_warn,
    log_error,
    hydrateInputFromS3Pointers,
} from '@allma/core-sdk';
import { JSONPath } from 'jsonpath-plus'; // JSONPath for the validation
import { getStepHandler } from '../../allma-core/step-handlers/handler-registry.js';
import { hasInternalModuleHandler } from '../../allma-core/module-registry.js';
import { invokeExternalStep } from './external-step-invoker.js';
import { validateLlmOutput } from '../../allma-core/security-validator.js';
import { processStepOutput, setByDotNotation } from '../../allma-core/data-mapper.js';
import { executionLoggerClient } from '../../allma-core/execution-logger-client.js';
import { renderNestedTemplates } from '../../allma-core/utils/template-renderer.js';
import { resolveNextStep } from './transition-resolver.js';

const EXECUTION_TRACES_BUCKET_NAME = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME]!;
// The actual SFN limit is 256KB, so let's warn above a safe threshold like 240KB.
const SFN_PAYLOAD_WARN_THRESHOLD_BYTES = 240 * 1024;

/**
 * Executes a configured delay.
 * @param delayConfig The delay configuration from the step instance.
 * @param correlationId For logging.
 */
const executeDelay = async (delayConfig: DelayOptions | undefined, correlationId: string): Promise<void> => {
    if (!delayConfig) {
        return;
    }

    let duration: number;

    if (delayConfig.milliseconds) {
        duration = delayConfig.milliseconds;
    } else if (delayConfig.delayFrom && delayConfig.delayTo) {
        const min = delayConfig.delayFrom;
        const max = delayConfig.delayTo;
        duration = Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
        // This case should be prevented by the Zod schema validation, but as a safeguard:
        log_warn('Invalid delay configuration, skipping delay.', { delayConfig }, correlationId);
        return;
    }

    log_info(`Applying step delay for ${duration}ms (position: ${delayConfig.position}).`, {}, correlationId);
    await new Promise(resolve => setTimeout(resolve, duration));
};

/**
 * Encapsulates the logic for executing a single, standard (non-parallel, non-async) step.
 * @returns An object containing the updated runtime state.
 */
export const executeStandardStep = async (
    stepInstanceConfig: StepInstance,
    stepDef: StepDefinition,
    runtimeState: FlowRuntimeState,
    stepInput: Record<string, any>, // Input is now prepared by the caller
    inputMappingEvents: MappingEvent[], // Input mapping events are passed in
    stepStartTime: string,
    correlationId: string,
): Promise<{ updatedRuntimeState: FlowRuntimeState, nextStepId: string | undefined }> => {

    // Capture the "before" context for logging. Use structuredClone for a deep copy.
    const inputContext = structuredClone(runtimeState.currentContextData);

    // Execute "before" delay if configured
    if (stepInstanceConfig.delay?.position === 'before') {
        await executeDelay(stepInstanceConfig.delay, correlationId);
    }

    runtimeState.stepRetryAttempts = runtimeState.stepRetryAttempts || {};
    const currentStepInstanceId = stepInstanceConfig.stepInstanceId;
    const currentAttempt = (runtimeState.stepRetryAttempts[currentStepInstanceId] || 0) + 1;
    runtimeState.stepRetryAttempts[currentStepInstanceId] = currentAttempt;

    log_debug(`Preparing input for step '${currentStepInstanceId}' of type '${stepDef.stepType}' with ${Object.keys(stepInput).length} dynamic mappings.`, { stepInput: JSON.stringify(stepInput).substring(0, 1000) }, correlationId);

    let hydratedStepInput: Record<string, any>;

    // MODIFIED LOGIC:
    // Hydrate S3 pointers unless it's a custom lambda that has NOT opted in to hydration.
    if (stepInstanceConfig.stepType !== StepType.CUSTOM_LAMBDA_INVOKE || (stepInstanceConfig.customConfig as any)?.hydrateInputFromS3 === true) {
        log_info(`Hydrating step input for step '${currentStepInstanceId}' from any S3 pointers.`, {}, correlationId);
        hydratedStepInput = await hydrateInputFromS3Pointers(stepInput, correlationId);
    } else {
        log_info(`Skipping input hydration for CUSTOM_LAMBDA_INVOKE step '${currentStepInstanceId}' (hydrateInputFromS3 is not true). Pointers will be passed directly.`, {}, correlationId);
        hydratedStepInput = stepInput;
    }

    log_debug(`Prepared step input for '${currentStepInstanceId}':`, { hydratedStepInput }, correlationId);

    const finalStepInput = { ...hydratedStepInput };

    if (stepInstanceConfig.literals) {
        for (const [targetPath, literalValue] of Object.entries(stepInstanceConfig.literals)) {
            log_debug(`Applying literal value`, { targetPath, valuePreview: JSON.stringify(literalValue).substring(0, 200) }, correlationId);
            // The key of a literal is a dot-notation path for the target object (finalStepInput).
            setByDotNotation(finalStepInput, targetPath, literalValue);
        }
    }

    // --- CENTRALIZED TEMPLATE RENDERING ---
    // The step definition we have is the final, merged definition.
    // We will render its customConfig before passing it to any handler.
    const customConfig = (stepDef as any).customConfig || {};
    // The context for rendering includes all flow data AND the dynamic step input.
    // The results of input mappings (finalStepInput) are spread into the top-level context.
    // This makes variables like 'runId' directly available as `{{runId}}` in templates.
    const templateContext = { ...runtimeState.currentContextData, ...runtimeState, ...finalStepInput };
    
    const renderedCustomConfig = await renderNestedTemplates(customConfig, templateContext, correlationId);

    // Create a new step definition object for this execution with the rendered config.
    // This ensures we don't mutate the original, cached definition.
    const finalStepDefForHandler: StepDefinition = {
        ...stepDef,
        customConfig: renderedCustomConfig,
    };
    // --- END CENTRALIZED RENDERING ---

    const baseRecord = {
        flowExecutionId: correlationId,
        branchId: runtimeState.branchId,
        branchExecutionId: runtimeState.branchExecutionId,
        stepInstanceId: currentStepInstanceId,
        stepDefinitionId: stepDef.id,
        stepType: stepDef.stepType,
        startTime: stepStartTime,
        attemptNumber: currentAttempt,
    };

    // Log START with input mapping events and the full context from which mappings were derived.
    if (runtimeState.enableExecutionLogs) {
        await executionLoggerClient.logStepExecution({
            ...baseRecord,
            status: 'STARTED',
            eventTimestamp: stepStartTime,
            inputMappingResult: finalStepInput,
            mappingEvents: inputMappingEvents,
            inputMappingContext: inputContext, // Log the captured "before" context
            templateContextMappingContext: templateContext,
            stepInstanceConfig: stepInstanceConfig, // Log the exact config used
        });
    }

    try {
        // 4. Execute Step via internal handler or external invoker.
        let stepHandlerResult;

        if (finalStepDefForHandler.moduleIdentifier && typeof finalStepDefForHandler.moduleIdentifier === 'string' && !hasInternalModuleHandler(finalStepDefForHandler.moduleIdentifier)) {
            stepHandlerResult = await invokeExternalStep(finalStepDefForHandler.moduleIdentifier, stepInstanceConfig, finalStepInput, runtimeState);
        } else {
            log_info(`Invoking internal step handler for step type: ${finalStepDefForHandler.stepType}`, {}, correlationId);
            const handler = getStepHandler(finalStepDefForHandler.stepType);
            stepHandlerResult = await handler(finalStepDefForHandler, finalStepInput, runtimeState);
        }

        if (runtimeState._internal) {
            runtimeState._internal.currentStepHandlerResult = stepHandlerResult;
        }

        // Execute "after" delay if configured (this is the default)
        if (stepInstanceConfig.delay?.position !== 'before') {
            await executeDelay(stepInstanceConfig.delay, correlationId);
        }

        // --- INTEGRATED SECURITY VALIDATION ---
        // Check if this is an LLM step AND it has a security config.
        if (stepInstanceConfig.stepType === StepType.LLM_INVOCATION && stepInstanceConfig.securityValidatorConfig) {
            const outputDataForValidation = stepHandlerResult.outputData || {};
            let textToValidate: string;

            if (typeof outputDataForValidation.finalAnswerText === 'string') {
                textToValidate = outputDataForValidation.finalAnswerText;
            } else if (typeof outputDataForValidation.llm_response === 'string') {
                textToValidate = outputDataForValidation.llm_response;
            } else {
                log_debug('Stringifying entire LLM output for security validation.', { outputType: typeof outputDataForValidation }, correlationId);
                textToValidate = JSON.stringify(outputDataForValidation);
            }

            if (textToValidate) {
                await validateLlmOutput(
                    textToValidate,
                    stepHandlerResult.outputData?._meta?.llmPrompt || '', // Pass the prompt from the _meta block
                    stepInstanceConfig.securityValidatorConfig,
                    correlationId
                );
            }
        }
        // --- END: INTEGRATED SECURITY VALIDATION ---

        // --- GENERIC OUTPUT VALIDATION LOGIC ---
        const outputDataForValidation = stepHandlerResult.outputData;
        if ((stepInstanceConfig as any).outputValidation?.requiredFields && outputDataForValidation) {
            log_info('Performing generic output validation.', { requiredFields: (stepInstanceConfig as any).outputValidation.requiredFields }, correlationId);
            for (const fieldPath of (stepInstanceConfig as any).outputValidation.requiredFields) {
                const matches = JSONPath({ path: fieldPath, json: outputDataForValidation, wrap: true });
                if (matches.length === 0 || matches[0] === null || matches[0] === undefined) {
                    const errorMessage = `Required output field validation failed. Path '${fieldPath}' was missing or null/undefined in the step output.`;
                    log_warn(errorMessage, { output: outputDataForValidation }, correlationId);
                    throw new ContentBasedRetryableError(errorMessage);
                }
            }
            log_info('Generic output validation passed successfully.', {}, correlationId);
        }
        // --- END: GENERIC OUTPUT VALIDATION LOGIC ---

        const stepEndTime = new Date().toISOString();
        const stepDurationMs = new Date(stepEndTime).getTime() - new Date(stepStartTime).getTime();

        log_info(`Step '${currentStepInstanceId}' of type '${stepDef.stepType}' executed successfully.`, { durationMs: stepDurationMs }, correlationId);

        // Deconstruct the handler result for mapping and logging.
        const outputDataForMapping = stepHandlerResult.outputData || {};
        const logDetailsForRecord = outputDataForMapping._meta || {};
        const templateMappingEvents = logDetailsForRecord?._templateContextMappingEvents;

        // This is a special internal key, remove it before further processing.
        if (outputDataForMapping._meta) {
            delete outputDataForMapping._meta;
        }

        // Offload large outputs to S3 before merging into runtime state to protect SFN state limit.
        const s3KeyPrefix = `step_outputs/${runtimeState.flowExecutionId}/${stepInstanceConfig.stepInstanceId}`;

        // Check the new flag before attempting to offload.
        let finalOutputForMapping;
        if (stepInstanceConfig.disableS3Offload) {
            log_info(`S3 offload is disabled for step '${currentStepInstanceId}'.`, {}, correlationId);
            finalOutputForMapping = outputDataForMapping;

            // Warn if the payload is dangerously large, as it might break the SFN execution.
            if (outputDataForMapping) {
                try {
                    const payloadString = JSON.stringify(outputDataForMapping);
                    const payloadSize = Buffer.byteLength(payloadString, 'utf-8');
                    if (payloadSize > SFN_PAYLOAD_WARN_THRESHOLD_BYTES) {
                        log_warn(`S3 offload is disabled, but payload size (${payloadSize} bytes) is near or exceeds the SFN state limit of 256KB. This may cause the flow to fail.`, {}, correlationId);
                    }
                } catch (e) { /* ignore potential stringify errors on huge objects */ }
            }
        } else {
            finalOutputForMapping = await offloadIfLarge(
                outputDataForMapping,
                EXECUTION_TRACES_BUCKET_NAME,
                s3KeyPrefix,
                correlationId
            );
        }

        // Apply output mappings. Use a default mapping if none is provided.
        const effectiveOutputMappings = stepInstanceConfig.outputMappings === undefined
            ? { [`$.steps_output.${currentStepInstanceId}`]: '$' }
            : stepInstanceConfig.outputMappings;

        let outputMappingEvents: MappingEvent[] = [];
        if (Object.keys(effectiveOutputMappings).length > 0 && finalOutputForMapping) {
            outputMappingEvents = processStepOutput(effectiveOutputMappings, finalOutputForMapping, runtimeState.currentContextData, correlationId);
            log_debug('Context data after output mapping', { contextKeys: Object.keys(runtimeState.currentContextData) }, correlationId);
        }

        const { nextStepId, transitionDetails } = await resolveNextStep(stepInstanceConfig, runtimeState);

        const allMappingEvents: MappingEvent[] = [...inputMappingEvents, ...outputMappingEvents];
        if (templateMappingEvents) {
            allMappingEvents.push(...templateMappingEvents);
        }

        logDetailsForRecord.transitionEvaluation = transitionDetails;

        // Log successful completion, if enabled
        if (runtimeState.enableExecutionLogs) {
            const s3Pointer = await executionLoggerClient.logStepExecution({
                ...baseRecord,
                status: 'COMPLETED',
                eventTimestamp: stepEndTime, // Use step end time as the event time for COMPLETED
                endTime: stepEndTime,
                durationMs: stepDurationMs,
                logDetails: logDetailsForRecord,
                inputMappingResult: finalStepInput,
                outputData: outputDataForMapping, // Pass the raw output data
                mappingEvents: allMappingEvents,
                inputMappingContext: inputContext, // Log the "before" context again for a self-contained record
                outputMappingContext: runtimeState.currentContextData,
                stepInstanceConfig: stepInstanceConfig, // Log the exact config used
            });

            // If in sandbox mode, capture the S3 pointer to the full debug log.
            if (runtimeState._internal?.sandboxMode && s3Pointer) {
                log_debug('Sandbox mode detected. Captured full debug log S3 pointer.', {}, correlationId);
                runtimeState._internal.sandboxDebugLogS3Pointer = s3Pointer;
            }
        }

        return { updatedRuntimeState: runtimeState, nextStepId };

    } catch (error: any) {
        const stepEndTime = new Date().toISOString();
        const stepDurationMs = new Date(stepEndTime).getTime() - new Date(stepStartTime).getTime();

        const isRetryableBySfn = error instanceof RetryableStepError || error instanceof ContentBasedRetryableError;

        if (error instanceof ContentBasedRetryableError && stepInstanceConfig.onError?.retryOnContentError) {
            const retryConfig = stepInstanceConfig.onError.retryOnContentError;
            const attemptsMade = runtimeState.stepRetryAttempts[currentStepInstanceId] || 1;

            if (attemptsMade < retryConfig.count) {
                log_warn(`Step '${currentStepInstanceId}' failed with a content-based error. Attempting retry ${attemptsMade + 1}/${retryConfig.count}.`, { error: error.message }, correlationId);

                if (runtimeState.enableExecutionLogs) {
                    await executionLoggerClient.logStepExecution({
                        ...baseRecord,
                        status: 'RETRYING_CONTENT',
                        eventTimestamp: stepEndTime, // The time of the failure event
                        endTime: stepEndTime,
                        durationMs: stepDurationMs,
                        errorInfo: { isRetryable: true, errorName: error.name, errorMessage: error.message },
                        inputMappingResult: finalStepInput,
                        mappingEvents: inputMappingEvents,
                        inputMappingContext: inputContext,
                        templateContextMappingContext: { ...inputContext, ...finalStepInput },
                        stepInstanceConfig: stepInstanceConfig, // Log the exact config used
                    });
                }

                throw new RetryableStepError(error.message);
            } else {
                log_error(`Step '${currentStepInstanceId}' failed with a content-based error and has exhausted all retries (${retryConfig.count}). Treating as terminal.`, { error: error.message }, correlationId);
            }
        }


        const errorInfo: AllmaError = {
            errorName: error.name || 'StepExecutionError',
            errorMessage: error.message,
            errorDetails: {
                failedStepInstanceId: currentStepInstanceId,
                cause: error.cause,
                stack: error.stack?.substring(0, 5000),
                ...error.details // Merge details from the thrown error (e.g., dynamodb_params)
            },
            isRetryable: isRetryableBySfn,
        };

        // Determine the log status
        let logStatus: 'RETRYING_SFN' | 'RETRYING_CONTENT' | 'FAILED' = 'FAILED';
        if (error instanceof RetryableStepError) {
            logStatus = 'RETRYING_SFN';
        } else if (error instanceof ContentBasedRetryableError) {
            logStatus = 'RETRYING_CONTENT';
        }

        if (isRetryableBySfn) {
            log_warn(`Step '${currentStepInstanceId}' failed with a retryable error. SFN will attempt to retry.`, { errorName: error.name, errorMessage: error.message }, correlationId);
        }

        const allMappingEvents: MappingEvent[] = [...inputMappingEvents];
        const stepHandlerResult = runtimeState._internal?.currentStepHandlerResult;
        const templateMappingEvents = stepHandlerResult?.outputData?._meta?._templateContextMappingEvents;
        if (templateMappingEvents) {
            allMappingEvents.push(...templateMappingEvents);
        }

        // Log the failure immediately, if enabled
        if (runtimeState.enableExecutionLogs) {
            const s3Pointer = await executionLoggerClient.logStepExecution({
                ...baseRecord,
                status: logStatus,
                eventTimestamp: stepEndTime,
                endTime: stepEndTime,
                durationMs: stepDurationMs,
                errorInfo: errorInfo,
                inputMappingResult: finalStepInput,
                mappingEvents: allMappingEvents,
                inputMappingContext: inputContext,
                outputMappingContext: inputContext,
                logDetails: {},
                templateContextMappingContext: { ...inputContext, ...finalStepInput },
                stepInstanceConfig: stepInstanceConfig, // Log the exact config used
            });

            // Capture the pointer for failed sandbox executions too, so the UI can see what went wrong.
            if (runtimeState._internal?.sandboxMode && s3Pointer) {
                log_debug('Sandbox mode detected (FAILED/RETRYING status). Captured full debug log S3 pointer.', {}, correlationId);
                runtimeState._internal.sandboxDebugLogS3Pointer = s3Pointer;
            }
        }

        // Re-throw the error so the caller can handle SFN state (retry, fallback, fail).
        throw error;
    }
};