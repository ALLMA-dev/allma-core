import { z } from 'zod';

/**
 * Defines the supported Large Language Model (LLM) providers.
 */
export enum LLMProviderType {
    GEMINI = 'GEMINI',
    ANTHROPIC = 'ANTHROPIC',
    OPENAI = 'OPENAI',
    AWS_BEDROCK = 'AWS_BEDROCK',
    CUSTOM_LAMBDA = 'CUSTOM_LAMBDA',
}
export const LLMProviderTypeSchema = z.nativeEnum(LLMProviderType);

/**
 * Standardized schema for LLM generation parameters.
 */
export const LlmParametersSchema = z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxOutputTokens: z.number().int().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().int().positive().optional(),
    seed: z.number().int().optional(), 
});
export type LlmParameters = z.infer<typeof LlmParametersSchema>;

/**
 * Distinguishes the broad category of a media attachment, which maps to different
 * provider content-block shapes (e.g. Anthropic `image` vs `document` blocks).
 */
export enum LlmMediaKind {
    IMAGE = 'IMAGE',
    DOCUMENT = 'DOCUMENT',
}

/**
 * A media attachment fully resolved to base64, ready to be handed to a provider adapter.
 * Resolution (S3 fetch, URL fetch, inline pass-through) happens in the step handler so that
 * adapters only ever deal with normalized, in-memory bytes.
 */
export interface LlmMediaContent {
    /** Whether this should be sent as an image or a document block. */
    kind: LlmMediaKind;
    /** The IANA media type, e.g. 'image/jpeg' or 'application/pdf'. */
    mimeType: string;
    /** Base64-encoded bytes, without any `data:` URI prefix. */
    data: string;
}

/** Image MIME types accepted by the multimodal-capable providers (Gemini, Bedrock Anthropic). */
export const SUPPORTED_LLM_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
] as const;

/** Document MIME types accepted by the multimodal-capable providers. */
export const SUPPORTED_LLM_DOCUMENT_MIME_TYPES = [
    'application/pdf',
] as const;

/**
 * Standardized input for any LLM provider adapter.
 */
export interface LlmGenerationRequest {
    provider: LLMProviderType;
    modelId: string;
    prompt: string;
    /** Optional resolved media (images/PDFs) to send alongside the text prompt. */
    media?: LlmMediaContent[];
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    seed?: number;
    stopSequences?: string[];
    customConfig?: Record<string, any>;
    jsonOutputMode?: boolean;
    correlationId?: string;
}
  
/**
 * Standardized output from any LLM provider adapter.
 */
export interface LlmGenerationResponse {
    success: boolean;
    provider: LLMProviderType;
    modelUsed: string;
    responseText: string | null;
    tokenUsage?: {
      inputTokens?: number;
      outputTokens?: number;
    };
    safetyFlagged?: boolean;
    safetyDetails?: any;
    errorMessage?: string;
    errorDetails?: any;
}
  
/**
 * Interface that all LLM provider adapters must implement.
 */
export interface LlmProviderAdapter {
    generateContent(request: LlmGenerationRequest): Promise<LlmGenerationResponse>;
}