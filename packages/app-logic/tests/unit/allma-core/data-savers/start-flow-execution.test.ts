import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { StepType, SystemModuleIdentifiers, TransientStepError, type StepDefinition } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

// The module reads the flow-start queue URL at import time and fails fast when it is unset;
// set it before importing the SUT, and exercise the unset branch with a fresh module.
vi.hoisted(() => {
  process.env.ALLMA_FLOW_START_REQUEST_QUEUE_URL =
    'https://sqs.us-east-1.amazonaws.com/123456789012/flow-start';
});

const { executeStartFlowExecution } = await import(
  '../../../../src/allma-core/data-savers/start-flow-execution.js'
);

const sqsMock = mockClient(SQSClient);

const makeStepDef = (overrides: Record<string, unknown> = {}): StepDefinition =>
  ({
    stepType: StepType.START_FLOW_EXECUTION,
    moduleIdentifier: SystemModuleIdentifiers.START_FLOW_EXECUTION,
    flowDefinitionId: 'target-flow',
    ...overrides,
  }) as unknown as StepDefinition;

describe('executeStartFlowExecution', () => {
  beforeEach(() => resetAwsClientMocks(sqsMock));
  afterAll(() => {
    delete process.env.ALLMA_FLOW_START_REQUEST_QUEUE_URL;
  });

  it('enqueues a flow-start request and returns the generated execution id', async () => {
    sqsMock.on(SendMessageCommand).resolves({ MessageId: 'sqs-1' });

    const result = await executeStartFlowExecution(
      makeStepDef(),
      { initialContextData: { seed: 1 } },
      makeRuntimeState({ flowExecutionId: 'parent-exec', currentStepInstanceId: 'step-x' })
    );

    expect(result.outputData).toMatchObject({ sqsMessageId: 'sqs-1', _meta: { status: 'SUCCESS' } });
    expect(typeof result.outputData!.startedFlowExecutionId).toBe('string');

    const body = JSON.parse(sqsMock.commandCalls(SendMessageCommand)[0].args[0].input.MessageBody as string);
    expect(body.flowDefinitionId).toBe('target-flow');
    expect(body.initialContextData).toEqual({ seed: 1 });
    // Trigger source is enriched with the parent flow + step for traceability.
    expect(body.triggerSource).toContain('ParentFlow:parent-exec:step-x');
  });

  it('rejects an invalid step definition (missing module identifier)', async () => {
    await expect(
      executeStartFlowExecution(
        { stepType: StepType.START_FLOW_EXECUTION, flowDefinitionId: 'f' } as never,
        {},
        makeRuntimeState()
      )
    ).rejects.toThrow('Invalid step definition for start-flow-execution');
  });

  it('rejects when the constructed payload is invalid (bad execution id)', async () => {
    await expect(
      executeStartFlowExecution(makeStepDef(), { flowExecutionId: 'not-a-uuid' }, makeRuntimeState())
    ).rejects.toThrow('Invalid final input for start-flow-execution');
  });

  it('maps a transient SQS error to a TransientStepError', async () => {
    sqsMock.on(SendMessageCommand).rejects(Object.assign(new Error('busy'), { name: 'ThrottlingException' }));

    await expect(
      executeStartFlowExecution(makeStepDef(), {}, makeRuntimeState())
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('fails fast when the flow-start queue URL is not configured', async () => {
    vi.resetModules();
    const saved = process.env.ALLMA_FLOW_START_REQUEST_QUEUE_URL;
    delete process.env.ALLMA_FLOW_START_REQUEST_QUEUE_URL;
    try {
      const fresh = await import('../../../../src/allma-core/data-savers/start-flow-execution.js');
      await expect(fresh.executeStartFlowExecution(makeStepDef(), {}, makeRuntimeState())).rejects.toThrow(
        'ALLMA_FLOW_START_REQUEST_QUEUE_URL is not set'
      );
    } finally {
      process.env.ALLMA_FLOW_START_REQUEST_QUEUE_URL = saved;
      vi.resetModules();
    }
  });
});
