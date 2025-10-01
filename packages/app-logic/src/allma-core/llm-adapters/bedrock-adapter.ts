
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// For a list of supported models and their API structures, see:
// https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html

import {
    LLMProviderType,
    LlmProviderAdapter,
    LlmGenerationRequest,
    LlmGenerationResponse,
    PermanentStepError,
    TransientStepError
} from '@allma/core-types';
import { log_info, log_debug, log_error } from '@allma/core-sdk';

/**
 * Adapter for invoking AI models through AWS Bedrock.
 * This adapter is designed to be extensible to support various model providers
 * available on Bedrock (e.g., Anthropic, Cohere, Amazon) by inspecting the model ID.
 */
export class BedrockAdapter implements LlmProviderAdapter {
    private readonly client: BedrockRuntimeClient;

    constructor() {
        this.client = new BedrockRuntimeClient({});
        log_info('AWS Bedrock Adapter initialized.', {});
    }

    /**
     * Determines the underlying model provider from the Bedrock model ID string.
     * @param modelId - The Bedrock model ID (e.g., 'anthropic.claude-3-sonnet-20240229-v1:0').
     * @returns The provider name (e.g., 'anthropic').
     */
    private getProviderFromModelId(modelId: string): string {
        return modelId.split('.')[0];
    }

    /**
     * Builds the JSON payload for an Anthropic Claude model on Bedrock.
     * @param request - The standardized LlmGenerationRequest.
     * @returns A stringified JSON payload.
     */
    private buildAnthropicPayload(request: LlmGenerationRequest): string {
        const { prompt, maxOutputTokens, temperature, topP, topK, stopSequences } = request;

        const anthropicVersion = request.customConfig?.anthropic_version || 'bedrock-2023-05-31';

        const payload = {
            anthropic_version: anthropicVersion,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxOutputTokens ?? 4096,
            temperature: temperature ?? 0.7,
            top_p: topP ?? 1.0,
            top_k: topK ?? 250,
            stop_sequences: stopSequences,
        };
        return JSON.stringify(payload);
    }

    /**
     * Parses the response from an Anthropic Claude model on Bedrock.
     * @param responseBody - The parsed JSON object from the Bedrock API response.
     * @returns An object with the extracted responseText and tokenUsage.
     */
    private parseAnthropicResponse(responseBody: any): { responseText: string; tokenUsage: { inputTokens: number; outputTokens: number } } {
        const responseText = responseBody.content?.[0]?.text ?? '';
        const tokenUsage = {
            inputTokens: responseBody.usage?.input_tokens ?? 0,
            outputTokens: responseBody.usage?.output_tokens ?? 0,
        };
        return { responseText, tokenUsage };
    }

    /**
     * Builds the JSON payload for an Amazon Titan Text ("Nova") model on Bedrock.
     * This uses the modern conversational `messages` format.
     * @param request - The standardized LlmGenerationRequest.
     * @returns A stringified JSON payload. [1, 2]
     */
    private buildAmazonPayload(request: LlmGenerationRequest): string {
        const { prompt, maxOutputTokens, temperature, topP, stopSequences, seed } = request;
        const payload = {
            // The top-level structure now requires a 'messages' array.
            messages: [{
                role: 'user',
                content: [{ text: prompt }]
            }],
            // Inference parameters are nested under 'inferenceConfiguration'.
            inferenceConfig: {
                maxTokens: maxOutputTokens ?? 8192,
                stopSequences: stopSequences ?? [],
                temperature: temperature ?? 0.5,
                topP: topP ?? 0.9,
                ...(seed !== undefined && { seed: seed }),
            },
        };
        return JSON.stringify(payload);
    }

    /**
     * Parses the response from an Amazon Titan Text ("Nova") model on Bedrock.
     * This handles the modern conversational response format.
     * @param responseBody - The parsed JSON object from the Bedrock API response.
     * @returns An object with the extracted responseText and tokenUsage. [1, 2]
     */
    private parseAmazonResponse(responseBody: any): { responseText: string; tokenUsage: { inputTokens: number; outputTokens: number } } {
        // The response text is nested inside the 'output' object.
        const responseText = responseBody.output?.message?.content?.[0]?.text ?? '';
        // Token metrics are in the top-level 'usage' object.
        const tokenUsage = {
            inputTokens: responseBody.usage?.inputTokens ?? 0,
            outputTokens: responseBody.usage?.outputTokens ?? 0,
        };
        return { responseText, tokenUsage };
    }

