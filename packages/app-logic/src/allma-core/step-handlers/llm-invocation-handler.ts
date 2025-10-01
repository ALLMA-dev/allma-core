import {
  LlmInvocationStepSchema,
  StepHandler,
  StepHandlerOutput,
  ENV_VAR_NAMES,
  ContentBasedRetryableError,
  JsonParseError,
  LlmGenerationRequest,
  MappingEvent,
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
  const { llmProvider, promptTemplateId, modelId } = llmStepDef;

  // Determine final parameters. Use `inferenceParameters` as the single source of truth.
  const finalParams = llmStepDef.inferenceParameters || {};
  const finalCustomConfig = llmStepDef.customConfig || {};

  log_info(`Executing LLM_INVOCATION step: ${llmStepDef.name}`, {
    provider: llmProvider,
    modelId: modelId,
    parameters: finalParams,
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
    const templateSourceData = { ...runtimeState.currentContextData, ...stepInput };

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
  const finalPrompt = templateService.render(promptTemplate.content, templateContext);

  try {
    const adapter = getLlmAdapter(llmProvider);
    const useJsonOutputMode = finalCustomConfig.jsonOutputMode === true;

    const generationRequest: LlmGenerationRequest = {
      provider: llmProvider,
      modelId: modelId,
      prompt: finalPrompt,
      temperature: finalParams.temperature ?? 0.7,
      maxOutputTokens: finalParams.maxOutputTokens ?? 16000,
      topP: finalParams.topP ?? 0.95,
      topK: finalParams.topK ?? 40,
      ...(finalParams.seed !== undefined && { seed: finalParams.seed }),
      customConfig: finalCustomConfig,
      jsonOutputMode: useJsonOutputMode,
      correlationId,
    };

    const response = await adapter.generateContent(generationRequest);

    if (!response.success) {
      log_warn('LLM adapter reported failure.', { errorMessage: response.errorMessage, provider: llmProvider }, correlationId);
      throw new Error(response.errorMessage || 'LLM Invocation failed without a specific error message.');
    }

    let parsedOutput: any;
    if (finalCustomConfig.jsonOutputMode === true && response.responseText) {
      try {
        parsedOutput = extractAndParseJson(response.responseText, correlationId);
      } catch (e: any) {
        if (e instanceof SyntaxError || e instanceof JsonParseError) {
          log_warn('LLM response is not valid JSON. Throwing ContentBasedRetryableError.', { responseText: response.responseText }, correlationId);
          throw new ContentBasedRetryableError(`Failed to parse LLM response as JSON. Raw response: ${response.responseText}`);
        }
        throw e;
      }
    } else {
      parsedOutput = { llm_response: response.responseText };
    }


    const s3KeyPrefix = `step_outputs/${runtimeState.flowExecutionId}/${llmStepDef.id}/template_context`;
    const finalTemplateContextForLog = await offloadIfLarge(
      mappedContextResult,
      EXECUTION_TRACES_BUCKET_NAME,
      s3KeyPrefix,
      correlationId
    );

    const { ...invocationParametersForLog } = generationRequest;

    return {
      outputData: {
        ...parsedOutput,
        _meta: {
          tokenUsage: response.tokenUsage,
          llmInvocationParameters: invocationParametersForLog,
          llmPrompt: finalPrompt,
          llmRawResponse: response.responseText,
          templateContextMappingResult: finalTemplateContextForLog,
          _templateContextMappingEvents: templateMappingEvents,
        },
      },
    };
  } catch (error: any) {
    const errorType = error instanceof ContentBasedRetryableError ? 'Content-based retryable error (incorect JSON?)' : 'General failure';
    log_error(`LLM_INVOCATION step '${llmStepDef.name}' failed. Reason: ${errorType}`, { error: error.message }, correlationId);
    throw error;
  }
};
