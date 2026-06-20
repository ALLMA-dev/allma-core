import { describe, it, expect, beforeEach } from 'vitest';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { TransientStepError } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';
import { executeS3Saver } from '../../../../src/allma-core/data-savers/s3-saver.js';

const s3Mock = mockClient(S3Client);

const getPutBody = (): unknown => s3Mock.commandCalls(PutObjectCommand)[0].args[0].input.Body;

describe('executeS3Saver', () => {
  beforeEach(() => resetAwsClientMocks(s3Mock));

  it('serializes an object payload to pretty JSON and returns the pointer + ETag', async () => {
    s3Mock.on(PutObjectCommand).resolves({ ETag: '"etag1"', VersionId: 'v1' });

    const result = await executeS3Saver(
      {} as never,
      { destinationS3UriTemplate: 's3://my-bucket/out/data.json', contentToSave: { a: 1 } },
      makeRuntimeState()
    );

    expect(result.outputData).toMatchObject({
      s3Uri: 's3://my-bucket/out/data.json',
      bucket: 'my-bucket',
      key: 'out/data.json',
      eTag: '"etag1"',
      versionId: 'v1',
    });
    expect(getPutBody()).toBe(JSON.stringify({ a: 1 }, null, 2));
    expect(s3Mock).toHaveReceivedCommandWith(PutObjectCommand, { Bucket: 'my-bucket', Key: 'out/data.json' });
  });

  it('writes a text-based string payload verbatim', async () => {
    s3Mock.on(PutObjectCommand).resolves({});

    await executeS3Saver(
      {} as never,
      { destinationS3UriTemplate: 's3://b/k.txt', contentType: 'text/plain', contentToSave: 'hello' },
      makeRuntimeState()
    );

    expect(getPutBody()).toBe('hello');
  });

  it('base64-decodes a string payload when the content type is binary', async () => {
    s3Mock.on(PutObjectCommand).resolves({});
    const original = 'binary-bytes';
    const base64 = Buffer.from(original).toString('base64');

    await executeS3Saver(
      {} as never,
      { destinationS3UriTemplate: 's3://b/k.bin', contentType: 'application/octet-stream', contentToSave: base64 },
      makeRuntimeState()
    );

    expect(Buffer.isBuffer(getPutBody())).toBe(true);
    expect((getPutBody() as Buffer).toString()).toBe(original);
  });

  it('throws when contentToSave is undefined', async () => {
    await expect(
      executeS3Saver(
        {} as never,
        { destinationS3UriTemplate: 's3://b/k', contentToSave: undefined },
        makeRuntimeState()
      )
    ).rejects.toThrow('Nothing to save');
  });

  it('rejects a malformed destination URI', async () => {
    await expect(
      executeS3Saver(
        {} as never,
        { destinationS3UriTemplate: 's3://only-bucket', contentToSave: 'x' },
        makeRuntimeState()
      )
    ).rejects.toThrow('Invalid S3 URI format');
  });

  it('maps a transient S3 error to a TransientStepError', async () => {
    s3Mock.on(PutObjectCommand).rejects(Object.assign(new Error('busy'), { name: 'ThrottlingException' }));

    await expect(
      executeS3Saver(
        {} as never,
        { destinationS3UriTemplate: 's3://b/k.json', contentToSave: { a: 1 } },
        makeRuntimeState()
      )
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('rejects input whose destination is not an s3:// URI', async () => {
    await expect(
      executeS3Saver({} as never, { destinationS3UriTemplate: 'https://x', contentToSave: 'x' }, makeRuntimeState())
    ).rejects.toThrow('Invalid input for S3 Saver');
  });
});
