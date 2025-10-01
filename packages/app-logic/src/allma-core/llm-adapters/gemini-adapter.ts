import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import {
  GoogleGenAI,
  SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
  GenerateContentConfig
} from '@google/genai';
import { LLMProviderType, ENV_VAR_NAMES, LlmProviderAdapter, LlmGenerationRequest, LlmGenerationResponse } from '@allma/core-types';
import { log_info, log_debug, log_warn, log_error } from '@allma/core-sdk';

const secretsManagerClient = new SecretsManagerClient({});
const geminiApiKeySecretArn = process.env[ENV_VAR_NAMES.AI_API_KEY_SECRET_ARN];
let cachedApiKey: string | null = null;
let genAI: GoogleGenAI | null = null;

const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// const REQUEST_TIMEOUT_MS = 120000; // 2 minutes per API request attempt - This was unused

/**
 * An adapter to interact with Google's Gemini models using the @google/genai SDK.
 * It handles API key retrieval, client initialization, request/response mapping,
 * and includes a robust retry mechanism for transient errors.
 */
export class GeminiAdapter implements LlmProviderAdapter {
  /**
   * Retrieves the Gemini API key from AWS Secrets Manager.
   * Caches the key for subsequent calls within the same Lambda execution context.
   * @param correlationId - Optional ID for logging.
   * @returns The API key string.
   */
  private async getApiKey(correlationId?: string): Promise<string> {
    if (cachedApiKey) return cachedApiKey;
    if (!geminiApiKeySecretArn) {
      log_error('AI_API_KEY_SECRET_ARN environment variable is not set.', {}, correlationId);
      throw new Error('Gemini API credentials secret ARN is not configured.');
    }
    log_info('Fetching Gemini API key from Secrets Manager', { secretArn: geminiApiKeySecretArn }, correlationId);
    const command = new GetSecretValueCommand({ SecretId: geminiApiKeySecretArn });
    try {
      const data = await secretsManagerClient.send(command);
      if (data.SecretString) {
        const secretValue = JSON.parse(data.SecretString);
        if (secretValue.GeminiApiKey) {
          cachedApiKey = secretValue.GeminiApiKey;
          if (cachedApiKey) {
            log_info('Successfully fetched and cached Gemini API key.', {}, correlationId);
            return cachedApiKey;
          }
        }
      }
      throw new Error('GeminiApiKey not found in the secret value.');
    } catch (error: any) {
      log_error('Failed to retrieve Gemini API key from Secrets Manager', { error: error.message }, correlationId);
      throw error;
    }
  }

  /**
   * Initializes and returns a singleton instance of the GoogleGenAI client.
   * @param correlationId - Optional ID for logging.
   * @returns An instance of the GoogleGenAI client.
   */
  private async getClient(correlationId?: string): Promise<GoogleGenAI> {
    if (genAI) return genAI;
    const apiKey = await this.getApiKey(correlationId);
    genAI = new GoogleGenAI({ apiKey });
    return genAI;
  }

