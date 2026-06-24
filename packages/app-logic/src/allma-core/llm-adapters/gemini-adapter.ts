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

// --- Vertex AI configuration ---
// When GEMINI_USE_VERTEX is 'true', the adapter talks to Vertex AI (Google IAM /
// OAuth) instead of the key-based Developer API. The same @google/genai SDK
// serves both backends, so only client construction differs.
const useVertex = process.env[ENV_VAR_NAMES.GEMINI_USE_VERTEX] === 'true';
const gcpProjectId = process.env[ENV_VAR_NAMES.GCP_PROJECT_ID];
const gcpLocation = process.env[ENV_VAR_NAMES.GCP_LOCATION];
const gcpSaKeySecretArn = process.env[ENV_VAR_NAMES.GCP_SA_KEY_SECRET_ARN];

let cachedApiKey: string | null = null;
let cachedSaCredentials: { client_email: string; private_key: string } | null = null;
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
   * Retrieves a GCP service-account key (`{ client_email, private_key }`) from
   * AWS Secrets Manager for authenticating to Vertex AI. Cached per execution
   * context. Only used when `GCP_SA_KEY_SECRET_ARN` is configured; otherwise the
   * SDK authenticates via Application Default Credentials / Workload Identity
   * Federation.
   * @param correlationId - Optional ID for logging.
   */
  private async getServiceAccountCredentials(correlationId?: string): Promise<{ client_email: string; private_key: string }> {
    if (cachedSaCredentials) return cachedSaCredentials;
    log_info('Fetching GCP service-account key from Secrets Manager', { secretArn: gcpSaKeySecretArn }, correlationId);
    const command = new GetSecretValueCommand({ SecretId: gcpSaKeySecretArn });
    try {
      const data = await secretsManagerClient.send(command);
      if (data.SecretString) {
        const key = JSON.parse(data.SecretString);
        if (key.client_email && key.private_key) {
          cachedSaCredentials = { client_email: key.client_email, private_key: key.private_key };
          log_info('Successfully fetched and cached GCP service-account key.', {}, correlationId);
          return cachedSaCredentials;
        }
      }
      throw new Error('client_email/private_key not found in the GCP service-account key secret.');
    } catch (error: any) {
      log_error('Failed to retrieve GCP service-account key from Secrets Manager', { error: error.message }, correlationId);
      throw error;
    }
  }

  /**
   * Initializes and returns a singleton instance of the GoogleGenAI client.
   * Constructs a Vertex AI client when `GEMINI_USE_VERTEX` is enabled, otherwise
   * the key-based Gemini Developer API client. All downstream generation logic is
   * identical across both backends.
   * @param correlationId - Optional ID for logging.
   * @returns An instance of the GoogleGenAI client.
   */
  private async getClient(correlationId?: string): Promise<GoogleGenAI> {
    if (genAI) return genAI;

    if (useVertex) {
      if (!gcpProjectId || !gcpLocation) {
        throw new Error('Vertex AI mode (GEMINI_USE_VERTEX=true) requires GCP_PROJECT_ID and GCP_LOCATION to be set.');
      }
      const googleAuthOptions = gcpSaKeySecretArn
        ? { credentials: await this.getServiceAccountCredentials(correlationId), projectId: gcpProjectId }
        : undefined;
      log_info('GeminiAdapter: initializing Vertex AI client', {
        project: gcpProjectId,
        location: gcpLocation,
        auth: gcpSaKeySecretArn ? 'service-account-key' : 'application-default-credentials',
      }, correlationId);
      genAI = new GoogleGenAI({
        vertexai: true,
        project: gcpProjectId,
        location: gcpLocation,
        ...(googleAuthOptions && { googleAuthOptions }),
      });
      return genAI;
    }

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
    const { correlationId, modelId, prompt, media, temperature, maxOutputTokens, topP, topK, customConfig, jsonOutputMode, seed } = request;

    log_debug('GeminiAdapter: Exact prompt being sent to Gemini API', { promptPreview: prompt.substring(0, 200000), mediaCount: media?.length ?? 0 }, correlationId);

    // Media parts (images/PDFs) are sent first, followed by the text prompt.
    const parts = [
      ...(media ?? []).map((m) => ({ inlineData: { mimeType: m.mimeType, data: m.data } })),
      { text: prompt },
    ];

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
            contents: [{ role: "user", parts }],
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
