import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  LLMProviderType,
  StepType,
  ContentBasedRetryableError,
  type StepDefinition,
  type LlmGenerationResponse,
  type PromptTemplate,
} from '@allma/core-types';

// Collaborators are mocked at the module boundary (both are non-AWS): the adapter registry
// returns a fake adapter, and config-loader returns an in-memory prompt template. This keeps
// the handler hermetic without standing up DynamoDB or any real LLM provider.
vi.mock('../../../../src/allma-core/llm-adapters/adapter-registry.js');
vi.mock('../../../../src/allma-core/config-loader.js');

import { handleLlmInvocation } from '../../../../src/allma-core/step-handlers/llm-invocation-handler.js';
import * as adapterRegistry from '../../../../src/allma-core/llm-adapters/adapter-registry.js';
import * as configLoader from '../../../../src/allma-core/config-loader.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

const mockedGetLlmAdapter = vi.mocked(adapterRegistry.getLlmAdapter);
const mockedLoadPromptTemplate = vi.mocked(configLoader.loadPromptTemplate);

const PROMPT_CONTENT = 'Hello, {{name}}! The secret code is {{secret_code}}.';

const makePromptTemplate = (overrides: Partial<PromptTemplate> = {}): PromptTemplate => ({
  id: 'prompt-1',
  name: 'Greeting',
  content: PROMPT_CONTENT,
  version: 1,
  isPublished: true,
  publishedAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  tags: ['test'],
  ...overrides,
});

/** Build a schema-valid LLM_INVOCATION step definition. */
const makeLlmStepDef = (overrides: Partial<StepDefinition> = {}): StepDefinition => {
  const now = '2024-01-01T00:00:00.000Z';
  return {
    id: 'llm-step',
    name: 'LLM Step',
    stepType: StepType.LLM_INVOCATION,
    llmProvider: LLMProviderType.GEMINI,
    modelId: 'gemini-1.5-flash',
    promptTemplateId: 'prompt-1',
    createdAt: now,
    updatedAt: now,
    version: 1,
    description: 'test',
    isPublished: true,
    tags: [],
    publishedAt: now,
    ...overrides,
  } as StepDefinition;
};

/** Register an adapter whose generateContent resolves the given queued responses in order. */
const stubAdapter = (...responses: Array<Partial<LlmGenerationResponse>>): ReturnType<typeof vi.fn> => {
  const generateContent = vi.fn();
  for (const r of responses) {
    generateContent.mockResolvedValueOnce({
      success: true,
      provider: LLMProviderType.GEMINI,
      modelUsed: 'gemini-1.5-flash',
      ...r,
    });
  }
  mockedGetLlmAdapter.mockReturnValue({ generateContent } as never);
  return generateContent;
};

