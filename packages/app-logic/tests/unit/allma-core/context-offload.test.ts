import { describe, it, expect, beforeEach } from 'vitest';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';
import { offloadFlowContextIfLarge, STICKY_CONTEXT_MARKER_KEYS } from '../../../src/allma-core/utils/context-offload.js';

/**
 * Unit tests for the shared flow-context offload helper: it must offload only when over the
 * threshold and, when it does, carry the "sticky" markers (e.g. _flow_resume_key) alongside the
 * pointer so FinalizeFlow can decide whether it needs the full context without hydrating it.
 */

const s3Mock = mockClient(S3Client);

beforeEach(() => {
  resetAwsClientMocks(s3Mock);
  s3Mock.on(PutObjectCommand).resolves({});
});

describe('offloadFlowContextIfLarge', () => {
  it('returns the original object unchanged when under the threshold', async () => {
    const ctx = { a: 1, _flow_resume_key: 'wa:1' };
    const result = await offloadFlowContextIfLarge(ctx, 'bucket', 'prefix', 'cid', 1024 * 1024);
    expect(result).toBe(ctx);
    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
  });

  it('offloads a large context and preserves sticky markers alongside the pointer', async () => {
    const ctx = { blob: 'x'.repeat(2048), _flow_resume_key: 'wa:42' };
    const result = await offloadFlowContextIfLarge(ctx, 'bucket', 'prefix', 'cid', 1024);

    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    expect(result._s3_context_pointer).toMatchObject({ bucket: 'bucket' });
    expect(result._flow_resume_key).toBe('wa:42');
    // The large payload itself is not carried inline — that's the whole point of offloading.
    expect(result.blob).toBeUndefined();
  });

  it('omits sticky markers that are absent from the context', async () => {
    const ctx = { blob: 'x'.repeat(2048) };
    const result = await offloadFlowContextIfLarge(ctx, 'bucket', 'prefix', 'cid', 1024);

    expect(result._s3_context_pointer).toBeDefined();
    for (const key of STICKY_CONTEXT_MARKER_KEYS) {
      expect(key in result).toBe(false);
    }
  });
});
