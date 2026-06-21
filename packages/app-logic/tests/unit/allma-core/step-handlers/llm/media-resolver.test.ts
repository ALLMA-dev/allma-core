import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { LlmMediaKind, PermanentStepError, type LlmMediaAttachment } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../../_helpers/aws-mock.js';
import {
  resolveLlmMedia,
  getMediaAttachmentsConfig,
} from '../../../../../src/allma-core/step-handlers/llm/media-resolver.js';

const s3Mock = mockClient(S3Client);

/** Build an S3 GetObject result whose Body exposes the SDK's transformToByteArray. */
const s3BodyOf = (bytes: number[], contentType?: string) => ({
  Body: { transformToByteArray: async () => new Uint8Array(bytes) } as never,
  ...(contentType !== undefined && { ContentType: contentType }),
});

describe('resolveLlmMedia', () => {
  beforeEach(() => resetAwsClientMocks(s3Mock));
  afterEach(() => vi.unstubAllGlobals());

  it('returns an empty array when there are no attachments', async () => {
    expect(await resolveLlmMedia([])).toEqual([]);
  });

  it('resolves an S3 image to base64, inferring the MIME from ContentType', async () => {
    s3Mock.on(GetObjectCommand).resolves(s3BodyOf([1, 2, 3], 'image/png'));

    const result = await resolveLlmMedia([{ s3Pointer: { bucket: 'b', key: 'pics/cat.png' } }]);

    expect(result).toEqual([
      { kind: LlmMediaKind.IMAGE, mimeType: 'image/png', data: Buffer.from([1, 2, 3]).toString('base64') },
    ]);
  });

  it('falls back to the key extension when S3 ContentType is missing', async () => {
    s3Mock.on(GetObjectCommand).resolves(s3BodyOf([9], undefined));

    const result = await resolveLlmMedia([{ s3Pointer: { bucket: 'b', key: 'docs/report.pdf' } }]);

    expect(result[0]).toMatchObject({ kind: LlmMediaKind.DOCUMENT, mimeType: 'application/pdf' });
  });

  it('prefers an explicit mimeType over the S3 ContentType', async () => {
    s3Mock.on(GetObjectCommand).resolves(s3BodyOf([1], 'application/octet-stream'));

    const result = await resolveLlmMedia([
      { s3Pointer: { bucket: 'b', key: 'blob' }, mimeType: 'image/jpeg' },
    ]);

    expect(result[0].mimeType).toBe('image/jpeg');
  });

  it('fetches a URL and derives the MIME from the content-type header (stripping charset)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/webp; charset=binary' },
      arrayBuffer: async () => new Uint8Array([4, 5]).buffer,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await resolveLlmMedia([{ url: 'https://example.com/a.webp' }]);

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/a.webp');
    expect(result[0]).toMatchObject({ kind: LlmMediaKind.IMAGE, mimeType: 'image/webp' });
  });

  it('throws a PermanentStepError when a URL fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }));

    await expect(resolveLlmMedia([{ url: 'https://example.com/missing.png' }])).rejects.toBeInstanceOf(
      PermanentStepError
    );
  });

  it('passes inline base64 through unchanged', async () => {
    const result = await resolveLlmMedia([{ base64: 'AAAA', mimeType: 'image/gif' }]);

    expect(result).toEqual([{ kind: LlmMediaKind.IMAGE, mimeType: 'image/gif', data: 'AAAA' }]);
  });

  it('throws when an inline base64 attachment has no mimeType', async () => {
    await expect(
      resolveLlmMedia([{ base64: 'AAAA' } as LlmMediaAttachment])
    ).rejects.toThrow('must include an explicit mimeType');
  });

  it('throws a PermanentStepError for an unsupported MIME type', async () => {
    await expect(
      resolveLlmMedia([{ base64: 'AAAA', mimeType: 'video/mp4' }])
    ).rejects.toBeInstanceOf(PermanentStepError);
  });
});

describe('getMediaAttachmentsConfig', () => {
  it('returns the static list when one is provided', () => {
    const list: LlmMediaAttachment[] = [{ base64: 'X', mimeType: 'image/png' }];
    expect(getMediaAttachmentsConfig(list, '$.ignored', {})).toBe(list);
  });

  it('resolves a dynamic JSONPath into a validated list', () => {
    const context = { steps_output: { s1: { images: [{ base64: 'Y', mimeType: 'image/jpeg' }] } } };
    const result = getMediaAttachmentsConfig(undefined, '$.steps_output.s1.images', context);
    expect(result).toEqual([{ base64: 'Y', mimeType: 'image/jpeg' }]);
  });

  it('returns an empty array when neither source is configured', () => {
    expect(getMediaAttachmentsConfig(undefined, undefined, {})).toEqual([]);
  });

  it('returns an empty array when the JSONPath resolves to undefined', () => {
    expect(getMediaAttachmentsConfig(undefined, '$.missing', {})).toEqual([]);
  });

  it('throws a PermanentStepError when the JSONPath data is not a valid attachment array', () => {
    const context = { bad: [{ nope: true }] };
    expect(() => getMediaAttachmentsConfig(undefined, '$.bad', context)).toThrow(PermanentStepError);
  });
});
