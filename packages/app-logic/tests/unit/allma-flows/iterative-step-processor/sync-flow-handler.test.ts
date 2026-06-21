import { vi, describe, it, expect, beforeEach } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  StepType,
  SfnActionType,
  type FlowDefinition,
  type ProcessorInput,
  type StepInstance,
} from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeFlowDefinition, makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

vi.mock('../../../../src/allma-core/execution-logger-client.js', () => ({
  executionLoggerClient: { logStepExecution: vi.fn().mockResolvedValue(undefined) },
}));

const { handleSyncFlowStart, handleSyncFlowResult } = await import(
  '../../../../src/allma-flows/iterative-step-processor/sync-flow-handler.js'
);
const { executionLoggerClient } = await import(
  '../../../../src/allma-core/execution-logger-client.js'
);
const mockedLogger = vi.mocked(executionLoggerClient);

const s3Mock = mockClient(S3Client);

/** Stub resolveS3Pointer's GetObject to return JSON. */
const stubS3Json = (payload: unknown): void => {
  s3Mock.on(GetObjectCommand).resolves({
    ContentType: 'application/json',
    ContentLength: 10,
    Body: { transformToString: async () => JSON.stringify(payload) },
  } as never);
};

beforeEach(() => resetAwsClientMocks(s3Mock));

describe('handleSyncFlowStart', () => {
  it('prepares a START_SYNC_FLOW_EXECUTION action with rendered config and mapped context', async () => {
    const step = makeStepInstance({
      stepInstanceId: 'sync_step',
      stepType: StepType.START_FLOW_EXECUTION,
      flowDefinitionId: 'sub-flow',
      customConfig: { sync: true },
      inputMappings: { initialContextData: '$.payload' },
    } as Partial<StepInstance>);
    const runtimeState = makeRuntimeState({
      flowExecutionId: 'parent-exec',
      currentStepInstanceId: 'sync_step',
      currentContextData: { payload: { seed: 1 } },
    });

    const output = await handleSyncFlowStart(step, runtimeState, 'parent-exec');

    expect(output.sfnAction).toBe(SfnActionType.START_SYNC_FLOW_EXECUTION);
    expect(output.syncFlowExecutionInput?.flowDefinitionId).toBe('sub-flow');
    expect(output.syncFlowExecutionInput?.flowVersion).toBe('LATEST_PUBLISHED');
    expect(output.syncFlowExecutionInput?.initialContextData).toEqual({ seed: 1 });
    expect(typeof output.syncFlowExecutionInput?.flowExecutionId).toBe('string');
    // The parent state is returned untouched (the sub-flow has not run yet).
    expect(output.runtimeState).toBe(runtimeState);
  });

  it('renders literals into the sub-flow start input', async () => {
    const step = makeStepInstance({
      stepInstanceId: 'sync_step',
      stepType: StepType.START_FLOW_EXECUTION,
      flowDefinitionId: 'sub-flow',
      customConfig: { sync: true },
      literals: { tag: 'lit-{{payload.seed}}' },
    } as Partial<StepInstance>);
    const runtimeState = makeRuntimeState({ currentContextData: { payload: { seed: 9 } } });

    const output = await handleSyncFlowStart(step, runtimeState, 'parent-exec');

    expect((output.syncFlowExecutionInput as Record<string, unknown>).tag).toBe('lit-9');
  });
});

describe('handleSyncFlowResult', () => {
  const flowWith = (overrides: Partial<StepInstance> = {}): FlowDefinition =>
    makeFlowDefinition({
      steps: {
        sync_step: makeStepInstance({
          stepInstanceId: 'sync_step',
          stepType: StepType.START_FLOW_EXECUTION,
          flowDefinitionId: 'sub-flow',
          ...overrides,
        } as Partial<StepInstance>),
      },
    });

  const resultEvent = (output: unknown): ProcessorInput => ({
    runtimeState: makeRuntimeState({ currentStepInstanceId: 'sync_step', currentContextData: {} }),
    syncFlowResult: { Output: JSON.stringify(output) },
  } as ProcessorInput);

  it('merges a completed sub-flow context under the default mapping', async () => {
    const flow = flowWith();
    const event = resultEvent({ status: 'COMPLETED', finalContextData: { result: 42 } });

    const state = await handleSyncFlowResult(event, event.runtimeState, flow, 'corr');

    expect(state.currentContextData.steps_output.sync_step).toEqual({ result: 42 });
  });

  it('resolves an S3-pointer sub-flow context before merging', async () => {
    stubS3Json({ resolved: true });
    const flow = flowWith();
    const event = resultEvent({
      status: 'COMPLETED',
      finalContextDataS3Pointer: { bucket: 'b', key: 'k' },
    });

    const state = await handleSyncFlowResult(event, event.runtimeState, flow, 'corr');

    expect(s3Mock).toHaveReceivedCommand(GetObjectCommand);
    expect(state.currentContextData.steps_output.sync_step).toEqual({ resolved: true });
  });

  it('logs a COMPLETED step execution record when logging is enabled', async () => {
    const flow = flowWith();
    const runtimeState = makeRuntimeState({
      currentStepInstanceId: 'sync_step',
      currentContextData: {},
      enableExecutionLogs: true,
    });
    const event = { runtimeState, syncFlowResult: { Output: JSON.stringify({ status: 'COMPLETED', finalContextData: { ok: 1 } }) } } as ProcessorInput;

    await handleSyncFlowResult(event, runtimeState, flow, 'corr');

    expect(mockedLogger.logStepExecution).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'COMPLETED', stepInstanceId: 'sync_step' }),
    );
  });

  it('throws when the sub-flow reports a FAILED status', async () => {
    const flow = flowWith();
    const event = resultEvent({ status: 'FAILED', errorInfo: { errorMessage: 'sub boom' } });

    await expect(handleSyncFlowResult(event, event.runtimeState, flow, 'corr')).rejects.toThrow(
      /sub boom/,
    );
  });

  it('throws when the sync flow result is missing its Output', async () => {
    const flow = flowWith();
    const event = { runtimeState: makeRuntimeState({ currentStepInstanceId: 'sync_step' }), syncFlowResult: {} } as ProcessorInput;

    await expect(handleSyncFlowResult(event, event.runtimeState, flow, 'corr')).rejects.toThrow(
      /failed to return a valid output/i,
    );
  });
});
