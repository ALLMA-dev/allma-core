import { describe, it, expect, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { S3DataLoaderOutputFormat, TransientStepError } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';
import { handleS3DataLoader } from '../../../../src/allma-core/data-loaders/s3-loader.js';
import { handleS3ListFiles } from '../../../../src/allma-core/data-loaders/s3-list-files.js';

const s3Mock = mockClient(S3Client);

describe('handleS3DataLoader', () => {
  beforeEach(() => resetAwsClientMocks(s3Mock));

  it('parses an s3:// URI and returns JSON content with metadata', async () => {
    s3Mock.on(GetObjectCommand).resolves({
      Body: Readable.from([Buffer.from(JSON.stringify({ hello: 'world' }))]) as never,
      ContentType: 'application/json',
      ContentLength: 17,
      ETag: '"abc"',
    });

    const result = await handleS3DataLoader(
      {} as never,
      { sourceS3Uri: 's3://my-bucket/data.json', outputFormat: S3DataLoaderOutputFormat.JSON },
      makeRuntimeState()
    );

    expect(result.outputData).toMatchObject({
      content: { hello: 'world' },
      _meta: { found: true, sourceS3Uri: 's3://my-bucket/data.json', contentType: 'application/json' },
    });
    expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, { Bucket: 'my-bucket', Key: 'data.json' });
  });

  it('returns raw text by default', async () => {
    s3Mock.on(GetObjectCommand).resolves({ Body: Readable.from([Buffer.from('plain text')]) as never });

    const result = await handleS3DataLoader({} as never, { sourceS3Uri: 's3://b/k.txt' }, makeRuntimeState());

    expect(result.outputData!.content).toBe('plain text');
  });

  it('rejects a malformed S3 URI', async () => {
    await expect(
      handleS3DataLoader({} as never, { sourceS3Uri: 's3://only-bucket-no-slash' }, makeRuntimeState())
    ).rejects.toThrow(/Invalid stepInput|Invalid S3 URI/);
  });

  it('returns null content when the object is missing and onMissing is IGNORE', async () => {
    s3Mock.on(GetObjectCommand).rejects(Object.assign(new Error('missing'), { name: 'NoSuchKey' }));

    const result = await handleS3DataLoader(
      {} as never,
      { sourceS3Uri: 's3://b/missing.txt', onMissing: 'IGNORE' },
      makeRuntimeState()
    );

    expect(result.outputData).toEqual({ content: null, _meta: { found: false } });
  });

  it('rethrows NoSuchKey when onMissing is FAIL (the default)', async () => {
    s3Mock.on(GetObjectCommand).rejects(Object.assign(new Error('missing'), { name: 'NoSuchKey' }));

    await expect(
      handleS3DataLoader({} as never, { sourceS3Uri: 's3://b/missing.txt' }, makeRuntimeState())
    ).rejects.toThrow('missing');
  });

  it('wraps an unexpected S3 error as a TransientStepError', async () => {
    s3Mock.on(GetObjectCommand).rejects(Object.assign(new Error('boom'), { name: 'InternalError' }));

    await expect(
      handleS3DataLoader({} as never, { sourceS3Uri: 's3://b/k.txt' }, makeRuntimeState())
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('raises an InvalidOutputFormat error for unparseable JSON', async () => {
    s3Mock.on(GetObjectCommand).resolves({ Body: Readable.from([Buffer.from('{not json')]) as never });

    await expect(
      handleS3DataLoader(
        {} as never,
        { sourceS3Uri: 's3://b/k.json', outputFormat: S3DataLoaderOutputFormat.JSON },
        makeRuntimeState()
      )
    ).rejects.toThrow('InvalidOutputFormat');
  });
});

describe('handleS3ListFiles', () => {
  beforeEach(() => resetAwsClientMocks(s3Mock));

  it('lists files across paginated pages and attaches S3 pointer wrappers', async () => {
    s3Mock
      .on(ListObjectsV2Command)
      .resolvesOnce({
        Contents: [{ Key: 'a.txt', Size: 10, ETag: '"a"' }],
        IsTruncated: true,
        NextContinuationToken: 'tok',
      })
      .resolvesOnce({
        Contents: [{ Key: 'b.txt', Size: 20, ETag: '"b"' }],
        IsTruncated: false,
      });

    const result = await handleS3ListFiles({} as never, { bucket: 'my-bucket' }, makeRuntimeState());

    expect(result.outputData!.fileCount).toBe(2);
    expect(result.outputData!.files[1]).toMatchObject({
      key: 'b.txt',
      content: { _s3_output_pointer: { bucket: 'my-bucket', key: 'b.txt' } },
    });
    expect(s3Mock).toHaveReceivedCommandTimes(ListObjectsV2Command, 2);
  });

  it('filters out zero-byte "directory" placeholder objects', async () => {
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [
        { Key: 'dir/', Size: 0 },
        { Key: 'dir/file.txt', Size: 5 },
      ],
      IsTruncated: false,
    });

    const result = await handleS3ListFiles({} as never, { bucket: 'b' }, makeRuntimeState());

    expect(result.outputData!.fileCount).toBe(1);
    expect(result.outputData!.files[0].key).toBe('dir/file.txt');
  });

  it('maps a transient S3 error to a TransientStepError', async () => {
    s3Mock.on(ListObjectsV2Command).rejects(Object.assign(new Error('down'), { name: 'ServiceUnavailable' }));

    await expect(handleS3ListFiles({} as never, { bucket: 'b' }, makeRuntimeState())).rejects.toBeInstanceOf(
      TransientStepError
    );
  });

  it('rejects input with no bucket', async () => {
    await expect(handleS3ListFiles({} as never, {}, makeRuntimeState())).rejects.toThrow(
      'Invalid stepInput for s3-list-files'
    );
  });
});
