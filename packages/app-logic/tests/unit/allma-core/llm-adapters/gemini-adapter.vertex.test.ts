import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { LLMProviderType, type LlmGenerationRequest } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';

// Vertex AI mode is selected via env vars that the adapter reads at import time,
// so they must be set before the module is imported. This lives in its own file
// (separate module registry) to avoid colliding with the API-key-mode suite.
const generateContentMock = vi.hoisted(() => vi.fn());
const googleGenAiCtor = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.GEMINI_USE_VERTEX = 'true';
  process.env.GCP_PROJECT_ID = 'my-gcp-project';
  process.env.GCP_LOCATION = 'us-central1';
  process.env.GCP_SA_KEY_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123:secret:gcp-sa-key';
});

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation((opts: unknown) => {
    googleGenAiCtor(opts);
    return { models: { generateContent: generateContentMock } };
  }),
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
    modelId: 'gemini-2.0-flash',
    prompt: 'Hello',
    correlationId: 'corr-vertex',
    ...overrides,
  }) as LlmGenerationRequest;

describe('GeminiAdapter (Vertex AI mode)', () => {
  const adapter = new GeminiAdapter();

  beforeEach(() => {
    resetAwsClientMocks(secretsMock);
    secretsMock.on(GetSecretValueCommand).resolves({
      SecretString: JSON.stringify({ client_email: 'sa@my-gcp-project.iam.gserviceaccount.com', private_key: 'PEM' }),
    });
    generateContentMock.mockReset();
    googleGenAiCtor.mockReset();
  });

  it('constructs a Vertex client with project/location and service-account credentials', async () => {
    generateContentMock.mockResolvedValue({
      text: 'hi from vertex',
      candidates: [{ finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2 },
    });

    const result = await adapter.generateContent(makeRequest());

    expect(result).toMatchObject({ success: true, responseText: 'hi from vertex' });
    expect(googleGenAiCtor).toHaveBeenCalledTimes(1);
    expect(googleGenAiCtor.mock.calls[0][0]).toMatchObject({
      vertexai: true,
      project: 'my-gcp-project',
      location: 'us-central1',
      googleAuthOptions: {
        projectId: 'my-gcp-project',
        credentials: { client_email: 'sa@my-gcp-project.iam.gserviceaccount.com', private_key: 'PEM' },
      },
    });
    // The Vertex client must never be constructed with an apiKey.
    expect(googleGenAiCtor.mock.calls[0][0]).not.toHaveProperty('apiKey');
  });
});
