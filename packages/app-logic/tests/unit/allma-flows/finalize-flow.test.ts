import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  StepType,
  HttpMethod,
  ENV_VAR_NAMES,
  type FlowDefinition,
  type OnCompletionAction,
  type ProcessorInput,
} from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';
import { makeFlowDefinition, makeStepInstance, makeRuntimeState } from '../_helpers/fixtures.js';

vi.hoisted(() => {
  process.env.ALLMA_EXECUTION_TRACES_BUCKET_NAME = 'traces-bucket';
  process.env.ALLMA_CONFIG_TABLE_NAME = 'config-table';
});

vi.mock('../../../src/allma-core/config-loader.js', () => ({
  loadFlowDefinition: vi.fn(),
}));
vi.mock('../../../src/allma-core/execution-logger-client.js', () => ({
  executionLoggerClient: {
    createMetadataRecord: vi.fn().mockResolvedValue(undefined),
    updateFinalStatus: vi.fn().mockResolvedValue(undefined),
    logStepExecution: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../../src/allma-core/utils/api-executor.js', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    executeConfiguredApiCall: vi.fn().mockResolvedValue({ status: 200, data: {} }),
    postSimpleJson: vi.fn().mockResolvedValue({ status: 202, data: {} }),
  };
});

const { handler } = await import('../../../src/allma-flows/finalize-flow.js');
const { loadFlowDefinition } = await import('../../../src/allma-core/config-loader.js');
const { executionLoggerClient } = await import('../../../src/allma-core/execution-logger-client.js');
const apiExecutor = await import('../../../src/allma-core/utils/api-executor.js');

const mockedLoadDef = vi.mocked(loadFlowDefinition);
const mockedLogger = vi.mocked(executionLoggerClient);
const mockedApiCall = vi.mocked(apiExecutor.executeConfiguredApiCall);
const mockedPostJson = vi.mocked(apiExecutor.postSimpleJson);

const snsMock = mockClient(SNSClient);
const lambdaMock = mockClient(LambdaClient);
const s3Mock = mockClient(S3Client);

const flowWithActions = (onCompletionActions: OnCompletionAction[]): FlowDefinition =>
  makeFlowDefinition({
    steps: { start: makeStepInstance({ stepInstanceId: 'start', stepType: StepType.NO_OP }) },
    onCompletionActions,
  });

const invoke = (event: ProcessorInput) => handler(event, {} as never, (() => undefined) as never);

beforeEach(() => {
  resetAwsClientMocks(snsMock, lambdaMock, s3Mock);
  snsMock.on(PublishCommand).resolves({ MessageId: 'sns-1' });
  lambdaMock.on(InvokeCommand).resolves({ StatusCode: 202 });
  s3Mock.on(PutObjectCommand).resolves({});
  mockedLoadDef.mockReset();
  vi.mocked(mockedLogger.createMetadataRecord).mockClear();
  vi.mocked(mockedLogger.updateFinalStatus).mockClear();
  vi.mocked(mockedLogger.logStepExecution).mockClear();
  mockedApiCall.mockClear();
  mockedPostJson.mockClear();
});

describe('finalize-flow handler', () => {
  it('executes every matching onCompletionAction for a COMPLETED flow', async () => {
    const actions: OnCompletionAction[] = [
      {
        actionType: 'API_CALL',
        target: 'https://api.example.com/notify',
        apiHttpMethod: HttpMethod.POST,
        payloadTemplate: { flow_id: '$.flowExecutionId' },
        executeOnStatus: 'COMPLETED',
      },
      {
        actionType: 'SNS_SEND',
        target: 'arn:aws:sns:us-east-1:123456789012:topic',
        payloadTemplate: { message: '$.final_message' },
        messageAttributesTemplate: { status: '$.status' },
        executeOnStatus: 'ANY',
      },
      {
        actionType: 'CUSTOM_LAMBDA_INVOKE',
        target: 'arn:aws:lambda:us-east-1:123456789012:function:logger',
        payloadTemplate: { ctx: '$.' },
        condition: '$.user.isAdmin === true',
        executeOnStatus: 'COMPLETED',
      },
      { actionType: 'LOG_ONLY', executeOnStatus: 'FAILED' },
    ];
    mockedLoadDef.mockResolvedValue(flowWithActions(actions));

    await invoke({
      runtimeState: makeRuntimeState({
        status: 'COMPLETED',
        currentContextData: { user: { id: 'u1', isAdmin: true }, final_message: 'done' },
      }),
    });

    expect(mockedApiCall).toHaveBeenCalledTimes(1);
    expect(snsMock).toHaveReceivedCommandTimes(PublishCommand, 1);
    const snsInput = snsMock.commandCalls(PublishCommand)[0].args[0].input;
    expect(JSON.parse(snsInput.Message as string)).toEqual({ message: 'done' });
    expect(snsInput.MessageAttributes).toEqual({ status: { DataType: 'String', StringValue: 'COMPLETED' } });
    // The FAILED-only LOG_ONLY action is skipped for a COMPLETED flow.
    expect(lambdaMock).toHaveReceivedCommandTimes(InvokeCommand, 1);
  });

  it('triggers a system-level resume when _flow_resume_key is present', async () => {
    process.env[ENV_VAR_NAMES.ALLMA_RESUME_API_URL] = 'http://resume.test/resume';
    mockedLoadDef.mockResolvedValue(makeFlowDefinition());

    const runtimeState = makeRuntimeState({
      status: 'COMPLETED',
      currentContextData: { final: 'x', _flow_resume_key: 'wa:123' },
    });
    await invoke({ runtimeState });

    expect(mockedPostJson).toHaveBeenCalledWith(
      'http://resume.test/resume',
      { correlationValue: 'wa:123', payload: runtimeState.currentContextData },
      5000,
    );
    delete process.env[ENV_VAR_NAMES.ALLMA_RESUME_API_URL];
  });

  it('bootstraps logging when a previously-unlogged flow finalizes as FAILED', async () => {
    mockedLoadDef.mockResolvedValue(makeFlowDefinition());

    const result = await invoke({
      runtimeState: makeRuntimeState({
        status: 'FAILED',
        enableExecutionLogs: false,
        errorInfo: { errorName: 'StepError', errorMessage: 'boom', isRetryable: false },
        currentContextData: {},
        _internal: {
          loggingBootstrapped: false,
          originalStartInput: { flowDefinitionId: 'flow-test', flowVersion: '1', initialContextData: {} },
        },
      }),
    });

    expect(result.status).toBe('FAILED');
    expect(mockedLogger.createMetadataRecord).toHaveBeenCalledWith(
      expect.objectContaining({ enableExecutionLogs: true }),
    );
    expect(mockedLogger.updateFinalStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED' }),
    );
    expect(mockedLogger.logStepExecution).toHaveBeenCalledWith(
      expect.objectContaining({ stepType: 'FINALIZE_FLOW', status: 'FAILED' }),
    );
  });

  it('offloads a large final context to S3 and returns a pointer', async () => {
    mockedLoadDef.mockResolvedValue(makeFlowDefinition());

    const result = await invoke({
      runtimeState: makeRuntimeState({
        status: 'COMPLETED',
        currentContextData: { blob: 'x'.repeat(120 * 1024) },
      }),
    });

    expect(s3Mock).toHaveReceivedCommand(PutObjectCommand);
    expect(result.finalContextDataS3Pointer).toBeDefined();
    expect(result.finalContextData).toBeUndefined();
  });

  it('still completes when the flow definition cannot be loaded for onCompletionActions', async () => {
    mockedLoadDef.mockRejectedValue(new Error('definition gone'));

    const result = await invoke({
      runtimeState: makeRuntimeState({ status: 'COMPLETED', currentContextData: { a: 1 } }),
    });

    expect(result.status).toBe('COMPLETED');
  });

  it('returns a FinalizationError when finalization throws', async () => {
    mockedLoadDef.mockResolvedValue(makeFlowDefinition());
    vi.mocked(mockedLogger.updateFinalStatus).mockRejectedValueOnce(new Error('ddb down'));

    const result = await invoke({
      runtimeState: makeRuntimeState({ status: 'COMPLETED', enableExecutionLogs: true, currentContextData: {} }),
    });

    expect(result.status).toBe('FAILED');
    expect(result.errorInfo?.errorName).toBe('FinalizationError');
  });

  it('returns a COMPLETED FinalizeOutput with the inline context for a small payload', async () => {
    mockedLoadDef.mockResolvedValue(makeFlowDefinition());

    const result = await invoke({
      runtimeState: makeRuntimeState({ status: 'COMPLETED', currentContextData: { result: 1 } }),
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.finalContextData).toEqual({ result: 1 });
    expect(result.finalContextDataS3Pointer).toBeUndefined();
  });
});