  /**
   * Generates content using a Gemini model, adhering to the standardized LlmProviderAdapter interface.
   * @param request - The standardized LlmGenerationRequest object.
   * @returns A promise that resolves to a standardized LlmGenerationResponse object.
   */
  async generateContent(request: LlmGenerationRequest): Promise<LlmGenerationResponse> {
    const { correlationId, modelId, prompt, temperature, maxOutputTokens, topP, topK, customConfig, jsonOutputMode, seed } = request;

    log_debug('GeminiAdapter: Exact prompt being sent to Gemini API', { promptPreview: prompt.substring(0, 200000) }, correlationId);

    try {
      const client = await this.getClient(correlationId);
      const safetySettings = (customConfig?.safetySettings as SafetySetting[]) || DEFAULT_SAFETY_SETTINGS;
      
      const generationConfig: GenerateContentConfig = {
        safetySettings,
        candidateCount: 1,
        temperature: temperature ?? 0.6,
        maxOutputTokens: maxOutputTokens ?? 16000,
        topP: topP ?? 0.95,
        topK: topK ?? 40,
        ...(seed !== undefined && { seed }),
        ...(jsonOutputMode && { responseMimeType: "application/json" })
      };
      
      log_info(`GeminiAdapter: Requesting content from model: ${modelId}`, { generationConfig }, correlationId);
      
      const maxRetries = 3;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await client.models.generateContent({
            model: modelId,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: generationConfig
          });

          // Handle safety-blocked prompt
          if (response.promptFeedback?.blockReason) {
            log_warn('Gemini prompt was blocked by provider safety filters.', { feedback: response.promptFeedback }, correlationId);
            return {
              success: false,
              provider: LLMProviderType.GEMINI,
              modelUsed: modelId,
              responseText: null,
              safetyFlagged: true,
              safetyDetails: response.promptFeedback,
              errorMessage: `Prompt blocked by provider: ${response.promptFeedback.blockReason}`,
            };
          }

          const candidate = response.candidates?.[0];
          if (!candidate) {
            log_warn('No candidates returned from Gemini API.', { providerResponse: response }, correlationId);
            return { success: false, provider: LLMProviderType.GEMINI, modelUsed: modelId, responseText: null, errorMessage: 'No candidates returned from Gemini.' };
          }
          
          // Handle safety-blocked response
          if (candidate.finishReason === 'SAFETY') {
            log_warn('Gemini response was blocked by provider safety filters.', { candidate }, correlationId);
            return {
              success: false,
              provider: LLMProviderType.GEMINI,
              modelUsed: modelId,
              responseText: null,
              safetyFlagged: true,
              safetyDetails: { finishReason: candidate.finishReason, safetyRatings: candidate.safetyRatings },
              errorMessage: 'Response candidate blocked by provider safety filters.',
            };
          }

          const textContent = response.text; //candidate.content?.parts?.map((p: Part) => p.text).join('') || "";

          log_info(`GeminiAdapter: Successfully received response from ${modelId}`, { finishReason: candidate.finishReason }, correlationId);

          if (!textContent) {
            throw new Error("No content received from Gemini.");
          }

          // If successful, return the result immediately
          return {
            success: true,
            provider: LLMProviderType.GEMINI,
            modelUsed: modelId,
            responseText: textContent,
            tokenUsage: {
              inputTokens: response.usageMetadata?.promptTokenCount || 0,
              outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
            },
          };

        } catch (error: any) {
          lastError = error; // Save the last error for final reporting
          
          const status = error.cause?.['status'] ?? error.httpStatus;
          const isRateLimit = status === 429;
          const isServerError = status >= 500;
          // Add a check to see if the error is our "no content" error
          const isNoContentError = error.message === "No content received from Gemini.";

          if ((isRateLimit || isServerError || isNoContentError) && attempt < maxRetries) {
            const delaySeconds = Math.pow(2, attempt) + Math.random(); // Exponential backoff
            
            if (isNoContentError) {
              log_warn(`Gemini API returned no content. Retrying in ${delaySeconds.toFixed(1)}s.`, { attempt }, correlationId);
            } else if (isRateLimit) {
              log_warn(`Gemini API rate limit hit (429). Retrying in ${delaySeconds.toFixed(30)}s.`, { attempt }, correlationId);
            } else { // isServerError
              log_warn(`Gemini API server error (${status}). Retrying in ${delaySeconds.toFixed(5)}s.`, { attempt, error: error.message }, correlationId);
            }
            
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            continue; // Proceed to the next attempt
          }
          
          // If it's not a retryable error or retries are exhausted, break the loop and fail.
          break;
        }
      }

      // If loop finished due to error, lastError will be set.
      const httpStatus = lastError.cause?.['status'] ?? lastError.httpStatus;
      log_error('GeminiAdapter failed to generate content after all retries', { error: lastError.message, stack: lastError.stack, totalAttempts: maxRetries, httpStatus }, correlationId);
      return {
        success: false,
        provider: LLMProviderType.GEMINI,
        modelUsed: modelId,
        responseText: null,
        errorMessage: `Gemini API Error after ${maxRetries} attempts: ${lastError.message}`,
        errorDetails: { name: lastError.name, httpStatus, cause: lastError.cause },
      };

    } catch (error: any) {
      // This outer catch handles initial setup errors (e.g., getting API key)
      log_error('GeminiAdapter failed before making an API call', { error: error.message, stack: error.stack }, correlationId);
      return {
        success: false,
        provider: LLMProviderType.GEMINI,
        modelUsed: modelId,
        responseText: null,
        errorMessage: `Gemini Adapter Setup Error: ${error.message}`,
        errorDetails: { name: error.name, cause: error.cause },
      };
    }
  }
}
