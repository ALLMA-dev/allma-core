import { describe, it, expect } from 'vitest';
import { LLMProviderType } from '@allma/core-types';
import { getLlmAdapter } from '../../../../src/allma-core/llm-adapters/adapter-registry.js';
import { GeminiAdapter } from '../../../../src/allma-core/llm-adapters/gemini-adapter.js';
import { BedrockAdapter } from '../../../../src/allma-core/llm-adapters/bedrock-adapter.js';

// The registry is a small caching factory. Constructing the adapters performs no network
// I/O, so this needs no mocking — we only assert the mapping, caching, and failure path.
describe('getLlmAdapter', () => {
  it('returns a GeminiAdapter for the GEMINI provider', () => {
    expect(getLlmAdapter(LLMProviderType.GEMINI)).toBeInstanceOf(GeminiAdapter);
  });

  it('returns a BedrockAdapter for the AWS_BEDROCK provider', () => {
    expect(getLlmAdapter(LLMProviderType.AWS_BEDROCK)).toBeInstanceOf(BedrockAdapter);
  });

  it('caches and returns the same instance on subsequent calls', () => {
    const first = getLlmAdapter(LLMProviderType.GEMINI);
    const second = getLlmAdapter(LLMProviderType.GEMINI);
    expect(second).toBe(first);
  });

  it('throws for an unsupported provider', () => {
    expect(() => getLlmAdapter('NOT_A_PROVIDER' as LLMProviderType)).toThrow(
      'Unsupported LLM provider: NOT_A_PROVIDER'
    );
  });
});
