import { vi, describe, it, expect, beforeEach } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type { ApiCallDefinition } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';
import { makeRuntimeState } from '../_helpers/fixtures.js';

vi.mock('../../../src/allma-core/utils/api-executor.js', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, executeConfiguredApiCall: vi.fn() };
});

const { handler } = await import('../../../src/allma-flows/api-polling.js');
const apiExecutor = await import('../../../src/allma-core/utils/api-executor.js');

const mockedApiCall = vi.mocked(apiExecutor.executeConfiguredApiCall);
const s3Mock = mockClient(S3Client);

const apiCallDefinition = {
  apiUrlTemplate: { template: 'https://poll.test/status' },
  apiHttpMethod: 'GET',
} as unknown as ApiCallDefinition;

const exitConditions = { successCondition: '$.status', failureCondition: '$.error' };

const invoke = (event: unknown) => handler(event as never, {} as never, (() => undefined) as never);

beforeEach(() => {
  resetAwsClientMocks(s3Mock);
  mockedApiCall.mockReset();
});

describe('api-polling handler', () => {
  it('reports the success condition as met when the response matches', async () => {
    mockedApiCall.mockResolvedValue({ data: { status: 'DONE' } } as never);

    const result = await invoke({
      apiCallDefinition,
      exitConditions,
      flowContext: makeRuntimeState({ currentContextData: {} }),
    });

    expect(result.isSuccessConditionMet).toBe(true);
    expect(result.isFailureConditionMet).toBe(false);
    expect(result.responseData).toEqual({ status: 'DONE' });
  });

  it('reports the failure condition as met when the response signals an error', async () => {
    mockedApiCall.mockResolvedValue({ data: { error: 'boom' } } as never);

    const result = await invoke({
      apiCallDefinition,
      exitConditions,
      flowContext: makeRuntimeState({ currentContextData: {} }),
    });

    expect(result.isSuccessConditionMet).toBe(false);
    expect(result.isFailureConditionMet).toBe(true);
  });

  it('hydrates an offloaded S3 context before polling', async () => {
    s3Mock.on(GetObjectCommand).resolves({
      ContentType: 'application/json',
      ContentLength: 10,
      Body: { transformToString: async () => JSON.stringify({ hydrated: true }) },
    } as never);
    mockedApiCall.mockResolvedValue({ data: { status: 'ok' } } as never);

    await invoke({
      apiCallDefinition,
      exitConditions,
      flowContext: makeRuntimeState({ currentContextData: { _s3_context_pointer: { bucket: 'b', key: 'k' } } }),
    });

    expect(s3Mock).toHaveReceivedCommand(GetObjectCommand);
    // The hydrated context is passed through to the API executor's template source.
    const templateSource = mockedApiCall.mock.calls[0][3] as Record<string, unknown>;
    expect(templateSource.hydrated).toBe(true);
  });

  it('rethrows when the polled API call fails', async () => {
    mockedApiCall.mockRejectedValue(new Error('upstream 503'));

    await expect(
      invoke({ apiCallDefinition, exitConditions, flowContext: makeRuntimeState({ currentContextData: {} }) }),
    ).rejects.toThrow('upstream 503');
  });
});