describe('handleLlmInvocation', () => {
  beforeEach(() => {
    mockedGetLlmAdapter.mockReset();
    mockedLoadPromptTemplate.mockReset();
    mockedLoadPromptTemplate.mockResolvedValue(makePromptTemplate());
  });

  it('renders the template and returns a string response wrapped under llm_response', async () => {
    const generateContent = stubAdapter({
      responseText: 'This is a simple text response.',
      tokenUsage: { inputTokens: 10, outputTokens: 5 },
    });

    const result = await handleLlmInvocation(
      makeLlmStepDef(),
      { name: 'world', secret_code: 'alpha' },
      makeRuntimeState()
    );

    expect(result.outputData).toMatchObject({ llm_response: 'This is a simple text response.' });
    expect(mockedGetLlmAdapter).toHaveBeenCalledWith(LLMProviderType.GEMINI);
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'Hello, world! The secret code is alpha.' })
    );
    // _meta carries the raw response and rendered prompt for trace logging.
    expect(result.outputData!._meta).toMatchObject({
      llmPrompt: 'Hello, world! The secret code is alpha.',
      llmRawResponse: 'This is a simple text response.',
    });
  });

  it('parses a valid JSON response and spreads it into outputData when jsonOutputMode is on', async () => {
    stubAdapter({ responseText: JSON.stringify({ greeting: 'Hello', target: 'JSON' }) });

    const result = await handleLlmInvocation(
      makeLlmStepDef({ customConfig: { jsonOutputMode: true } } as Partial<StepDefinition>),
      {},
      makeRuntimeState()
    );

    expect(result.outputData).toMatchObject({ greeting: 'Hello', target: 'JSON' });
  });

  it('wraps a JSON array response under llm_response so spreads do not destroy it', async () => {
    stubAdapter({ responseText: JSON.stringify([1, 2, 3]) });

    const result = await handleLlmInvocation(
      makeLlmStepDef({ customConfig: { jsonOutputMode: true } } as Partial<StepDefinition>),
      {},
      makeRuntimeState()
    );

    expect(result.outputData!.llm_response).toEqual([1, 2, 3]);
  });

  it('throws ContentBasedRetryableError when jsonOutputMode is on but the response is malformed', async () => {
    stubAdapter({ responseText: '{greeting" -- "Hello", target "JSON"' });

    const promise = handleLlmInvocation(
      makeLlmStepDef({
        modelId: 'gemini-malformed',
        customConfig: { jsonOutputMode: true },
      } as Partial<StepDefinition>),
      {},
      makeRuntimeState()
    );

    await expect(promise).rejects.toBeInstanceOf(ContentBasedRetryableError);
    await expect(promise).rejects.toThrow('Failed to parse LLM response as JSON');
  });

  it('falls back to the next model when the adapter reports a failure', async () => {
    const generateContent = vi.fn();
    generateContent
      .mockResolvedValueOnce({ success: false, errorMessage: 'primary down' })
      .mockResolvedValueOnce({
        success: true,
        provider: LLMProviderType.GEMINI,
        modelUsed: 'fallback-model',
        responseText: 'recovered',
      });
    mockedGetLlmAdapter.mockReturnValue({ generateContent } as never);

    const result = await handleLlmInvocation(
      makeLlmStepDef({
        modelId: 'primary-fail',
        fallbacks: [{ llmProvider: LLMProviderType.GEMINI, modelId: 'fallback-ok' }],
      } as Partial<StepDefinition>),
      {},
      makeRuntimeState()
    );

    expect(result.outputData).toMatchObject({ llm_response: 'recovered' });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('throws the last error when every configured model fails', async () => {
    const generateContent = vi.fn().mockResolvedValue({ success: false, errorMessage: 'all dead' });
    mockedGetLlmAdapter.mockReturnValue({ generateContent } as never);

    await expect(
      handleLlmInvocation(
        makeLlmStepDef({ modelId: 'always-fail-unique' } as Partial<StepDefinition>),
        {},
        makeRuntimeState()
      )
    ).rejects.toThrow('all dead');
  });

  it('resolves static base64 media attachments and passes them to the adapter', async () => {
    const generateContent = stubAdapter({ responseText: 'saw the image' });

    const result = await handleLlmInvocation(
      makeLlmStepDef({
        mediaAttachments: [{ base64: 'AAAA', mimeType: 'image/png' }],
      } as Partial<StepDefinition>),
      {},
      makeRuntimeState()
    );

    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        media: [{ kind: 'IMAGE', mimeType: 'image/png', data: 'AAAA' }],
      })
    );
    // _meta must carry only a summary of the media, never the raw base64.
    const loggedMedia = (result.outputData!._meta as { llmInvocationParameters: { media?: unknown } })
      .llmInvocationParameters.media;
    expect(loggedMedia).toEqual({ count: 1, mimeTypes: ['image/png'] });
    expect(JSON.stringify(result.outputData)).not.toContain('AAAA');
  });

  it('resolves dynamic media attachments from a JSONPath in the context', async () => {
    const generateContent = stubAdapter({ responseText: 'ok' });

    await handleLlmInvocation(
      makeLlmStepDef({
        mediaAttachmentsPath: '$.currentContextData.assets',
      } as Partial<StepDefinition>),
      {},
      makeRuntimeState({
        currentContextData: { assets: [{ base64: 'BBBB', mimeType: 'application/pdf' }] },
      })
    );

    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        media: [{ kind: 'DOCUMENT', mimeType: 'application/pdf', data: 'BBBB' }],
      })
    );
  });

  it('does not set a media field when no attachments are configured', async () => {
    const generateContent = stubAdapter({ responseText: 'ok' });

    await handleLlmInvocation(makeLlmStepDef(), {}, makeRuntimeState());

    expect(generateContent.mock.calls[0][0]).not.toHaveProperty('media');
  });

  it('rejects a structurally invalid step definition', async () => {
    await expect(
      handleLlmInvocation({ stepType: StepType.LLM_INVOCATION } as never, {}, makeRuntimeState())
    ).rejects.toThrow('Invalid StepDefinition for LLM_INVOCATION.');
  });

  it('throws when the loaded prompt template has no content', async () => {
    mockedLoadPromptTemplate.mockResolvedValue(makePromptTemplate({ content: '' }));
    stubAdapter({ responseText: 'unused' });

    await expect(
      handleLlmInvocation(makeLlmStepDef(), {}, makeRuntimeState())
    ).rejects.toThrow('has no content');
  });

  describe('model selection templating', () => {
    it('resolves templated modelId and llmProvider from the flow context', async () => {
      const generateContent = stubAdapter({ responseText: 'ok' });

      await handleLlmInvocation(
        makeLlmStepDef({
          llmProvider: '{{config.providers.primary}}',
          modelId: '{{config.llmModels.bedrockSonnet}}',
        } as unknown as Partial<StepDefinition>),
        {},
        makeRuntimeState({
          currentContextData: {
            config: {
              providers: { primary: LLMProviderType.AWS_BEDROCK },
              llmModels: { bedrockSonnet: 'anthropic.claude-3-sonnet-20240229-v1:0' },
            },
          },
        })
      );

      expect(mockedGetLlmAdapter).toHaveBeenCalledWith(LLMProviderType.AWS_BEDROCK);
      expect(generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: LLMProviderType.AWS_BEDROCK,
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        })
      );
    });

    it('resolves a templated fallback entry from the flow context', async () => {
      const generateContent = vi.fn();
      generateContent
        .mockResolvedValueOnce({ success: false, errorMessage: 'primary down' })
        .mockResolvedValueOnce({
          success: true,
          provider: LLMProviderType.AWS_BEDROCK,
          modelUsed: 'fallback',
          responseText: 'recovered',
        });
      mockedGetLlmAdapter.mockReturnValue({ generateContent } as never);

      const result = await handleLlmInvocation(
        makeLlmStepDef({
          modelId: 'primary-fail',
          fallbacks: [
            {
              llmProvider: '{{flow_variables.fallbackProvider}}',
              modelId: '{{flow_variables.fallbackModel}}',
            },
          ],
        } as unknown as Partial<StepDefinition>),
        {},
        makeRuntimeState({
          currentContextData: {
            flow_variables: {
              fallbackProvider: LLMProviderType.AWS_BEDROCK,
              fallbackModel: 'anthropic.claude-3-haiku-20240307-v1:0',
            },
          },
        })
      );

      expect(result.outputData).toMatchObject({ llm_response: 'recovered' });
      expect(generateContent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          provider: LLMProviderType.AWS_BEDROCK,
          modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        })
      );
    });

    it('passes literal model IDs through unchanged', async () => {
      const generateContent = stubAdapter({ responseText: 'ok' });

      await handleLlmInvocation(
        makeLlmStepDef({
          llmProvider: LLMProviderType.GEMINI,
          modelId: 'gemini-1.5-flash',
        } as Partial<StepDefinition>),
        {},
        makeRuntimeState()
      );

      expect(generateContent).toHaveBeenCalledWith(
        expect.objectContaining({ provider: LLMProviderType.GEMINI, modelId: 'gemini-1.5-flash' })
      );
    });

    it('throws a clear error when a templated modelId resolves to empty', async () => {
      stubAdapter({ responseText: 'unused' });

      await expect(
        handleLlmInvocation(
          makeLlmStepDef({
            modelId: '{{config.llmModels.missing}}',
          } as unknown as Partial<StepDefinition>),
          {},
          makeRuntimeState({ currentContextData: { config: { llmModels: {} } } })
        )
      ).rejects.toThrow('modelId resolved to an empty or non-string value');
    });

    it('throws a clear error when a templated llmProvider resolves to an invalid value', async () => {
      stubAdapter({ responseText: 'unused' });

      await expect(
        handleLlmInvocation(
          makeLlmStepDef({
            llmProvider: '{{config.providers.primary}}',
          } as unknown as Partial<StepDefinition>),
          {},
          makeRuntimeState({ currentContextData: { config: { providers: { primary: 'NOT_A_PROVIDER' } } } })
        )
      ).rejects.toThrow('is not a valid LLM provider');
    });
  });
});
