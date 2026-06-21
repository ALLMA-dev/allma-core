import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { SecurityViolationError } from '@allma/core-types';
import { validateLlmOutput } from '../../../src/allma-core/security-validator.js';
import { getVertexAIEmbeddingsClient } from '../../../src/allma-core/utils/vertexAiClient.js';

/**
 * Unit tests for the LLM output security validator. The forbidden-string checks are pure.
 * The semantic-similarity check depends on the (non-AWS) Vertex AI embeddings client, which
 * is mocked here so embeddings are deterministic and no external service is touched.
 */
vi.mock('../../../src/allma-core/utils/vertexAiClient.js', () => ({
  getVertexAIEmbeddingsClient: vi.fn(),
}));

const mockedGetClient = getVertexAIEmbeddingsClient as Mock;
const cid = 'cid';

/** Mock the embeddings client so embedQuery returns the given vectors in call order. */
const mockEmbeddings = (...vectors: number[][]) => {
  const embedQuery = vi.fn();
  for (const v of vectors) embedQuery.mockResolvedValueOnce(v);
  mockedGetClient.mockResolvedValue({ embedQuery });
  return embedQuery;
};

const promptWithProtectedContent = (text: string) =>
  `<prompt_template><system_configuration><security_configuration><semantic_check>` +
  `<protected_content_source>${text}</protected_content_source>` +
  `</semantic_check></security_configuration></system_configuration></prompt_template>`;

beforeEach(() => {
  mockedGetClient.mockReset();
});

describe('validateLlmOutput — forbidden strings', () => {
  it('passes when no forbidden strings are present', async () => {
    await expect(validateLlmOutput('all good', '', { forbiddenStrings: ['secret'] }, cid)).resolves.toBeUndefined();
  });

  it('throws SecurityViolationError when output contains a forbidden string (case-insensitive)', async () => {
    await expect(
      validateLlmOutput('Here is the SECRET value', '', { forbiddenStrings: ['secret'] }, cid),
    ).rejects.toThrow(SecurityViolationError);
  });

  it('skips non-string entries and still validates the rest', async () => {
    const config = { forbiddenStrings: [123 as unknown as string, 'banned'] };
    await expect(validateLlmOutput('clean output', '', config, cid)).resolves.toBeUndefined();
    await expect(validateLlmOutput('this is banned', '', config, cid)).rejects.toThrow(SecurityViolationError);
  });

  it('passes when no forbidden-string config is provided', async () => {
    await expect(validateLlmOutput('anything', '', {}, cid)).resolves.toBeUndefined();
  });
});

describe('validateLlmOutput — semantic similarity', () => {
  it('skips the check when the prompt has no protected_content_source tag', async () => {
    await expect(
      validateLlmOutput('answer', '<prompt_template></prompt_template>', { semanticCheck: { similarityThreshold: 0.8 } }, cid),
    ).resolves.toBeUndefined();
    expect(mockedGetClient).not.toHaveBeenCalled();
  });

  it('throws when similarity exceeds the threshold', async () => {
    mockEmbeddings([1, 0, 0], [1, 0, 0]); // identical vectors -> cosine 1.0
    await expect(
      validateLlmOutput('leaked', promptWithProtectedContent('secret'), { semanticCheck: { similarityThreshold: 0.8 } }, cid),
    ).rejects.toThrow(SecurityViolationError);
  });

  it('passes when similarity is at or below the threshold', async () => {
    mockEmbeddings([1, 0, 0], [0, 1, 0]); // orthogonal vectors -> cosine 0
    await expect(
      validateLlmOutput('unrelated', promptWithProtectedContent('secret'), { semanticCheck: { similarityThreshold: 0.8 } }, cid),
    ).resolves.toBeUndefined();
  });

  it('fails open (does not throw) when the embeddings client errors', async () => {
    mockedGetClient.mockRejectedValue(new Error('vertex unavailable'));
    await expect(
      validateLlmOutput('answer', promptWithProtectedContent('secret'), { semanticCheck: { similarityThreshold: 0.8 } }, cid),
    ).resolves.toBeUndefined();
  });
});
