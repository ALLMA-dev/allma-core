import { vi, describe, it, expect, beforeEach } from 'vitest';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  StepType,
  SfnActionType,
  AggregationStrategy,
  type AggregationConfig,
  type BranchResult,
  type FlowDefinition,
  type ProcessorInput,
  type StepInstance,
} from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeFlowDefinition, makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

// The execution-traces bucket name is read at import time.
vi.hoisted(() => {
  process.env.ALLMA_EXECUTION_TRACES_BUCKET_NAME = 'traces-bucket';
});

vi.mock('../../../../src/allma-core/execution-logger-client.js', () => ({
  executionLoggerClient: { logStepExecution: vi.fn().mockResolvedValue(undefined) },
}));

const { handleParallelFork, handleParallelAggregation } = await import(
  '../../../../src/allma-flows/iterative-step-processor/parallel-handler.js'
);
const { executionLoggerClient } = await import(
  '../../../../src/allma-core/execution-logger-client.js'
);
const mockedLogger = vi.mocked(executionLoggerClient);

const s3Mock = mockClient(S3Client);

const stubS3Json = (payload: unknown): void => {
  s3Mock.on(GetObjectCommand).resolves({
    ContentType: 'application/json',
    ContentLength: 10,
    Body: { transformToString: async () => JSON.stringify(payload) },
  } as never);
};

beforeEach(() => {
  resetAwsClientMocks(s3Mock);
  s3Mock.on(PutObjectCommand).resolves({});
});

const forkStep = (overrides: Record<string, unknown> = {}): StepInstance =>
  makeStepInstance({
    stepInstanceId: 'parallel',
    stepType: StepType.PARALLEL_FORK_MANAGER,
    itemsPath: '$.items',
    parallelBranches: [{ branchId: 'br1', startStepInstanceId: 'b-start' }],
    ...overrides,
  } as Partial<StepInstance>);

describe('handleParallelFork', () => {
  it('forks one branch per item and returns a PARALLEL_FORK action', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: { items: [{ n: 1 }, { n: 2 }] } });

    const output = await handleParallelFork(forkStep(), runtimeState, 'corr');

    expect(output?.sfnAction).toBe(SfnActionType.PARALLEL_FORK);
    expect(output?.parallelForkInput?.branchesToExecute).toHaveLength(2);
    expect(output?.parallelForkInput?.originalStepInstanceId).toBe('parallel');
  });

  it('skips branches whose condition is not met', async () => {
    const step = forkStep({
      parallelBranches: [{ branchId: 'br1', startStepInstanceId: 'b', condition: '$.currentItem.ok' }],
    });
    const runtimeState = makeRuntimeState({ currentContextData: { items: [{ ok: true }, { ok: false }] } });

    const output = await handleParallelFork(step, runtimeState, 'corr');

    expect(output?.parallelForkInput?.branchesToExecute).toHaveLength(1);
  });

  it('returns null when the items path resolves to an empty array', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: { items: [] } });
    expect(await handleParallelFork(forkStep(), runtimeState, 'corr')).toBeNull();
  });

  it('returns null when no parallel branches are defined', async () => {
    const step = forkStep({ parallelBranches: [] });
    const runtimeState = makeRuntimeState({ currentContextData: { items: [{ n: 1 }] } });
    expect(await handleParallelFork(step, runtimeState, 'corr')).toBeNull();
  });

  it('throws when itemsPath is missing', async () => {
    const step = forkStep({ itemsPath: undefined });
    const runtimeState = makeRuntimeState({ currentContextData: { items: [{ n: 1 }] } });
    await expect(handleParallelFork(step, runtimeState, 'corr')).rejects.toThrow(/itemsPath/);
  });

  it('offloads a large branch item to S3 and passes a pointer in the branch input', async () => {
    const bigItem = { blob: 'x'.repeat(11 * 1024) };
    const runtimeState = makeRuntimeState({ currentContextData: { items: [bigItem] } });

    const output = await handleParallelFork(forkStep(), runtimeState, 'corr');

    expect(s3Mock).toHaveReceivedCommand(PutObjectCommand);
    const branchInput = output?.parallelForkInput?.branchesToExecute[0].branchInput as Record<string, any>;
    expect(branchInput.currentItem).toHaveProperty('_s3_output_pointer');
  });

  it('logs a COMPLETED fork record when execution logging is enabled', async () => {
    const runtimeState = makeRuntimeState({ enableExecutionLogs: true, currentContextData: { items: [{ n: 1 }] } });

    await handleParallelFork(forkStep(), runtimeState, 'corr');

    expect(mockedLogger.logStepExecution).toHaveBeenCalledWith(
      expect.objectContaining({ stepType: 'PARALLEL_FORK_MANAGER', status: 'COMPLETED' }),
    );
  });

  it('logs and returns null when no branches are eligible (logging enabled)', async () => {
    const step = forkStep({
      parallelBranches: [{ branchId: 'br1', startStepInstanceId: 'b', condition: '$.currentItem.ok' }],
    });
    const runtimeState = makeRuntimeState({ enableExecutionLogs: true, currentContextData: { items: [{ ok: false }] } });

    const result = await handleParallelFork(step, runtimeState, 'corr');

    expect(result).toBeNull();
    expect(mockedLogger.logStepExecution).toHaveBeenCalledWith(
      expect.objectContaining({ outputData: expect.objectContaining({ executedBranchCount: 0 }) }),
    );
  });

  it('switches to a Distributed Map manifest when the payload is too large for an inline fork', async () => {
    const runtimeState = makeRuntimeState({
      currentContextData: { items: [{ n: 1 }], filler: 'x'.repeat(120 * 1024) },
    });

    const output = await handleParallelFork(forkStep(), runtimeState, 'corr');

    expect(output?.sfnAction).toBe(SfnActionType.PARALLEL_FORK_S3);
    expect(output?.s3ItemReader?.key).toMatch(/manifests\//);
    expect(s3Mock).toHaveReceivedCommand(PutObjectCommand);
  });
});

