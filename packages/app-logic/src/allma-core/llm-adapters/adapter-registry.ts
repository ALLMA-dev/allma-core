import { LLMProviderType, LlmProviderAdapter } from '@allma/core-types';
import { log_error } from '@allma/core-sdk';
import { GeminiAdapter } from './gemini-adapter.js';
import { BedrockAdapter } from './bedrock-adapter.js'; // NEW

// import { OpenAIAdapter } from './openai-adapter.js'; // Future

// Use a singleton pattern for adapter instances to leverage caching (e.g., API keys)
const adapterInstances: Partial<Record<LLMProviderType, LlmProviderAdapter>> = {};

/**
 * Factory function to get an instance of an LLM provider adapter.
 * Caches instances to reuse API keys and clients.
 * @param provider The LLM provider type.
 * @returns An instance of LlmProviderAdapter.
 * @throws An error if the provider is not supported.
 */
export function getLlmAdapter(provider: LLMProviderType): LlmProviderAdapter {
  // Check cache first
  if (adapterInstances[provider]) {
    return adapterInstances[provider]!;
  }

  let adapter: LlmProviderAdapter;

  switch (provider) {
    case LLMProviderType.GEMINI:
      adapter = new GeminiAdapter();
      break;

    // NEW case for AWS Bedrock
    case LLMProviderType.AWS_BEDROCK:
      adapter = new BedrockAdapter();
      break;
    
    // To add a new provider:
    // 1. Create a new `NewProviderAdapter` class.
    // 2. Add a case here to instantiate it.
    // case LLMProviderType.OPENAI:
    //   adapter = new OpenAIAdapter();
    //   break;

    default:
      log_error(`Unsupported LLM provider requested: ${provider}`);
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  // Cache the new instance
  adapterInstances[provider] = adapter;
  return adapter;
}
