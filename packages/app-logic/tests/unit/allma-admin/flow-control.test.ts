import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { AdminPermission, AdminRole } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

process.env.ALLMA_STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:123456789012:stateMachine:AllmaFlowOrchestrator-dev';
process.env.ITERATIVE_STEP_PROCESSOR_LAMBDA_ARN = 'arn:aws:lambda:us-east-1:123456789012:function:AllmaIterativeStepProcessor-dev';
process.env.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME = 'test-exec-log-table';

vi.mock('@allma/core-sdk', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return {
    ...orig,
    resolveS3Pointer: vi.fn(),
  };
});

const coreSdk = await import('@allma/core-sdk');
const mockedResolveS3Pointer = vi.mocked(coreSdk.resolveS3Pointer);

const { ExecutionMonitoringService } = await import(
  '../../../src/allma-admin/services/execution-monitoring.service.js'
);
const { handler } = await import('../../../src/allma-admin/flow-control.js');

const sfnMock = mockClient(SFNClient);
const lambdaMock = mockClient(LambdaClient);

const createEvent = (method: string, path: string, body?: any): any => ({
  rawPath: path,
  requestContext: {
    requestId: 'test-req-id',
    http: { method, path },
    authorizer: {
      jwt: {
        claims: {
          sub: 'admin-123',
          email: 'admin@example.com',
          'cognito:groups': ['Admins'],
          'custom:admin_roles': JSON.stringify({
            roles: [AdminRole.SUPER_ADMIN],
            permissions: [AdminPermission.DEFINITIONS_WRITE],
          }),
        },
      },
    },
  },
  body: body ? JSON.stringify(body) : undefined,
  headers: {},
});

beforeEach(() => {
  resetAwsClientMocks(sfnMock);
  resetAwsClientMocks(lambdaMock);
  vi.restoreAllMocks();
  mockedResolveS3Pointer.mockReset();
});

