import { describe, it, expect, afterEach } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { mockClient, resetAwsClientMocks } from './aws-mock.js';
import { makeFlowDefinition, makeRuntimeState, makeStepInstance } from './fixtures.js';
import { captureLogs } from './logger.js';

/**
 * Smoke test for the Phase 0 foundation: confirms aws-sdk-client-mock + its vitest matchers
 * are wired up, the fixtures build valid shapes, and the log capture helper works.
 */
describe('unit test foundation', () => {
  const s3Mock = mockClient(S3Client);
  afterEach(() => resetAwsClientMocks(s3Mock));

  it('intercepts AWS client calls and exposes the custom matchers', async () => {
    s3Mock.on(GetObjectCommand).resolves({});
    const client = new S3Client({});
    await client.send(new GetObjectCommand({ Bucket: 'b', Key: 'k' }));

    expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, { Bucket: 'b', Key: 'k' });
  });

  it('builds valid fixtures', () => {
    expect(makeFlowDefinition().steps['step-1']).toEqual(makeStepInstance());
    expect(makeRuntimeState({ status: 'COMPLETED' }).status).toBe('COMPLETED');
  });

  it('captures structured log entries', () => {
    const logs = captureLogs();
    console.log(JSON.stringify({ level: 'WARN', message: 'hello world' }));
    logs.restore();

    expect(logs.withMessage('hello')).toHaveLength(1);
  });
});
