import {
  LlmInvocationStepSchema,
  StepHandler,
  StepHandlerOutput,
  ENV_VAR_NAMES,
  ContentBasedRetryableError,
  JsonParseError,
  LlmGenerationRequest,
  MappingEvent,
  LlmGenerationResponse,
} from '@allma/core-types';
import {
  log_debug,
  log_error,
  log_info,
  log_warn,
  offloadIfLarge,
  extractAndParseJson,
} from '@allma/core-sdk';
import { getLlmAdapter } from '../llm-adapters/adapter-registry.js';
import { TemplateService } from '../template-service.js';
import { loadPromptTemplate } from '../config-loader.js';

const EXECUTION_TRACES_BUCKET_NAME = process.env[ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME]!;

// --- Global Model Health Tracking (Circuit Breaker) ---
const EXCLUSION_THRESHOLD = 5;
const EXCLUSION_TIME_WINDOW_MS = 60 * 1000; // 1 minute
const EXCLUSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface ModelFailureStats {
  failures: number[];
  excludedUntil: number;
}
const modelHealth: Record<string, ModelFailureStats> = {};

function getModelKey(provider: string, modelId: string): string {
  // Defensive fallback to prevent undefined key clashing
  return `${provider || 'unknown'}::${modelId || 'unknown'}`;
}

function isModelExcluded(provider: string, modelId: string): boolean {
  const key = getModelKey(provider, modelId);
  const stats = modelHealth[key];

  // If no stats exist, the model has never failed. It is NOT excluded.
  if (!stats) return false;

  const now = Date.now();

  if (stats.excludedUntil > 0) {
    if (now < stats.excludedUntil) {
      // We are still within the penalty time window
      return true;
    } else {
      // The penalty time has expired. Reset the state to allow attempts again.
      stats.excludedUntil = 0;
      stats.failures = [];
      return false;
    }
  }

  return false;
}

function getExclusionTime(provider: string, modelId: string): number | null {
  const key = getModelKey(provider, modelId);
  const stats = modelHealth[key];
  if (!stats) return null;
  if (Date.now() < stats.excludedUntil) {
    return stats.excludedUntil;
  }
  return null;
}

function recordModelFailure(provider: string, modelId: string) {
  const key = getModelKey(provider, modelId);
  if (!modelHealth[key]) {
    modelHealth[key] = { failures: [], excludedUntil: 0 };
  }

  const stats = modelHealth[key];
  const now = Date.now();

  // If it's already excluded, do not accumulate more failures
  if (stats.excludedUntil > now) {
    return;
  }

  stats.failures.push(now);

  // Clean up old failures that are outside of the 1-minute time window
  stats.failures = stats.failures.filter(timestamp => (now - timestamp) <= EXCLUSION_TIME_WINDOW_MS);

  // If the number of recent failures meets or exceeds the threshold, trip the breaker
  if (stats.failures.length >= EXCLUSION_THRESHOLD) {
    stats.excludedUntil = now + EXCLUSION_DURATION_MS;
    stats.failures = []; // Reset the array so it starts fresh after the exclusion period
  }
}

function recordModelSuccess(provider: string, modelId: string) {
  const key = getModelKey(provider, modelId);
  const stats = modelHealth[key];

  if (stats) {
    // A successful call fully heals the model. 
    // This prevents isolated, spaced-out failures from eventually tripping the breaker.
    stats.failures = [];
    stats.excludedUntil = 0;
  }
}
// --------------------------------------------------------

function getObjectSizes(obj: Record<string, any>): Record<string, number> {
  const sizes: Record<string, number> = {};
  for (const key of Object.keys(obj)) {
    try {
      const json = JSON.stringify(obj[key]);
      sizes[key] = new TextEncoder().encode(json).length;
    } catch (err) {
      sizes[key] = -1; // Mark unserializable entries
    }
  }
  return sizes;
}