describe('flow-control handler', () => {
  describe('POST /allma/flow-executions/{flowExecutionId}/redrive (simple redrive)', () => {
    it('delegates to ExecutionMonitoringService and initiates redrive via SFN', async () => {
      const getMetadataSpy = vi.spyOn(ExecutionMonitoringService, 'getExecutionMetadata').mockResolvedValue({
        flowExecutionId: 'orig-exec-1',
        eventTimestamp_stepInstanceId_attempt: 'METADATA',
        itemType: 'ALLMA_FLOW_EXECUTION_RECORD',
        flowDefinitionId: 'flow-test',
        flowDefinitionVersion: 1,
        status: 'FAILED',
        startTime: '2026-06-22T10:00:00.000Z',
        initialInputPayload: {
          flowDefinitionId: 'flow-test',
          flowVersion: '1',
          initialContextData: { foo: 'bar' },
        },
      } as any);

      sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'arn:aws:states:...:exec-1' });

      const event = createEvent('POST', '/allma/flow-executions/orig-exec-1/redrive');
      const response = await handler(event, {} as any, (() => undefined) as any);

      expect(getMetadataSpy).toHaveBeenCalledWith('orig-exec-1');
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.originalFlowExecutionId).toBe('orig-exec-1');
      expect(body.data.newFlowExecutionId).toBeDefined();

      const sfnCalls = sfnMock.commandCalls(StartExecutionCommand);
      expect(sfnCalls).toHaveLength(1);
      const sfnInput = JSON.parse(sfnCalls[0].args[0].input.input as string);
      expect(sfnInput.flowDefinitionId).toBe('flow-test');
      expect(sfnInput.triggerSource).toContain('RedriveOf:orig-exec-1 by admin@example.com');
    });

    it('returns 404 when original flow execution is not found in ExecutionMonitoringService', async () => {
      vi.spyOn(ExecutionMonitoringService, 'getExecutionMetadata').mockResolvedValue(null);

      const event = createEvent('POST', '/allma/flow-executions/non-existent/redrive');
      const response = await handler(event, {} as any, (() => undefined) as any);

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error.code).toBe('NOT_FOUND');
    });

    it('returns 500 when original execution has no initialInputPayload', async () => {
      vi.spyOn(ExecutionMonitoringService, 'getExecutionMetadata').mockResolvedValue({
        flowExecutionId: 'corrupt-exec',
        eventTimestamp_stepInstanceId_attempt: 'METADATA',
        itemType: 'ALLMA_FLOW_EXECUTION_RECORD',
        flowDefinitionId: 'flow-test',
        flowDefinitionVersion: 1,
        status: 'FAILED',
        startTime: '2026-06-22T10:00:00.000Z',
      } as any);

      const event = createEvent('POST', '/allma/flow-executions/corrupt-exec/redrive');
      const response = await handler(event, {} as any, (() => undefined) as any);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error.code).toBe('DATA_CORRUPTION');
    });
  });

  describe('POST /allma/flow-executions/{flowExecutionId}/stateful-redrive', () => {
    it('returns 400 when input validation fails', async () => {
      const event = createEvent('POST', '/allma/flow-executions/orig-exec/stateful-redrive', {});
      const response = await handler(event, {} as any, (() => undefined) as any);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when metadata is not found', async () => {
      vi.spyOn(ExecutionMonitoringService, 'getExecutionMetadata').mockResolvedValue(null);

      const event = createEvent('POST', '/allma/flow-executions/orig-exec/stateful-redrive', {
        startFromStepInstanceId: 'step-2',
        modifiedContextData: { custom: 'data' },
      });
      const response = await handler(event, {} as any, (() => undefined) as any);

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error.code).toBe('NOT_FOUND');
    });

    it('initiates stateful redrive with modifiedContextData', async () => {
      vi.spyOn(ExecutionMonitoringService, 'getExecutionMetadata').mockResolvedValue({
        flowExecutionId: 'orig-exec',
        eventTimestamp_stepInstanceId_attempt: 'METADATA',
        itemType: 'ALLMA_FLOW_EXECUTION_RECORD',
        flowDefinitionId: 'flow-test',
        flowDefinitionVersion: 2,
        status: 'FAILED',
        startTime: '2026-06-22T10:00:00.000Z',
      } as any);

      sfnMock.on(StartExecutionCommand).resolves({});

      const event = createEvent('POST', '/allma/flow-executions/orig-exec/stateful-redrive', {
        startFromStepInstanceId: 'step-2',
        modifiedContextData: { custom: 'data' },
      });
      const response = await handler(event, {} as any, (() => undefined) as any);

      expect(response.statusCode).toBe(200);
      const sfnCalls = sfnMock.commandCalls(StartExecutionCommand);
      expect(sfnCalls).toHaveLength(1);
      const sfnInput = JSON.parse(sfnCalls[0].args[0].input.input as string);
      expect(sfnInput.executionOverrides.startFromState.currentContextData).toEqual({ custom: 'data' });
      expect(sfnInput.executionOverrides.startFromState.currentStepInstanceId).toBe('step-2');
    });

    it('fetches historical step context via ExecutionMonitoringService when modifiedContextData is omitted', async () => {
      vi.spyOn(ExecutionMonitoringService, 'getExecutionMetadata').mockResolvedValue({
        flowExecutionId: 'orig-exec',
        eventTimestamp_stepInstanceId_attempt: 'METADATA',
        itemType: 'ALLMA_FLOW_EXECUTION_RECORD',
        flowDefinitionId: 'flow-test',
        flowDefinitionVersion: 1,
        status: 'FAILED',
        startTime: '2026-06-22T10:00:00.000Z',
      } as any);

      const getStepsSpy = vi.spyOn(ExecutionMonitoringService, 'getStepExecutionRecords').mockResolvedValue([
        {
          flowExecutionId: 'orig-exec',
          stepInstanceId: 'step-2',
          status: 'STARTED',
          eventTimestamp: '2026-06-22T10:00:02.000Z',
          fullRecordS3Pointer: { bucket: 'b', key: 'k' },
        } as any,
      ]);

      mockedResolveS3Pointer.mockResolvedValue({
        inputMappingContext: { historical: 'context-val' },
      });

      sfnMock.on(StartExecutionCommand).resolves({});

      const event = createEvent('POST', '/allma/flow-executions/orig-exec/stateful-redrive', {
        startFromStepInstanceId: 'step-2',
      });
      const response = await handler(event, {} as any, (() => undefined) as any);

      expect(getStepsSpy).toHaveBeenCalledWith('orig-exec');
      expect(mockedResolveS3Pointer).toHaveBeenCalledWith({ bucket: 'b', key: 'k' }, 'test-req-id');
      expect(response.statusCode).toBe(200);

      const sfnCalls = sfnMock.commandCalls(StartExecutionCommand);
      const sfnInput = JSON.parse(sfnCalls[0].args[0].input.input as string);
      expect(sfnInput.executionOverrides.startFromState.currentContextData).toEqual({ historical: 'context-val' });
    });

    it('returns 404 when historical step record is not found', async () => {
      vi.spyOn(ExecutionMonitoringService, 'getExecutionMetadata').mockResolvedValue({
        flowExecutionId: 'orig-exec',
        eventTimestamp_stepInstanceId_attempt: 'METADATA',
        itemType: 'ALLMA_FLOW_EXECUTION_RECORD',
        flowDefinitionId: 'flow-test',
        flowDefinitionVersion: 1,
        status: 'FAILED',
        startTime: '2026-06-22T10:00:00.000Z',
      } as any);

      vi.spyOn(ExecutionMonitoringService, 'getStepExecutionRecords').mockResolvedValue([]);

      const event = createEvent('POST', '/allma/flow-executions/orig-exec/stateful-redrive', {
        startFromStepInstanceId: 'step-missing',
      });
      const response = await handler(event, {} as any, (() => undefined) as any);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /allma/flows/sandbox/step', () => {
    it('invokes ISP lambda in sandbox mode and returns result', async () => {
      const ispOutput = {
        runtimeState: {
          flowDefinitionId: 'flow-test',
          flowDefinitionVersion: 1,
          flowExecutionId: 'sandbox-test-req-id',
          currentStepInstanceId: 'step-1',
          status: 'COMPLETED',
          _internal: {
            currentStepHandlerResult: {
              outputData: { computed: 42 },
            },
          },
        },
      };

      lambdaMock.on(InvokeCommand).resolves({
        Payload: new TextEncoder().encode(JSON.stringify(ispOutput)),
      });

      const event = createEvent('POST', '/allma/flows/sandbox/step', {
        flowDefinitionId: 'flow-test',
        flowDefinitionVersion: 1,
        stepInstanceId: 'step-1',
        contextData: { input: 'val' },
      });
      const response = await handler(event, {} as any, (() => undefined) as any);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.outputData).toEqual({ computed: 42 });
    });
  });

  describe('POST /allma/flows/{flowId}/versions/{versionNumber}/execute', () => {
    it('initiates test execution via SFN', async () => {
      sfnMock.on(StartExecutionCommand).resolves({});

      const event = createEvent('POST', '/allma/flows/flow-test/versions/1/execute', {
        initialContextData: { init: true },
      });
      const response = await handler(event, {} as any, (() => undefined) as any);

      expect(response.statusCode).toBe(200);
      const sfnCalls = sfnMock.commandCalls(StartExecutionCommand);
      expect(sfnCalls).toHaveLength(1);
      const sfnInput = JSON.parse(sfnCalls[0].args[0].input.input as string);
      expect(sfnInput.flowDefinitionId).toBe('flow-test');
      expect(sfnInput.flowVersion).toBe('1');
      expect(sfnInput.initialContextData).toEqual({ init: true });
    });
  });
});
