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
 * Standardized input for any LLM provider adapter.
 */
export interface LlmGenerationRequest {
    provider: LLMProviderType;
    modelId: string;
    prompt: string;
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