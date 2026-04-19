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
  TransientStepError,
} from '@allma/core-types';
import { log_info, log_debug, offloadIfLarge, log_warn, log_error, isObject } from '@allma/core-sdk';
import { JSONPath } from 'jsonpath-plus';
import { getStepHandler } from '../../allma-core/step-handlers/handler-registry.js';
import { hasInternalModuleHandler } from '../../allma-core/module-registry.js';
import { invokeExternalStep } from './external-step-invoker.js';
import { validateLlmOutput } from '../../allma-core/security-validator.js';
import { processStepOutput, setByDotNotation } from '../../allma-core/data-mapper.js';
import { executionLoggerClient } from '../../allma-core/execution-logger-client.js';
import { resolveNextStep } from './transition-resolver.js';
import { renderNestedTemplates } from '../../allma-core/utils/template-renderer.js';

const EXECUTION_TRACES_BUCKET_NAME = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME]!;
// The actual SFN limit is 256KB, so let's warn above a safe threshold like 240KB.
const SFN_PAYLOAD_WARN_THRESHOLD_BYTES = 240 * 1024;
const MAX_INTERNAL_RETRIES = 5; // Max retries for transient errors
const INITIAL_BACKOFF_MS = 250; // Initial backoff for retries

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
  stepInput: Record<string, any>, 
  inputMappingEvents: MappingEvent[],
  stepStartTime: string,
  correlationId: string,
): Promise<{ updatedRuntimeState: FlowRuntimeState; nextStepId: string | undefined }> => {
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

  log_debug(
    `Executing step '${currentStepInstanceId}' of type '${stepDef.stepType}'. Input is already prepared.`,
    { stepInput: JSON.stringify(stepInput).substring(0, 1000) },
    correlationId,
  );

  const finalStepInput = { ...stepInput };

  if (stepInstanceConfig.literals) {
    const templateContextForLiterals = { ...runtimeState.currentContextData, ...runtimeState, ...finalStepInput };
    const renderedLiterals = await renderNestedTemplates(stepInstanceConfig.literals, templateContextForLiterals, correlationId);
    
    if (renderedLiterals) {
      for (const [targetPath, literalValue] of Object.entries(renderedLiterals)) {
        log_debug(`Applying literal value`, { targetPath, valuePreview: JSON.stringify(literalValue)?.substring(0, 200) }, correlationId);
        setByDotNotation(finalStepInput, targetPath, literalValue);
      }
    }
  }

  const finalStepDefForHandler = stepDef;
  const templateContext = { ...runtimeState.currentContextData, ...runtimeState, ...finalStepInput };

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

  if (runtimeState.enableExecutionLogs) {
    await executionLoggerClient.logStepExecution({
      ...baseRecord,
      status: 'STARTED',
      eventTimestamp: stepStartTime,
      inputMappingResult: finalStepInput,
      mappingEvents: inputMappingEvents,
      inputMappingContext: inputContext, 
      templateContextMappingContext: templateContext,
      stepInstanceConfig: stepInstanceConfig, 
    });
  }

  let outputDataForMapping: Record<string, any> = {};
  let logDetailsForRecord: any = {};
  let executionError: any = null;

  try {
    let stepHandlerResult;
    let lastTransientError: TransientStepError | null = null;

    // --- GENERIC RETRY LOOP FOR TRANSIENT ERRORS ---
    for (let attempt = 1; attempt <= MAX_INTERNAL_RETRIES; attempt++) {
      try {
        if (
          finalStepDefForHandler.moduleIdentifier &&
          typeof finalStepDefForHandler.moduleIdentifier === 'string' &&
          !hasInternalModuleHandler(finalStepDefForHandler.moduleIdentifier)
        ) {
          stepHandlerResult = await invokeExternalStep(finalStepDefForHandler.moduleIdentifier, stepInstanceConfig, finalStepInput, runtimeState);
        } else {
          log_info(`Invoking internal step handler for step type: ${finalStepDefForHandler.stepType}, attempt ${attempt}`, {}, correlationId);
          const handler = getStepHandler(finalStepDefForHandler.stepType);
          stepHandlerResult = await handler(finalStepDefForHandler, finalStepInput, runtimeState);
        }
        lastTransientError = null; 
        break; 
      } catch (error: any) {
        if (error instanceof TransientStepError) {
          lastTransientError = error;
          if (attempt < MAX_INTERNAL_RETRIES) {
            const delay = Math.pow(2, attempt) * INITIAL_BACKOFF_MS + Math.random() * 50; 
            log_warn(
              `Step handler caught a transient error. Retrying in ${delay.toFixed(2)}ms... (Attempt ${attempt}/${MAX_INTERNAL_RETRIES})`,
              { error: error.message, step: currentStepInstanceId },
              correlationId,
            );
            await new Promise(res => setTimeout(res, delay));
            continue; 
          }
        }
        throw error;
      }
    }

    if (lastTransientError) {
      log_error(`Step handler failed after ${MAX_INTERNAL_RETRIES} attempts due to a persistent transient error.`, { error: lastTransientError.message }, correlationId);
      throw lastTransientError; 
    }
    // --- END: GENERIC RETRY LOOP ---

    if (runtimeState._internal) {
      runtimeState._internal.currentStepHandlerResult = stepHandlerResult;
    }

    if (stepInstanceConfig.delay?.position !== 'before') {
      await executeDelay(stepInstanceConfig.delay, correlationId);
    }

    // --- INTEGRATED SECURITY VALIDATION ---
    if (stepInstanceConfig.stepType === StepType.LLM_INVOCATION && stepInstanceConfig.securityValidatorConfig) {
      const outputDataForValidation = stepHandlerResult!.outputData || {};
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
          stepHandlerResult!.outputData?._meta?.llmPrompt || '',
          stepInstanceConfig.securityValidatorConfig,
          correlationId,
        );
      }
    }
    // --- END: INTEGRATED SECURITY VALIDATION ---

    outputDataForMapping = stepHandlerResult!.outputData || {};

    // --- GENERIC OUTPUT VALIDATION LOGIC ---
    if ((stepInstanceConfig as any).outputValidation?.requiredFields && outputDataForMapping) {
      log_info(
        'Performing generic output validation.',
        { requiredFields: (stepInstanceConfig as any).outputValidation.requiredFields },
        correlationId,
      );
      for (const fieldPath of (stepInstanceConfig as any).outputValidation.requiredFields) {
        const matches = JSONPath({ path: fieldPath, json: outputDataForMapping, wrap: true });
        if (matches.length === 0 || matches[0] === null || matches[0] === undefined) {
          const errorMessage = `Required output field validation failed. Path '${fieldPath}' was missing or null/undefined in the step output.`;
          log_warn(errorMessage, { output: outputDataForMapping }, correlationId);
          throw new ContentBasedRetryableError(errorMessage);
        }
      }
      log_info('Generic output validation passed successfully.', {}, correlationId);
    }
    // --- END: GENERIC OUTPUT VALIDATION LOGIC ---

    if (outputDataForMapping._meta) {
      logDetailsForRecord = outputDataForMapping._meta;
      delete outputDataForMapping._meta;
    }
    
    // NOTE: We deliberately do NOT merge `finalStepInput` into `outputDataForMapping` here anymore.
    // `outputDataForMapping` remains the PURE step output, avoiding data snowballing in payloads.

  } catch (error: any) {
    const stepEndTime = new Date().toISOString();
    const stepDurationMs = new Date(stepEndTime).getTime() - new Date(stepStartTime).getTime();

    // 1. Handle Retryable Errors first (Content-based or System)
    if (error instanceof ContentBasedRetryableError && stepInstanceConfig.onError?.retryOnContentError) {
      const retryConfig = stepInstanceConfig.onError.retryOnContentError;
      const attemptsMade = runtimeState.stepRetryAttempts[currentStepInstanceId] || 1;

      if (attemptsMade < retryConfig.count) {
        log_warn(
          `Step '${currentStepInstanceId}' failed with a content-based error. Attempting retry ${attemptsMade + 1}/${retryConfig.count}.`,
          { error: error.message },
          correlationId,
        );
        if (runtimeState.enableExecutionLogs) {
          await executionLoggerClient.logStepExecution({
            ...baseRecord,
            status: 'RETRYING_CONTENT',
            eventTimestamp: stepEndTime,
            endTime: stepEndTime,
            durationMs: stepDurationMs,
            errorInfo: { isRetryable: true, errorName: error.name, errorMessage: error.message },
            inputMappingResult: finalStepInput,
            mappingEvents: inputMappingEvents,
            inputMappingContext: inputContext,
            templateContextMappingContext: templateContext,
            stepInstanceConfig: stepInstanceConfig,
          });
        }
        throw new RetryableStepError(error.message);
      }
    }

    // 2. Handle continueOnFailure Logic
    if (stepInstanceConfig.onError?.continueOnFailure) {
      log_warn(`Step '${currentStepInstanceId}' failed but continueOnFailure is active. Suppressing error.`, { error: error.message }, correlationId);

      executionError = error;
      outputDataForMapping = {
        errorName: error.name || 'StepError',
        errorMessage: error.message,
        errorDetails: {
          failedStepInstanceId: currentStepInstanceId,
          cause: error.cause,
          stack: error.stack,
          ...error.details,
        },
        isRetryable: false,
      };

    } else {
      // 3. Fallback: Log and Re-throw for standard failure handling
      const isRetryableBySfn = error instanceof RetryableStepError || error instanceof ContentBasedRetryableError || error instanceof TransientStepError;

      let logStatus: 'RETRYING_SFN' | 'RETRYING_CONTENT' | 'FAILED' = 'FAILED';
      if (error instanceof RetryableStepError || error instanceof TransientStepError) logStatus = 'RETRYING_SFN';
      else if (error instanceof ContentBasedRetryableError) logStatus = 'RETRYING_CONTENT';

      const errorInfo: AllmaError = {
        errorName: error.name || 'StepExecutionError',
        errorMessage: error.message,
        errorDetails: {
          failedStepInstanceId: currentStepInstanceId,
          cause: error.cause,
          stack: error.stack?.substring(0, 5000),
          ...error.details,
        },
        isRetryable: isRetryableBySfn,
      };

      const allMappingEvents: MappingEvent[] = [...inputMappingEvents];
      const stepHandlerResult = runtimeState._internal?.currentStepHandlerResult;
      const templateMappingEvents = stepHandlerResult?.outputData?._meta?._templateContextMappingEvents;
      if (templateMappingEvents) {
        allMappingEvents.push(...templateMappingEvents);
      }

      if (runtimeState.enableExecutionLogs) {
        await executionLoggerClient.logStepExecution({
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
          logDetails: error.details?.logDetails,
          templateContextMappingContext: templateContext,
          stepInstanceConfig: stepInstanceConfig,
        });
      }

      throw error;
    }
  }

  // --- Post-Execution Processing ---

  const stepEndTime = new Date().toISOString();
  const stepDurationMs = new Date(stepEndTime).getTime() - new Date(stepStartTime).getTime();

  if (!executionError) {
    log_info(`Step '${currentStepInstanceId}' executed successfully.`, { durationMs: stepDurationMs }, correlationId);
  }

  const templateMappingEvents = logDetailsForRecord?._templateContextMappingEvents;

  // Offload large outputs to S3 before mapping. (S3 only receives pure output)
  const s3KeyPrefix = `step_outputs/${runtimeState.flowExecutionId}/${stepInstanceConfig.stepInstanceId}`;

  let finalOutputForMapping;
  if (stepInstanceConfig.forceS3Offload) {
    log_info(`'forceS3Offload' is true for step '${currentStepInstanceId}'. Offloading output regardless of size.`, {}, correlationId);
    finalOutputForMapping = await offloadIfLarge(outputDataForMapping, EXECUTION_TRACES_BUCKET_NAME, s3KeyPrefix, correlationId, 0);
  } else if (stepInstanceConfig.disableS3Offload) {
    log_info(`S3 offload is disabled for step '${currentStepInstanceId}'.`, {}, correlationId);
    finalOutputForMapping = outputDataForMapping;

    if (outputDataForMapping) {
      try {
        const payloadString = JSON.stringify(outputDataForMapping);
        const payloadSize = Buffer.byteLength(payloadString, 'utf-8');
        if (payloadSize > SFN_PAYLOAD_WARN_THRESHOLD_BYTES) {
          log_warn(
            `S3 offload is disabled, but payload size (${payloadSize} bytes) is near or exceeds the SFN state limit of 256KB.`,
            {},
            correlationId,
          );
        }
      } catch (e) {
        /* ignore */
      }
    }
  } else {
    finalOutputForMapping = await offloadIfLarge(outputDataForMapping, EXECUTION_TRACES_BUCKET_NAME, s3KeyPrefix, correlationId);
  }

  // --- SMART OUTPUT MAPPING (Targeted Input Fallback) ---
  // Attach the input to the mapping object as a NON-ENUMERABLE property.
  // This allows JSONPath mappings to access `$._step_input.xyz` while keeping it completely 
  // hidden from JSON.stringify (preventing wildcard '$' mappings from bloating state).
  if (isObject(finalOutputForMapping)) {
      Object.defineProperty(finalOutputForMapping, '_step_input', {
          value: finalStepInput,
          enumerable: false,
          writable: false,
          configurable: true
      });
  }

  const effectiveOutputMappings = stepInstanceConfig.outputMappings === undefined
      ? { [`$.steps_output.${currentStepInstanceId}`]: '$' } // Fixed default syntax
      : { ...stepInstanceConfig.outputMappings };

  // Evaluate requested paths. If a field isn't in output but IS in input, seamlessly route the mapping to `_step_input`.
  for (const targetPath of Object.keys(effectiveOutputMappings)) {
      const sourcePath = effectiveOutputMappings[targetPath];
      
      // Skip wildcard mapping paths as they explicitly target the root (which is pure output)
      if (sourcePath !== '$' && sourcePath !== '$.') {
          try {
              // 1. Try finding the value in the PURE output data
              const outputMatches = JSONPath({ path: sourcePath, json: outputDataForMapping });
              
              if (!outputMatches || outputMatches.length === 0) {
                  // 2. Not found in output. Try finding it in the INPUT data.
                  const inputMatches = JSONPath({ path: sourcePath, json: finalStepInput });
                  
                  if (inputMatches && inputMatches.length > 0) {
                      // 3. Match found in input! Rewrite the mapping to explicitly target the non-enumerable fallback property.
                      const rewrittenSourcePath = sourcePath.replace(/^\$\.?/, '$._step_input.');
                      effectiveOutputMappings[targetPath] = rewrittenSourcePath;
                      log_debug(`Smart Mapping: Rewrote '${targetPath}' to resolve from input using '${rewrittenSourcePath}'`, {}, correlationId);
                  }
              }
          } catch (e) {
              // Ignore JSONPath syntax errors here; processStepOutput will catch and log them correctly.
          }
      }
  }

  let outputMappingEvents: MappingEvent[] = [];
  if (Object.keys(effectiveOutputMappings).length > 0 && finalOutputForMapping) {
    outputMappingEvents = await processStepOutput(effectiveOutputMappings, finalOutputForMapping, runtimeState.currentContextData, correlationId);
    log_debug('Context data after output mapping', { contextKeys: Object.keys(runtimeState.currentContextData) }, correlationId);
  }

  const { nextStepId, transitionDetails } = await resolveNextStep(stepInstanceConfig, runtimeState);

  const allMappingEvents: MappingEvent[] = [...inputMappingEvents, ...outputMappingEvents];
  if (templateMappingEvents) {
    allMappingEvents.push(...templateMappingEvents);
  }

  logDetailsForRecord.transitionEvaluation = transitionDetails;

  if (runtimeState.enableExecutionLogs) {
    const s3Pointer = await executionLoggerClient.logStepExecution({
      ...baseRecord,
      status: 'COMPLETED', 
      eventTimestamp: stepEndTime,
      endTime: stepEndTime,
      durationMs: stepDurationMs,
      logDetails: logDetailsForRecord,
      inputMappingResult: finalStepInput,
      outputData: finalOutputForMapping, 
      mappingEvents: allMappingEvents,
      inputMappingContext: inputContext,
      outputMappingContext: runtimeState.currentContextData,
      stepInstanceConfig: stepInstanceConfig,
      ...(executionError && {
        errorInfo: {
          errorName: executionError.name || 'HandledError',
          errorMessage: executionError.message,
          isRetryable: false,
        },
      }),
    });

    if (runtimeState._internal?.sandboxMode && s3Pointer) {
      log_debug('Sandbox mode detected. Captured full debug log S3 pointer.', {}, correlationId);
      runtimeState._internal.sandboxDebugLogS3Pointer = s3Pointer;
    }
  }

  return { updatedRuntimeState: runtimeState, nextStepId };
};