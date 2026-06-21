import { describe, it, expect, beforeEach } from 'vitest';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { LLMProviderType, LlmMediaKind, PermanentStepError, TransientStepError, type LlmGenerationRequest } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { BedrockAdapter } from '../../../../src/allma-core/llm-adapters/bedrock-adapter.js';

const bedrockMock = mockClient(BedrockRuntimeClient);
const encode = (obj: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(obj));

const makeRequest = (overrides: Partial<LlmGenerationRequest> = {}): LlmGenerationRequest =>
  ({
    provider: LLMProviderType.AWS_BEDROCK,
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    prompt: 'Hello',
    correlationId: 'corr-1',
    ...overrides,
  }) as LlmGenerationRequest;

const lastSentBody = (): Record<string, unknown> =>
  JSON.parse(bedrockMock.commandCalls(InvokeModelCommand)[0].args[0].input.body as string);

describe('BedrockAdapter.generateContent', () => {
  const adapter = new BedrockAdapter();
  beforeEach(() => resetAwsClientMocks(bedrockMock));

  it('builds an Anthropic payload and parses the Anthropic response shape', async () => {
    bedrockMock.on(InvokeModelCommand).resolves({
      body: encode({ content: [{ text: 'hi there' }], usage: { input_tokens: 11, output_tokens: 4 } }),
    });

    const result = await adapter.generateContent(makeRequest());

    expect(result).toMatchObject({
      success: true,
      provider: LLMProviderType.AWS_BEDROCK,
      responseText: 'hi there',
      tokenUsage: { inputTokens: 11, outputTokens: 4 },
    });
    const body = lastSentBody();
    expect(body.anthropic_version).toBeDefined();
    expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('keeps content as a plain string when no media is attached', async () => {
    bedrockMock.on(InvokeModelCommand).resolves({ body: encode({ content: [{ text: 'x' }], usage: {} }) });

    await adapter.generateContent(makeRequest());

    expect(lastSentBody().messages).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('builds an Anthropic content-block array (image + document) when media is attached', async () => {
    bedrockMock.on(InvokeModelCommand).resolves({ body: encode({ content: [{ text: 'x' }], usage: {} }) });

    await adapter.generateContent(
      makeRequest({
        media: [
          { kind: LlmMediaKind.IMAGE, mimeType: 'image/png', data: 'imgdata' },
          { kind: LlmMediaKind.DOCUMENT, mimeType: 'application/pdf', data: 'pdfdata' },
        ],
      })
    );

    const content = (lastSentBody().messages as Array<{ content: unknown }>)[0].content;
    expect(content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'imgdata' } },
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'pdfdata' } },
      { type: 'text', text: 'Hello' },
    ]);
  });

  it('ignores media for a non-Anthropic Bedrock provider (text only)', async () => {
    bedrockMock.on(InvokeModelCommand).resolves({
      body: encode({ output: { message: { content: [{ text: 'nova' }] } }, usage: {} }),
    });

    const result = await adapter.generateContent(
      makeRequest({
        modelId: 'amazon.nova-pro-v1:0',
        media: [{ kind: LlmMediaKind.IMAGE, mimeType: 'image/png', data: 'imgdata' }],
      })
    );

    expect(result.success).toBe(true);
    const content = (lastSentBody().messages as Array<{ content: unknown }>)[0].content;
    expect(content).toEqual([{ text: 'Hello' }]);
  });

  it('resolves the provider from an inference-profile prefixed model id', async () => {
    bedrockMock.on(InvokeModelCommand).resolves({
      body: encode({ content: [{ text: 'ok' }], usage: {} }),
    });

    const result = await adapter.generateContent(makeRequest({ modelId: 'us.anthropic.claude-3-haiku-v1:0' }));

    expect(result.success).toBe(true);
    expect(result.responseText).toBe('ok');
  });

  it('builds and parses an Amazon (Nova) payload', async () => {
    bedrockMock.on(InvokeModelCommand).resolves({
      body: encode({ output: { message: { content: [{ text: 'nova reply' }] } }, usage: { inputTokens: 3, outputTokens: 2 } }),
    });

    const result = await adapter.generateContent(makeRequest({ modelId: 'amazon.nova-pro-v1:0' }));

    expect(result.responseText).toBe('nova reply');
    expect(lastSentBody().inferenceConfig).toBeDefined();
  });

  it('builds and parses an OpenAI payload', async () => {
    bedrockMock.on(InvokeModelCommand).resolves({
      body: encode({ choices: [{ message: { content: 'gpt reply' } }], usage: { prompt_tokens: 5, completion_tokens: 6 } }),
    });

    const result = await adapter.generateContent(makeRequest({ modelId: 'openai.gpt-4o' }));

    expect(result.responseText).toBe('gpt reply');
    expect(result.tokenUsage).toEqual({ inputTokens: 5, outputTokens: 6 });
  });

  it('returns a payload-construction failure for an unsupported model provider', async () => {
    const result = await adapter.generateContent(makeRequest({ modelId: 'cohere.command-r' }));

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('Payload construction error');
    expect(bedrockMock).toHaveReceivedCommandTimes(InvokeModelCommand, 0);
  });

  it('classifies an AccessDeniedException as a PermanentStepError', async () => {
    bedrockMock.on(InvokeModelCommand).rejects(Object.assign(new Error('denied'), { name: 'AccessDeniedException' }));

    await expect(adapter.generateContent(makeRequest())).rejects.toBeInstanceOf(PermanentStepError);
  });

  it('classifies a ThrottlingException as a TransientStepError', async () => {
    bedrockMock.on(InvokeModelCommand).rejects(Object.assign(new Error('slow'), { name: 'ThrottlingException' }));

    await expect(adapter.generateContent(makeRequest())).rejects.toBeInstanceOf(TransientStepError);
  });

  it('classifies an unknown invocation error as a TransientStepError', async () => {
    bedrockMock.on(InvokeModelCommand).rejects(Object.assign(new Error('weird'), { name: 'SomethingElse' }));

    await expect(adapter.generateContent(makeRequest())).rejects.toBeInstanceOf(TransientStepError);
  });

  it('drops topP when both temperature and topP are supplied (Anthropic forbids both)', async () => {
    bedrockMock.on(InvokeModelCommand).resolves({ body: encode({ content: [{ text: 'x' }], usage: {} }) });

    await adapter.generateContent(makeRequest({ temperature: 0.3, topP: 0.9 }));

    const body = lastSentBody();
    expect(body.temperature).toBe(0.3);
    expect(body.top_p).toBeUndefined();
  });
});