    /**
     * Builds the JSON payload for an OpenAI model on Bedrock.
     * @param request - The standardized LlmGenerationRequest.
     * @returns A stringified JSON payload.
     */
    private buildOpenaiPayload(request: LlmGenerationRequest): string {
        const { prompt, maxOutputTokens, temperature, topP, stopSequences } = request;

        const payload = {
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxOutputTokens ?? 4096,
            temperature: temperature ?? 0.7,
            top_p: topP ?? 1.0,
            stop: stopSequences,
        };
        return JSON.stringify(payload);
    }

    /**
     * Parses the response from an OpenAI model on Bedrock.
     * @param responseBody - The parsed JSON object from the Bedrock API response.
     * @returns An object with the extracted responseText and tokenUsage.
     */
    private parseOpenaiResponse(responseBody: any): { responseText: string; tokenUsage: { inputTokens: number; outputTokens: number } } {
        const responseText = responseBody.choices?.[0]?.message?.content ?? '';
        const tokenUsage = {
            inputTokens: responseBody.usage?.prompt_tokens ?? 0,
            outputTokens: responseBody.usage?.completion_tokens ?? 0,
        };
        return { responseText, tokenUsage };
    }


    /**
     * Generates content using a Bedrock model, adhering to the standardized LlmProviderAdapter interface.
     * @param request - The standardized LlmGenerationRequest object.
     * @returns A promise that resolves to a standardized LlmGenerationResponse object.
     */
    async generateContent(request: LlmGenerationRequest): Promise<LlmGenerationResponse> {
        const { modelId, correlationId } = request;
        const provider = this.getProviderFromModelId(modelId);
        log_info(`BedrockAdapter: Requesting content from model`, { modelId, provider }, correlationId);

        let body: string;
        let responseParser: (body: any) => { responseText: string; tokenUsage: { inputTokens: number; outputTokens: number } };

        try {
            switch (provider) {
                case 'anthropic':
                    body = this.buildAnthropicPayload(request);
                    responseParser = this.parseAnthropicResponse;
                    break;
                
                case 'amazon':
                    body = this.buildAmazonPayload(request);
                    responseParser = this.parseAmazonResponse;
                    break;

                case 'openai':
                    body = this.buildOpenaiPayload(request);
                    responseParser = this.parseOpenaiResponse;
                    break;

                // To add a new provider (e.g., Cohere):
                // case 'cohere':
                //   body = this.buildCoherePayload(request);
                //   responseParser = this.parseCohereResponse;
                //   break;
                default:
                    throw new PermanentStepError(`Bedrock model provider '${provider}' derived from modelId '${modelId}' is not supported by the adapter.`);
            }
        } catch (error: any) {
            log_error('Failed to build payload for Bedrock model.', { error: error.message }, correlationId);
            return {
                success: false, provider: LLMProviderType.AWS_BEDROCK, modelUsed: modelId, responseText: null,
                errorMessage: `Payload construction error: ${error.message}`,
            };
        }

        const command = new InvokeModelCommand({
            modelId, body,
            contentType: 'application/json',
            accept: 'application/json',
        });
        
        try {
            const apiResponse = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(apiResponse.body));

            log_debug('Received raw response from Bedrock', { responseBody }, correlationId);

            const { responseText, tokenUsage } = responseParser(responseBody);

            return {
                success: true, provider: LLMProviderType.AWS_BEDROCK, modelUsed: modelId, responseText, tokenUsage,
            };
        } catch (error: any) {
            log_error('Error invoking Bedrock model', { modelId, errorName: error.name, errorMessage: error.message }, correlationId);

            let finalError: Error;
            switch (error.name) {
                case 'AccessDeniedException':
                case 'ValidationException':
                case 'ResourceNotFoundException':
                    finalError = new PermanentStepError(`Bedrock configuration or permission error: ${error.message}`, { errorDetails: { name: error.name } }, error);
                    break;
                case 'ThrottlingException':
                case 'ServiceQuotaExceededException':
                case 'InternalServerException':
                case 'ModelTimeoutException':
                    finalError = new TransientStepError(`Bedrock service error: ${error.message}`, { errorDetails: { name: error.name } }, error);
                    break;
                default:
                    finalError = new TransientStepError(`Unknown Bedrock error: ${error.message}`, { errorDetails: { name: error.name } }, error);
            }
            
            // The handler will catch this and pass it up to the step processor for retry/failure logic.
            throw finalError;
        }
    }
}
