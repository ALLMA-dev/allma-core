import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  StepType,
  type FlowDefinition,
  type ProcessorInput,
  type StepDefinition,
  type StepInstance,
} from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeFlowDefinition, makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

// The continuation table name is read at import time by the wait-event saver.
vi.hoisted(() => {
  process.env.ALLMA_CONTINUATION_TABLE_NAME = 'continuation-table';
});

const { handleAsyncResume, handleWaitForEvent } = await import(
  '../../../../src/allma-flows/iterative-step-processor/async-handler.js'
);

const ddbMock = mockClient(DynamoDBDocumentClient);

const waitFlow = (overrides: Partial<StepInstance> = {}): FlowDefinition =>
  makeFlowDefinition({
    steps: {
      wait_step: makeStepInstance({
        stepInstanceId: 'wait_step',
        stepType: StepType.WAIT_FOR_EXTERNAL_EVENT,
        correlationKeyTemplate: 'test-key',
        ...overrides,
      } as Partial<StepInstance>),
    },
  });

beforeEach(() => resetAwsClientMocks(ddbMock));

describe('handleAsyncResume', () => {
  it('maps a resumePayload into the context via the wait step output mappings', async () => {
    const flow = waitFlow({ outputMappings: { '$.user_response': '$.response_text' } });
    const runtimeState = makeRuntimeState({
      currentStepInstanceId: 'wait_step',
      currentContextData: { existing: 1 },
    });
    const event = { runtimeState, resumePayload: { response_text: 'hello', extra: 'ignore' } } as ProcessorInput;

    const state = await handleAsyncResume(event, runtimeState, flow);

    expect(state.currentContextData.user_response).toBe('hello');
    expect(state.currentContextData.existing).toBe(1);
  });

  it('maps a pollingResult Output through the step output mappings', async () => {
    const flow = waitFlow({ stepType: StepType.POLL_EXTERNAL_API, outputMappings: { '$.poll_status': '$.status' } } as Partial<StepInstance>);
    const runtimeState = makeRuntimeState({ currentStepInstanceId: 'wait_step', currentContextData: {} });
    const event = { runtimeState, pollingResult: { Output: JSON.stringify({ status: 'COMPLETE' }) } } as ProcessorInput;

    const state = await handleAsyncResume(event, runtimeState, flow);

    expect(state.currentContextData.poll_status).toBe('COMPLETE');
  });

  it('falls back to a <step>_polling_output key when a polling step has no output mappings', async () => {
    const flow = waitFlow({ stepType: StepType.POLL_EXTERNAL_API, outputMappings: undefined } as Partial<StepInstance>);
    const runtimeState = makeRuntimeState({ currentStepInstanceId: 'wait_step', currentContextData: {} });
    const event = { runtimeState, pollingResult: { Output: { ready: true } } } as ProcessorInput;

    const state = await handleAsyncResume(event, runtimeState, flow);

    expect(state.currentContextData.wait_step_polling_output).toEqual({ ready: true });
  });

  it('returns the state unchanged when there is no current step', async () => {
    const flow = waitFlow();
    const runtimeState = makeRuntimeState({ currentStepInstanceId: undefined, currentContextData: { a: 1 } });
    const event = { runtimeState, resumePayload: { x: 1 } } as ProcessorInput;

    const state = await handleAsyncResume(event, runtimeState, flow);

    expect(state.currentContextData).toEqual({ a: 1 });
  });
});

describe('handleWaitForEvent', () => {
  const waitStepDef = { stepType: StepType.WAIT_FOR_EXTERNAL_EVENT, correlationKeyTemplate: 'test-key' } as unknown as StepDefinition;

  it('persists the SFN task token keyed by the rendered correlation key', async () => {
    ddbMock.on(PutCommand).resolves({});
    const runtimeState = makeRuntimeState({ currentStepInstanceId: 'wait_step', currentContextData: {} });

    await handleWaitForEvent('task-token-abc', waitStepDef, runtimeState, 'corr');

    const put = ddbMock.commandCalls(PutCommand)[0].args[0].input;
    expect(put.TableName).toBe('continuation-table');
    expect(put.Item).toMatchObject({
      correlationKey: 'test-key',
      taskToken: 'task-token-abc',
      stepInstanceId: 'wait_step',
      flowExecutionId: 'corr',
    });
  });

  it('throws when the rendered correlation key is invalid', async () => {
    const badStepDef = { stepType: StepType.WAIT_FOR_EXTERNAL_EVENT, correlationKeyTemplate: 'prefix:{{missing}}' } as unknown as StepDefinition;
    const runtimeState = makeRuntimeState({ currentStepInstanceId: 'wait_step', currentContextData: {} });

    await expect(handleWaitForEvent('tok', badStepDef, runtimeState, 'corr')).rejects.toThrow(
      /valid correlationKey/i,
    );
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
  });
});