describe('handleParallelAggregation', () => {
  const flow = (overrides: Partial<StepInstance> = {}): FlowDefinition =>
    makeFlowDefinition({
      steps: {
        parallel: makeStepInstance({
          stepInstanceId: 'parallel',
          stepType: StepType.PARALLEL_FORK_MANAGER,
          ...overrides,
        } as Partial<StepInstance>),
      },
    });

  const aggInput = (
    branchOutputs: BranchResult[],
    aggregationConfig: AggregationConfig,
  ): Exclude<ProcessorInput['parallelAggregateInput'], undefined> =>
    ({ originalStepInstanceId: 'parallel', aggregationConfig, branchOutputs }) as never;

  const collect: AggregationConfig = {
    strategy: AggregationStrategy.COLLECT_ARRAY,
    failOnBranchError: true,
    maxConcurrency: 0,
  };

  it('collects successful branch outputs into an array under the default mapping', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const input = aggInput(
      [
        { branchId: 'b1', output: { v: 1 } },
        { branchId: 'b2', output: { v: 2 } },
      ] as BranchResult[],
      collect,
    );

    const { updatedRuntimeState, nextStepId } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    expect(nextStepId).toBeUndefined();
    expect(updatedRuntimeState.currentContextData.steps_output.parallel.aggregatedData).toEqual([
      { v: 1 },
      { v: 2 },
    ]);
  });

  it('merges branch objects with the MERGE_OBJECTS strategy', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const input = aggInput(
      [
        { branchId: 'b1', output: { a: 1 } },
        { branchId: 'b2', output: { b: 2 } },
      ] as BranchResult[],
      { ...collect, strategy: AggregationStrategy.MERGE_OBJECTS },
    );

    const { updatedRuntimeState } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    expect(updatedRuntimeState.currentContextData.steps_output.parallel.aggregatedData).toEqual({ a: 1, b: 2 });
  });

  it('sums numeric branch outputs with the SUM strategy', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const input = aggInput(
      [
        { branchId: 'b1', output: 3 },
        { branchId: 'b2', output: 4 },
      ] as BranchResult[],
      { ...collect, strategy: AggregationStrategy.SUM },
    );

    const { updatedRuntimeState } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    expect(updatedRuntimeState.currentContextData.steps_output.parallel.aggregatedData).toBe(7);
  });

  it('fails the flow when a branch errors and failOnBranchError is true', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const input = aggInput(
      [{ branchId: 'b1', error: { errorName: 'X', errorMessage: 'branch boom', isRetryable: false } }] as BranchResult[],
      collect,
    );

    const { updatedRuntimeState, nextStepId } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    expect(updatedRuntimeState.status).toBe('FAILED');
    expect(updatedRuntimeState.errorInfo?.errorName).toBe('ParallelBranchExecutionError');
    expect(nextStepId).toBeUndefined();
  });

  it('preserves branch errors in the array when failOnBranchError is false', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const input = aggInput(
      [
        { branchId: 'b1', output: { v: 1 } },
        { branchId: 'b2', error: { errorName: 'X', errorMessage: 'soft', isRetryable: false } },
      ] as BranchResult[],
      { ...collect, failOnBranchError: false },
    );

    const { updatedRuntimeState } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    const aggregated = updatedRuntimeState.currentContextData.steps_output.parallel.aggregatedData;
    expect(aggregated).toHaveLength(2);
    expect(aggregated[1]).toMatchObject({ branchId: 'b2', error: { errorMessage: 'soft' } });
  });

  it('unwraps a branch finalContextData before aggregating', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const input = aggInput(
      [{ branchId: 'b1', output: { status: 'COMPLETED', finalContextData: { result: 'r' } } }] as BranchResult[],
      collect,
    );

    const { updatedRuntimeState } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    expect(updatedRuntimeState.currentContextData.steps_output.parallel.aggregatedData).toEqual([{ result: 'r' }]);
  });

  it('force-offloads the aggregated result to S3 when forceS3Offload is set', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const input = aggInput([{ branchId: 'b1', output: { v: 1 } }] as BranchResult[], collect);

    await handleParallelAggregation(input, runtimeState, flow({ forceS3Offload: true }), 'corr');

    expect(s3Mock).toHaveReceivedCommand(PutObjectCommand);
  });

  it('logs a FAILED aggregator record when logging is enabled and a branch fails', async () => {
    const runtimeState = makeRuntimeState({ enableExecutionLogs: true, currentContextData: {} });
    const input = aggInput(
      [{ branchId: 'b1', error: { errorName: 'X', errorMessage: 'boom', isRetryable: false } }] as BranchResult[],
      collect,
    );

    await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    expect(mockedLogger.logStepExecution).toHaveBeenCalledWith(
      expect.objectContaining({ stepType: 'PARALLEL_AGGREGATOR', status: 'FAILED' }),
    );
  });

  it('logs a COMPLETED aggregator record when logging is enabled', async () => {
    const runtimeState = makeRuntimeState({ enableExecutionLogs: true, currentContextData: {} });
    const input = aggInput([{ branchId: 'b1', output: { v: 1 } }] as BranchResult[], collect);

    await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    expect(mockedLogger.logStepExecution).toHaveBeenCalledWith(
      expect.objectContaining({ stepType: 'PARALLEL_AGGREGATOR', status: 'COMPLETED' }),
    );
  });

  it('resolves an S3-pointer branch context before aggregating', async () => {
    stubS3Json({ resolved: true });
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const input = aggInput(
      [{ branchId: 'b1', output: { status: 'COMPLETED', finalContextDataS3Pointer: { bucket: 'b', key: 'k' } } }] as BranchResult[],
      collect,
    );

    const { updatedRuntimeState } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    expect(s3Mock).toHaveReceivedCommand(GetObjectCommand);
    expect(updatedRuntimeState.currentContextData.steps_output.parallel.aggregatedData).toEqual([{ resolved: true }]);
  });

  it('extracts aggregationConfig.dataPath from each branch during resolution', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const input = aggInput(
      [
        { branchId: 'b1', output: { a: { b: 5 }, noise: 'drop-me' } },
        { branchId: 'b2', output: { a: { b: 6 }, noise: 'drop-me' } },
      ] as BranchResult[],
      { ...collect, dataPath: '$.a.b' } as AggregationConfig,
    );

    const { updatedRuntimeState } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    // Only the extracted values are collected — the surrounding branch data is dropped.
    expect(updatedRuntimeState.currentContextData.steps_output.parallel.aggregatedData).toEqual([5, 6]);
  });

  it('applies dataPath to an S3-offloaded branch context, collecting only the small extracted value', async () => {
    // The branch offloaded its whole context to S3; with a dataPath only the classification result is
    // collected, so the large context is extracted-and-released rather than retained in the array.
    stubS3Json({ steps_output: { classify: { result: 'CATEGORY_A' } }, huge: 'x'.repeat(50 * 1024) });
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const input = aggInput(
      [{ branchId: 'b1', output: { status: 'COMPLETED', finalContextDataS3Pointer: { bucket: 'b', key: 'k' } } }] as BranchResult[],
      { ...collect, dataPath: '$.steps_output.classify.result' } as AggregationConfig,
    );

    const { updatedRuntimeState } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    expect(s3Mock).toHaveReceivedCommand(GetObjectCommand);
    expect(updatedRuntimeState.currentContextData.steps_output.parallel.aggregatedData).toEqual(['CATEGORY_A']);
  });

  it('preserves branch order when resolving many branches under bounded concurrency', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const branchOutputs = Array.from({ length: 50 }, (_, i) => ({ branchId: `b${i}`, output: { i } })) as BranchResult[];
    const input = aggInput(branchOutputs, { ...collect, dataPath: '$.i', maxConcurrency: 5 } as AggregationConfig);

    const { updatedRuntimeState } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

    expect(updatedRuntimeState.currentContextData.steps_output.parallel.aggregatedData).toEqual(
      Array.from({ length: 50 }, (_, i) => i),
    );
  });

  describe('NONE strategy (barrier)', () => {
    const none = (failOnBranchError: boolean): AggregationConfig =>
      ({ strategy: AggregationStrategy.NONE, failOnBranchError } as AggregationConfig);

    it('does not resolve/collect branch contexts — writes a small summary and continues', async () => {
      stubS3Json({ shouldNeverBeFetched: true });
      const runtimeState = makeRuntimeState({ currentContextData: {} });
      const input = aggInput(
        [
          { branchId: 'b1', output: { status: 'COMPLETED', finalContextDataS3Pointer: { bucket: 'b', key: 'k1' } } },
          { branchId: 'b2', output: { status: 'COMPLETED', finalContextDataS3Pointer: { bucket: 'b', key: 'k2' } } },
        ] as BranchResult[],
        none(true),
      );

      const { updatedRuntimeState, nextStepId } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

      // No branch context was hydrated from S3 — that is the whole point.
      expect(s3Mock).not.toHaveReceivedCommand(GetObjectCommand);
      expect(updatedRuntimeState.status).not.toBe('FAILED');
      const out = updatedRuntimeState.currentContextData.steps_output.parallel;
      expect(out).toMatchObject({ aggregationSkipped: true, aggregatedData: null, branchCount: 2, failedBranchCount: 0 });
      expect(nextStepId).toBeUndefined(); // flow() has no default transition target
    });

    it('still fails the flow when a branch failed and failOnBranchError is true', async () => {
      const runtimeState = makeRuntimeState({ currentContextData: {} });
      const input = aggInput(
        [
          { branchId: 'b1', output: { status: 'COMPLETED', finalContextDataS3Pointer: { bucket: 'b', key: 'k1' } } },
          { branchId: 'b2', output: { status: 'FAILED', errorInfo: { errorName: 'BranchBoom', errorMessage: 'kaboom', isRetryable: false } } },
        ] as BranchResult[],
        none(true),
      );

      const { updatedRuntimeState } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

      expect(updatedRuntimeState.status).toBe('FAILED');
      expect(updatedRuntimeState.errorInfo?.errorName).toBe('ParallelBranchExecutionError');
      expect(s3Mock).not.toHaveReceivedCommand(GetObjectCommand);
    });

    it('ignores branch failures in fire-and-forget mode (failOnBranchError false)', async () => {
      const runtimeState = makeRuntimeState({ currentContextData: {} });
      const input = aggInput(
        [{ branchId: 'b1', output: { status: 'FAILED', errorInfo: { errorName: 'X', errorMessage: 'ignored', isRetryable: false } } }] as BranchResult[],
        none(false),
      );

      const { updatedRuntimeState } = await handleParallelAggregation(input, runtimeState, flow(), 'corr');

      expect(updatedRuntimeState.status).not.toBe('FAILED');
      expect(updatedRuntimeState.currentContextData.steps_output.parallel).toMatchObject({ aggregationSkipped: true });
    });
  });
});
