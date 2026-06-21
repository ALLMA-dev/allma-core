import { vi, describe, expect, beforeAll, afterAll, beforeEach, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// SUT — the real orchestration loop. Nothing here is stubbed except the cross-Lambda
// execution-logger client (see below); DynamoDB, S3 and the system step handlers are all real.
import { handler as iterativeStepProcessorHandler } from '../../../src/allma-flows/iterative-step-processor';

import { setupFlowInDB, cleanupAllTestFlows, closeDbConnection } from './_test-helpers';

import {
  type FlowDefinition,
  type ProcessorInput,
  type ProcessorOutput,
  StepType,
  SfnActionType,
  AggregationStrategy,
} from '@allma/core-types';

/**
 * The only stub in this layer: the execution-logger writes traces by invoking a *separate*
 * Lambda, which is not part of the round-trip under test. Everything else (flow-definition
 * load from the live config table, S3 offload/hydrate, the system step handlers) runs for real.
 */
vi.mock('../../../src/allma-core/execution-logger-client', () => ({
  executionLoggerClient: {
    logStepExecution: vi.fn().mockResolvedValue(undefined),
  },
}));

const makeRuntimeState = (flowId: string, currentStepInstanceId: string, currentContextData: Record<string, unknown>) => ({
  flowDefinitionId: flowId,
  flowDefinitionVersion: 1,
  flowExecutionId: `exec-${uuidv4()}`,
  status: 'RUNNING' as const,
  startTime: new Date().toISOString(),
  currentStepInstanceId,
  currentContextData,
  enableExecutionLogs: false,
  stepRetryAttempts: {},
  _internal: {
    originalStartInput: { flowDefinitionId: flowId, flowVersion: '1', initialContextData: {} },
  },
});

const baseFlow = (id: string, steps: FlowDefinition['steps'], startStepInstanceId: string): FlowDefinition => ({
  id,
  version: 1,
  isPublished: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  startStepInstanceId,
  enableExecutionLogs: false,
  steps,
});

describe('Live smoke: orchestration loop against real DynamoDB/S3', () => {
  afterAll(async () => {
    await cleanupAllTestFlows();
    closeDbConnection();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Real DynamoDB flow-definition load + real system handlers, end to end.
  it('runs a small linear flow to COMPLETED (real flow-definition load + handlers)', async () => {
    const flowId = `smoke-linear-${uuidv4()}`;
    const flow = baseFlow(
      flowId,
      {
        step1: {
          stepInstanceId: 'step1',
          stepType: StepType.DATA_TRANSFORMATION,
          moduleIdentifier: 'system/compose-object-from-input',
          inputMappings: { message: '$.initial.greeting' },
          literals: { step_name: 'step1' },
          outputMappings: { '$.steps_output.step1_result': '$.' },
          defaultNextStepInstanceId: 'step2',
        },
        step2: { stepInstanceId: 'step2', stepType: StepType.NO_OP, defaultNextStepInstanceId: 'step3' },
        step3: { stepInstanceId: 'step3', stepType: StepType.END_FLOW },
      },
      'step1',
    );
    await setupFlowInDB(flow);

    const r1 = (await iterativeStepProcessorHandler(
      { runtimeState: makeRuntimeState(flowId, 'step1', { initial: { greeting: 'hello' }, steps_output: {} }) },
      {} as never,
      {} as never,
    )) as ProcessorOutput;
    expect(r1.runtimeState.currentStepInstanceId).toBe('step2');
    expect(r1.runtimeState.currentContextData.steps_output.step1_result).toEqual({ message: 'hello', step_name: 'step1' });

    const r2 = (await iterativeStepProcessorHandler({ runtimeState: r1.runtimeState }, {} as never, {} as never)) as ProcessorOutput;
    const r3 = (await iterativeStepProcessorHandler({ runtimeState: r2.runtimeState }, {} as never, {} as never)) as ProcessorOutput;
    expect(r3.runtimeState.status).toBe('COMPLETED');
    expect(r3.runtimeState.currentStepInstanceId).toBeUndefined();
  });

  // 2. Real S3 offload (PutObject) followed by real S3 hydrate (GetObject) of the pointer.
  it('offloads a step output to S3 and hydrates the pointer in a downstream step (real S3 round-trip)', async () => {
    const flowId = `smoke-s3-${uuidv4()}`;
    const flow = baseFlow(
      flowId,
      {
        producer: {
          stepInstanceId: 'producer',
          stepType: StepType.DATA_TRANSFORMATION,
          moduleIdentifier: 'system/compose-object-from-input',
          literals: { marker: 'roundtrip-OK' },
          // forceS3Offload bypasses the size threshold, so this writes to S3 every run.
          forceS3Offload: true,
          outputMappings: { '$.steps_output.producer': '$.' },
          defaultNextStepInstanceId: 'consumer',
        },
        consumer: {
          stepInstanceId: 'consumer',
          stepType: StepType.DATA_TRANSFORMATION,
          moduleIdentifier: 'system/compose-object-from-input',
          // Reading the offloaded path forces the loop to hydrate the pointer from S3.
          inputMappings: { restored: '$.steps_output.producer' },
          outputMappings: { '$.steps_output.consumer': '$.' },
          defaultNextStepInstanceId: 'done',
        },
        done: { stepInstanceId: 'done', stepType: StepType.END_FLOW },
      },
      'producer',
    );
    await setupFlowInDB(flow);

    const r1 = (await iterativeStepProcessorHandler(
      { runtimeState: makeRuntimeState(flowId, 'producer', { steps_output: {} }) },
      {} as never,
      {} as never,
    )) as ProcessorOutput;
    // The producer output must have been replaced by an S3 pointer in the context.
    expect(r1.runtimeState.currentContextData.steps_output.producer._s3_output_pointer).toBeDefined();

    const r2 = (await iterativeStepProcessorHandler({ runtimeState: r1.runtimeState }, {} as never, {} as never)) as ProcessorOutput;
    // The downstream step received the hydrated value, proving the GetObject round-trip.
    expect(r2.runtimeState.currentContextData.steps_output.consumer.restored).toEqual({ marker: 'roundtrip-OK' });
  });

  // 3. Real flow-definition load + the in-memory fork manager producing branch payloads.
  it('prepares an in-memory parallel fork from a real flow definition', async () => {
    const flowId = `smoke-fork-${uuidv4()}`;
    const flow = baseFlow(
      flowId,
      {
        fork_step: {
          stepInstanceId: 'fork_step',
          stepType: StepType.PARALLEL_FORK_MANAGER,
          itemsPath: '$.items',
          parallelBranches: [{ branchId: 'process_item_branch', stepInstanceId: 'process_item_step' }],
          aggregationConfig: { strategy: AggregationStrategy.COLLECT_ARRAY, failOnBranchError: false },
        },
        process_item_step: {
          stepInstanceId: 'process_item_step',
          stepType: StepType.DATA_TRANSFORMATION,
          moduleIdentifier: 'system/compose-object-from-input',
        },
      },
      'fork_step',
    );
    await setupFlowInDB(flow);

    const result = (await iterativeStepProcessorHandler(
      { runtimeState: makeRuntimeState(flowId, 'fork_step', { items: [{ id: 1 }, { id: 2 }] }) },
      {} as never,
      {} as never,
    )) as ProcessorOutput;

    expect(result.sfnAction).toBe(SfnActionType.PARALLEL_FORK);
    expect(result.parallelForkInput?.branchesToExecute).toHaveLength(2);
    expect(result.parallelForkInput!.branchesToExecute[0].branchInput.currentItem).toEqual({ id: 1 });
    expect(result.parallelForkInput!.branchesToExecute[1].branchInput.currentItem).toEqual({ id: 2 });
  });
});
