import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { LLMProviderType, type LlmGenerationRequest } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';

// @google/genai is a third-party SDK, so it is mocked as a collaborator. The secret fetch
// (Secrets Manager) is stubbed at the AWS client layer. The traces/key env var is set before
// import so the adapter can resolve its (mocked) API key.
const generateContentMock = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.AI_API_KEY_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123:secret:gemini';
});

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({ models: { generateContent: generateContentMock } })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  },
  HarmBlockThreshold: { BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE' },
}));

import { GeminiAdapter } from '../../../../src/allma-core/llm-adapters/gemini-adapter.js';

const secretsMock = mockClient(SecretsManagerClient);

const makeRequest = (overrides: Partial<LlmGenerationRequest> = {}): LlmGenerationRequest =>
  ({
    provider: LLMProviderType.GEMINI,
    modelId: 'gemini-1.5-flash',
    prompt: 'Hello',
    correlationId: 'corr-1',
    ...overrides,
  }) as LlmGenerationRequest;

describe('GeminiAdapter.generateContent', () => {
  const adapter = new GeminiAdapter();

  beforeEach(() => {
    resetAwsClientMocks(secretsMock);
    secretsMock
      .on(GetSecretValueCommand)
      .resolves({ SecretString: JSON.stringify({ GeminiApiKey: 'test-key' }) });
    generateContentMock.mockReset();
  });

  it('returns the generated text and token usage on success', async () => {
    generateContentMock.mockResolvedValue({
      text: 'hello world',
      candidates: [{ finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 3 },
    });

    const result = await adapter.generateContent(makeRequest());

    expect(result).toMatchObject({
      success: true,
      provider: LLMProviderType.GEMINI,
      responseText: 'hello world',
      tokenUsage: { inputTokens: 8, outputTokens: 3 },
    });
  });

  it('requests JSON output mode when jsonOutputMode is set', async () => {
    generateContentMock.mockResolvedValue({
      text: '{"a":1}',
      candidates: [{ finishReason: 'STOP' }],
      usageMetadata: {},
    });

    await adapter.generateContent(makeRequest({ jsonOutputMode: true }));

    const passedConfig = generateContentMock.mock.calls[0][0].config;
    expect(passedConfig.responseMimeType).toBe('application/json');
  });

  it('reports a safety-blocked prompt as an unsuccessful, safety-flagged result', async () => {
    generateContentMock.mockResolvedValue({ promptFeedback: { blockReason: 'SAFETY' } });

    const result = await adapter.generateContent(makeRequest());

    expect(result).toMatchObject({ success: false, safetyFlagged: true });
    expect(result.errorMessage).toContain('Prompt blocked by provider');
  });

  it('reports when no candidates are returned', async () => {
    generateContentMock.mockResolvedValue({ candidates: [] });

    const result = await adapter.generateContent(makeRequest());

    expect(result).toMatchObject({ success: false });
    expect(result.errorMessage).toContain('No candidates returned');
  });

  it('reports a safety-blocked response candidate', async () => {
    generateContentMock.mockResolvedValue({ candidates: [{ finishReason: 'SAFETY', safetyRatings: [] }] });

    const result = await adapter.generateContent(makeRequest());

    expect(result).toMatchObject({ success: false, safetyFlagged: true });
  });

  it('fails (without retrying) on a non-retryable API error', async () => {
    generateContentMock.mockRejectedValue(Object.assign(new Error('bad request'), { httpStatus: 400 }));

    const result = await adapter.generateContent(makeRequest());

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('bad request');
    // 400 is not retryable, so only one attempt is made.
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });
});