export const handleLlmInvocation: StepHandler = async (
  stepDefinition,
  stepInput,
  runtimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;
  const parsedStepDef = LlmInvocationStepSchema.safeParse(stepDefinition);

  if (!parsedStepDef.success) {
    log_error('StepDefinition for LLM_INVOCATION is invalid.', { errors: parsedStepDef.error.flatten() }, correlationId);
    throw new Error('Invalid StepDefinition for LLM_INVOCATION.');
  }

  // The `stepDefinition` is now the single source of truth, fully merged by the processor.
  const { data: llmStepDef } = parsedStepDef;
  const { llmProvider, promptTemplateId, modelId, fallbacks = [] } = llmStepDef;

  // Determine final parameters. Use `inferenceParameters` as the single source of truth.
  const baseParams = llmStepDef.inferenceParameters || {};
  const baseCustomConfig = llmStepDef.customConfig || {};

  const modelsToTry = [
    {
      provider: llmProvider,
      modelId: modelId,
      inferenceParameters: baseParams,
      customConfig: baseCustomConfig
    },
    ...fallbacks.map(f => ({
      provider: f.llmProvider,
      modelId: f.modelId,
      inferenceParameters: f.inferenceParameters || baseParams,
      customConfig: f.customConfig || baseCustomConfig
    }))
  ];

  log_info(`Executing LLM_INVOCATION step: ${llmStepDef.id}`, {
    primaryProvider: llmProvider,
    primaryModelId: modelId,
    fallbackCount: fallbacks.length,
  }, correlationId);


  const templateService = TemplateService.getInstance();

  if (!promptTemplateId) {
    log_error(`Prompt template ID not found in step definition.`, { llmStepDef }, correlationId);
    throw new Error(`Prompt template ID not found in step definition.`);
  }

  const promptTemplate = await loadPromptTemplate(promptTemplateId, 'LATEST_PUBLISHED', correlationId);

  if (!promptTemplate.content) {
    throw new Error(`Loaded prompt template '${promptTemplateId}' has no content.`);
  }

  log_debug(`Loaded prompt template '${promptTemplateId}' version ${promptTemplate.version}. Building template context...`, {}, correlationId);

  let templateContext = { ...stepInput };
  let templateMappingEvents: MappingEvent[] = [];
  let mappedContextResult: Record<string, any> | undefined = undefined;

  if (llmStepDef.templateContextMappings) {
    const templateSourceData = { ...runtimeState.currentContextData, ...runtimeState, ...stepInput };

    const { context: mappedContext, events } = await templateService.buildContextFromMappings(
      llmStepDef.templateContextMappings,
      templateSourceData,
      correlationId
    );
    templateContext = { ...templateContext, ...mappedContext };
    templateMappingEvents = events;
    mappedContextResult = mappedContext;
  }
  const contextSizes = getObjectSizes(templateContext);

  log_debug('Final context keys for prompt template', { keys: Object.keys(templateContext), sizes: contextSizes }, correlationId);
  const finalPrompt = await templateService.render(promptTemplate.content, templateContext, correlationId);

  // Prepare this now, so it's available in both success and error paths
  const s3KeyPrefix = `step_outputs/${runtimeState.flowExecutionId}/${llmStepDef.id}/template_context`;
  const finalTemplateContextForLog = await offloadIfLarge(
    mappedContextResult,
    EXECUTION_TRACES_BUCKET_NAME,
    s3KeyPrefix,
    correlationId
  );

  let lastError: any = null;
  let parsedOutput: any;
  let responseToReturn: LlmGenerationResponse | null = null;
  let successfulModel: any;
  let finalGenerationRequest: LlmGenerationRequest | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];

    if (isModelExcluded(model.provider, model.modelId)) {
      const excludedUntilMs = getExclusionTime(model.provider, model.modelId);

      if (excludedUntilMs !== null) {
        const untilIso = new Date(excludedUntilMs).toISOString();
        log_warn(`Model ${model.modelId} from ${model.provider} is currently excluded due to recent consecutive failures until ${untilIso}. Skipping to next fallback.`, { excludedUntil: untilIso }, correlationId);
        lastError = new Error(`Model ${model.modelId} from ${model.provider} is temporarily excluded until ${untilIso} due to high failure rate.`);
        continue;
      }
    }

    log_info(`Attempting LLM invocation with model ${model.modelId} from ${model.provider}...`, { attemptIndex: i }, correlationId);

    try {
      const adapter = getLlmAdapter(model.provider);
      const useJsonOutputMode = model.customConfig.jsonOutputMode === true;
      const generationRequest: LlmGenerationRequest = {
        provider: model.provider,
        modelId: model.modelId,
        prompt: finalPrompt,
        temperature: model.inferenceParameters.temperature ?? 0.7,
        maxOutputTokens: model.inferenceParameters.maxOutputTokens ?? 16000,
        topP: model.inferenceParameters.topP ?? 0.95,
        topK: model.inferenceParameters.topK ?? 40,
        ...(model.inferenceParameters.seed !== undefined && { seed: model.inferenceParameters.seed }),
        customConfig: model.customConfig,
        jsonOutputMode: useJsonOutputMode,
        correlationId,
      };

      const response = await adapter.generateContent(generationRequest);

      if (!response.success) {
        log_warn(`LLM adapter reported failure for ${model.modelId}.`, {
          errorMessage: response.errorMessage, errorDetails: response.errorDetails,
          safetyDetails: response.safetyDetails, provider: model.provider
        }, correlationId);
        recordModelFailure(model.provider, model.modelId);
        lastError = new Error(response.errorMessage || `LLM Invocation failed for ${model.modelId} without a specific error message.`);
        continue;
      }

      let currentParsedOutput: any;
      if (useJsonOutputMode && response.responseText) {
        try {
          currentParsedOutput = extractAndParseJson(response.responseText, correlationId);
        } catch (e: any) {
          if (e instanceof JsonParseError) {
            log_warn(`LLM response is not valid JSON for ${model.modelId}. Try fallback if available.`, { responseText: response.responseText }, correlationId);
            // Content based error. Do NOT penalize the model health, just try the next fallback.
            const errorLogDetails = {
              tokenUsage: response.tokenUsage,
              llmPrompt: finalPrompt,
              llmRawResponse: response.responseText,
              templateContextMappingResult: finalTemplateContextForLog,
              _templateContextMappingEvents: templateMappingEvents,
            };
            lastError = new ContentBasedRetryableError(
              `Failed to parse LLM response as JSON from ${model.modelId}. Raw response: ${response.responseText}`,
              { logDetails: errorLogDetails },
              e
            );
            continue; // try next model
          }
          throw e; // unexpected error
        }
      } else {
        currentParsedOutput = { llm_response: response.responseText };
      }

      // Record success
      recordModelSuccess(model.provider, model.modelId);

      // Save results
      parsedOutput = currentParsedOutput;
      responseToReturn = response;
      successfulModel = model;
      finalGenerationRequest = generationRequest;
      lastError = null; // Clear any previous errors since we succeeded
      break;

    } catch (error: any) {
      log_warn(`Exception during LLM invocation with ${model.modelId}.`, {
        errorMessage: error.message, stack: error.stack,
        errorDetails: error.details || error.cause,
        provider: model.provider
      }, correlationId);
      recordModelFailure(model.provider, model.modelId);
      lastError = error;
      continue;
    }
  }

  if (!responseToReturn) {
    // If we get here, all models failed.
    const errorType = lastError instanceof ContentBasedRetryableError ? 'Content-based retryable error (incorrect JSON?)' : 'General failure';
    log_error(`LLM_INVOCATION step '${llmStepDef.name}' failed after trying all fallbacks. Reason: ${errorType}`, { error: lastError?.message }, correlationId);
    if (lastError) throw lastError;
    throw new Error('All configured LLM models failed.');
  }

  const { ...invocationParametersForLog } = finalGenerationRequest!;

  let finalOutputData: Record<string, any>;
  if (Array.isArray(parsedOutput) || typeof parsedOutput !== 'object' || parsedOutput === null) {
    // Wrap arrays or primitives in an object so they aren't destroyed by spread operators
    // later in the step executor.
    finalOutputData = {
      llm_response: parsedOutput,
    };
  } else {
    finalOutputData = {
      ...parsedOutput,
    };
  }

  return {
    outputData: {
      ...finalOutputData,
      _meta: {
        tokenUsage: responseToReturn.tokenUsage,
        llmInvocationParameters: invocationParametersForLog,
        llmPrompt: finalPrompt,
        llmRawResponse: responseToReturn.responseText,
        templateContextMappingResult: finalTemplateContextForLog,
        _templateContextMappingEvents: templateMappingEvents,
      },
    },
  };
};