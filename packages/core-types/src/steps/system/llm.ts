import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { S3PointerSchema, JsonPathStringSchema } from '../../common/core.js';
import { LLMProviderTypeSchema, LlmParametersSchema } from '../../llm/index.js';
import { TemplateContextMappingItemSchema } from '../templating.js';

/**
 * Defines a single image/PDF attachment for an LLM_INVOCATION step. Each attachment must
 * specify exactly one source:
 *  - `s3Pointer`: a file in S3, fetched and base64-encoded at runtime (MIME inferred from the
 *    object's ContentType when `mimeType` is omitted).
 *  - `url`: a public http(s) URL, fetched and base64-encoded at runtime.
 *  - `base64`: data already present in the flow context (e.g. from a prior API_CALL). Requires
 *    `mimeType`.
 */
export const LlmMediaAttachmentSchema = z
  .object({
    s3Pointer: S3PointerSchema.optional(),
    url: z.string().url().optional(),
    base64: z.string().min(1).optional(),
    mimeType: z.string().min(1).optional(),
  })
  .refine(
    (v) => [v.s3Pointer, v.url, v.base64].filter((s) => s !== undefined).length === 1,
    { message: 'Each media attachment must have exactly one source: s3Pointer, url, or base64.' }
  );
export type LlmMediaAttachment = z.infer<typeof LlmMediaAttachmentSchema>;

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
  mediaAttachments: z.array(LlmMediaAttachmentSchema).optional().describe("Media Attachments|json|Static list of images/PDFs to send to the model. Each item has exactly one source: s3Pointer, url, or base64. Only used by multimodal providers (Gemini, Bedrock Anthropic)."),
  mediaAttachmentsPath: JsonPathStringSchema.optional().describe("Dynamic Media Path|text|A JSONPath to an array of media attachment objects in the context (e.g. `$.steps_output.my_step.images`). Use this for a dynamic list."),
  inferenceParameters: LlmParametersSchema.optional().describe("Inference Parameters|json|Advanced LLM settings like temperature, topP, etc."),
  customConfig: z.object({
    jsonOutputMode: z.boolean().optional(),
  }).passthrough().optional().describe("Custom Config|json|Provider-specific or advanced settings."),
}).passthrough();