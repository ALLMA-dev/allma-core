import { vi, describe, it, expect, beforeEach } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  SfnActionType,
  type StartFlowExecutionInput,
  type ProcessorOutput,
} from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';
import { makeFlowDefinition, makeRuntimeState } from '../_helpers/fixtures.js';

vi.mock('../../../src/allma-core/config-loader.js', () => ({
  loadFlowDefinition: vi.fn(),
  loadFlowMetadata: vi.fn(),
  loadStepDefinition: vi.fn(),
}));
vi.mock('../../../src/allma-core/execution-logger-client.js', () => ({
  executionLoggerClient: {
    createMetadataRecord: vi.fn().mockResolvedValue(undefined),
    logStepExecution: vi.fn().mockResolvedValue(undefined),
    updateFinalStatus: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../../src/allma-admin/services/agent.service.js', () => ({
  AgentService: { getAgentVariablesForFlow: vi.fn().mockResolvedValue({}) },
}));

const { handler } = await import('../../../src/allma-flows/initialize-flow.js');
const { loadFlowDefinition, loadFlowMetadata } = await import('../../../src/allma-core/config-loader.js');
const { executionLoggerClient } = await import('../../../src/allma-core/execution-logger-client.js');

const mockedLoadDef = vi.mocked(loadFlowDefinition);
const mockedLoadMeta = vi.mocked(loadFlowMetadata);
const mockedLogger = vi.mocked(executionLoggerClient);
const s3Mock = mockClient(S3Client);

const invoke = (event: StartFlowExecutionInput): Promise<ProcessorOutput> =>
  handler(event, {} as never, (() => undefined) as never) as Promise<ProcessorOutput>;

beforeEach(() => {
  resetAwsClientMocks(s3Mock);
  mockedLoadDef.mockReset();
  mockedLoadMeta.mockReset();
  vi.mocked(mockedLogger.createMetadataRecord).mockClear();
  mockedLoadDef.mockResolvedValue(makeFlowDefinition({ id: 'flow-x', startStepInstanceId: 'first' }));
  mockedLoadMeta.mockResolvedValue({ flowVariables: {} } as never);
});

describe('initialize-flow handler', () => {
  it('builds the initial runtime state and returns a PROCESS_STEP action', async () => {
    const result = await invoke({ flowDefinitionId: 'flow-x', initialContextData: { seed: 1 } } as StartFlowExecutionInput);

    expect(result.sfnAction).toBe(SfnActionType.PROCESS_STEP);
    expect(result.runtimeState.status).toBe('RUNNING');
    expect(result.runtimeState.currentStepInstanceId).toBe('first');
    expect(result.runtimeState.currentContextData.seed).toBe(1);
    expect(result.runtimeState.currentContextData.steps_output).toEqual({});
    expect(result.runtimeState.currentContextData.flow_variables.flowExecutionId).toBe(
      result.runtimeState.flowExecutionId,
    );
  });

  it('honours a startStepInstanceId execution override', async () => {
    const result = await invoke({
      flowDefinitionId: 'flow-x',
      executionOverrides: { startStepInstanceId: 'resume-here' },
    } as StartFlowExecutionInput);

    expect(result.runtimeState.currentStepInstanceId).toBe('resume-here');
  });

  it('creates a metadata record when execution logging is enabled on the definition', async () => {
    mockedLoadDef.mockResolvedValue(
      makeFlowDefinition({ id: 'flow-x', startStepInstanceId: 'first', enableExecutionLogs: true }),
    );

    const result = await invoke({ flowDefinitionId: 'flow-x' } as StartFlowExecutionInput);

    expect(result.runtimeState.enableExecutionLogs).toBe(true);
    expect(mockedLogger.createMetadataRecord).toHaveBeenCalledTimes(1);
    expect(result.runtimeState._internal?.loggingBootstrapped).toBe(true);
  });

  it('initializes directly from a stateful-redrive startFromState', async () => {
    const startFromState = makeRuntimeState({
      flowExecutionId: '11111111-1111-4111-8111-111111111111',
      currentStepInstanceId: 'step-8',
    });

    const result = await invoke({
      flowDefinitionId: 'flow-x',
      executionOverrides: { startFromState },
    } as StartFlowExecutionInput);

    expect(result.sfnAction).toBe(SfnActionType.PROCESS_STEP);
    expect(result.runtimeState.currentStepInstanceId).toBe('step-8');
    // Normal initialization (definition load) is bypassed entirely.
    expect(mockedLoadDef).not.toHaveBeenCalled();
  });

  it('resolves an S3-pointer initial context before building state', async () => {
    s3Mock.on(GetObjectCommand).resolves({
      ContentType: 'application/json',
      ContentLength: 10,
      Body: { transformToString: async () => JSON.stringify({ hydrated: true }) },
    } as never);

    const result = await invoke({
      flowDefinitionId: 'flow-x',
      initialContextData: { _s3_context_pointer: { bucket: 'b', key: 'k' } },
    } as StartFlowExecutionInput);

    expect(s3Mock).toHaveReceivedCommand(GetObjectCommand);
    expect(result.runtimeState.currentContextData.hydrated).toBe(true);
  });

  it('throws on invalid start input', async () => {
    await expect(invoke({ initialContextData: {} } as StartFlowExecutionInput)).rejects.toThrow(
      /Invalid StartFlowExecutionInput/,
    );
  });
});
