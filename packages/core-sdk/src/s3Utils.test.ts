import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, { Body: string; ContentType?: string }>();

vi.mock('@aws-sdk/client-s3', () => {
  class PutObjectCommand { constructor(public input: { Key: string; Body: string; ContentType?: string }) {} }
  class GetObjectCommand { constructor(public input: { Key: string }) {} }
  class S3Client {
    async send(cmd: PutObjectCommand | GetObjectCommand) {
      if (cmd instanceof PutObjectCommand) {
        store.set(cmd.input.Key, { Body: cmd.input.Body, ContentType: cmd.input.ContentType });
        return {};
      }
      const obj = store.get(cmd.input.Key)!;
      return { ContentType: obj.ContentType, ContentLength: obj.Body.length, Body: { transformToString: async () => obj.Body } };
    }
  }
  return { S3Client, PutObjectCommand, GetObjectCommand };
});

const { offloadIfLarge, resolveS3Pointer } = await import('./s3Utils.js');

beforeEach(() => {
  store.clear();
  vi.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('offloadIfLarge', () => {
  it('gives concurrent branches offloading at the same step in the same millisecond their own objects', async () => {
    const prefix = 'flow_state/exec-1/step_a';
    const [a, b] = await Promise.all([
      offloadIfLarge({ item: 'branch-a' }, 'bucket', prefix, 'exec-1', 0),
      offloadIfLarge({ item: 'branch-b' }, 'bucket', prefix, 'exec-1', 0),
    ]);

    expect(await resolveS3Pointer((a as any)._s3_output_pointer)).toEqual({ item: 'branch-a' });
    expect(await resolveS3Pointer((b as any)._s3_output_pointer)).toEqual({ item: 'branch-b' });
  });
});
