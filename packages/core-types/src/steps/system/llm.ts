import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { LLMProviderTypeSchema, LlmParametersSchema } from '../../llm/index.js';
import { TemplateContextMappingItemSchema } from '../templating.js';

export const LlmInvocationFallbackSchema = z.object({
  llmProvider: LLMProviderTypeSchema,
  modelId: z.string().min(1),
  inferenceParameters: LlmParametersSchema.optional(),
  customConfig: z.object({
    jsonOutputMode: z.boolean().optional(),
  }).passthrough().optional(),
});
export type LlmInvocationFallback = z.infer<typeof LlmInvocationFallbackSchema>;

export const LlmInvocationStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.LLM_INVOCATION),
  moduleIdentifier: z.undefined().optional(),
  llmProvider: LLMProviderTypeSchema,
  modelId: z.string().min(1).describe("Model ID|text|e.g., gemini-1.5-pro-latest or anthropic.claude-3-sonnet-20240229-v1:0"),
  fallbacks: z.array(LlmInvocationFallbackSchema).optional().describe("Fallback Models|json|List of fallback models to use if the primary model fails."),
  promptTemplateId: z.string().min(1).optional().describe("Prompt Template|prompt-select|Select a pre-defined prompt template."),
  templateContextMappings: z.record(TemplateContextMappingItemSchema).optional().describe("Template Context Mappings|json|Map flow context data to variables in the prompt."),
  directPrompt: z.string().optional().describe("Direct Prompt|textarea|Enter a prompt directly. Overrides Prompt Template if used."),
  inferenceParameters: LlmParametersSchema.optional().describe("Inference Parameters|json|Advanced LLM settings like temperature, topP, etc."),
  customConfig: z.object({
    jsonOutputMode: z.boolean().optional(),
  }).passthrough().optional().describe("Custom Config|json|Provider-specific or advanced settings."),
}).passthrough();