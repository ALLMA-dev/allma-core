import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from '../_helpers/aws-mock.js';

// The service reads the table name at module load, so set it before importing.
process.env.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME = 'test-exec-log-table';

const { ExecutionMonitoringService } = await import(
  '../../../src/allma-admin/services/execution-monitoring.service.js'
);

const ddbMock = mockClient(DynamoDBDocumentClient);

const flowRecord = (id: string) => ({
  itemType: 'ALLMA_FLOW_EXECUTION_RECORD',
  flowExecutionId: id,
  flowDefinitionId: 'flow-a',
  flowDefinitionVersion: 1,
  status: 'COMPLETED',
  startTime: '2026-06-22T10:00:00.000Z',
  endTime: '2026-06-22T10:00:05.000Z',
  eventTimestamp_stepInstanceId_attempt: 'METADATA',
});

beforeEach(() => {
  ddbMock.reset();
});

describe('getExecutionMetadata', () => {
  it('returns metadata item when found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: flowRecord('exec-1') });

    const result = await ExecutionMonitoringService.getExecutionMetadata('exec-1');

    expect(result).toEqual(flowRecord('exec-1'));
    const calls = ddbMock.commandCalls(GetCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toEqual({
      TableName: 'test-exec-log-table',
      Key: {
        flowExecutionId: 'exec-1',
        eventTimestamp_stepInstanceId_attempt: 'METADATA',
      },
    });
  });

  it('returns null when item is not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await ExecutionMonitoringService.getExecutionMetadata('exec-none');

    expect(result).toBeNull();
  });
});

describe('getStepExecutionRecords', () => {
  it('queries step records for flow execution ID and returns them', async () => {
    const stepRecords = [
      {
        itemType: 'ALLMA_STEP_EXECUTION_RECORD',
        flowExecutionId: 'exec-1',
        stepInstanceId: 'step-1',
        status: 'STARTED',
        eventTimestamp: '2026-06-22T10:00:01.000Z',
        eventTimestamp_stepInstanceId_attempt: 'STEP#2026-06-22T10:00:01.000Z#step-1#1',
      },
    ];
    ddbMock.on(QueryCommand).resolves({ Items: stepRecords });

    const result = await ExecutionMonitoringService.getStepExecutionRecords('exec-1');

    expect(result).toEqual(stepRecords);
    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({
      TableName: 'test-exec-log-table',
      KeyConditionExpression: 'flowExecutionId = :pk AND begins_with(eventTimestamp_stepInstanceId_attempt, :skPrefix)',
      ExpressionAttributeValues: { ':pk': 'exec-1', ':skPrefix': 'STEP#' },
      ScanIndexForward: true,
    });
  });

  it('returns empty array when no step records found', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: undefined });

    const result = await ExecutionMonitoringService.getStepExecutionRecords('exec-1');

    expect(result).toEqual([]);
  });
});

describe('reconcileExecutionTerminalStatus', () => {
  it('sends UpdateCommand with terminal status and conditions', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await ExecutionMonitoringService.reconcileExecutionTerminalStatus({
      flowExecutionId: 'exec-1',
      flowDefinitionVersion: 2,
      startTime: '2026-06-22T10:00:00.000Z',
      terminalStatus: 'FAILED',
      endTime: '2026-06-22T10:05:00.000Z',
      errorInfo: { errorName: 'StepFailed', errorMessage: 'Execution failed', isRetryable: false },
      correlationId: 'exec-1',
    });

    const calls = ddbMock.commandCalls(UpdateCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({
      TableName: 'test-exec-log-table',
      Key: {
        flowExecutionId: 'exec-1',
        eventTimestamp_stepInstanceId_attempt: 'METADATA',
      },
      ConditionExpression: '#status = :running OR #status = :init',
      ExpressionAttributeValues: {
        ':status': 'FAILED',
        ':endTime': '2026-06-22T10:05:00.000Z',
        ':flowSortKey': 'v#2#s#FAILED#t#2026-06-22T10:00:00.000Z',
        ':running': 'RUNNING',
        ':init': 'INITIALIZING',
        ':errorInfo': { errorName: 'StepFailed', errorMessage: 'Execution failed', isRetryable: false },
      },
    });
  });

  it('handles ConditionalCheckFailedException gracefully without throwing', async () => {
    const condError = new Error('Conditional check failed');
    condError.name = 'ConditionalCheckFailedException';
    ddbMock.on(UpdateCommand).rejects(condError);

    await expect(
      ExecutionMonitoringService.reconcileExecutionTerminalStatus({
        flowExecutionId: 'exec-1',
        flowDefinitionVersion: 1,
        startTime: '2026-06-22T10:00:00.000Z',
        terminalStatus: 'COMPLETED',
        endTime: '2026-06-22T10:05:00.000Z',
      })
    ).resolves.toBeUndefined();
  });

  it('rethrows unexpected errors', async () => {
    ddbMock.on(UpdateCommand).rejects(new Error('DynamoDB connection timeout'));

    await expect(
      ExecutionMonitoringService.reconcileExecutionTerminalStatus({
        flowExecutionId: 'exec-1',
        flowDefinitionVersion: 1,
        startTime: '2026-06-22T10:00:00.000Z',
        terminalStatus: 'COMPLETED',
        endTime: '2026-06-22T10:05:00.000Z',
      })
    ).rejects.toThrow('DynamoDB connection timeout');
  });
});

describe('listExecutions', () => {
  it('keeps paging when a page is fully consumed by the server-side itemType filter', async () => {
    // GSI_ByFlow_StartTime now also contains step records (denormalized with flowDefinitionId +
    // startTime). DynamoDB applies Limit before the FilterExpression, so the first page can come
    // back empty-but-not-exhausted: Items=[] with a LastEvaluatedKey. The service must follow the
    // cursor instead of returning items:[] — this is the regression we are guarding against.
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [], LastEvaluatedKey: { flowExecutionId: 'cursor-1' } as any })
      .resolvesOnce({ Items: [flowRecord('exec-1')] });

    const result = await ExecutionMonitoringService.listExecutions(
      'flow-a',
      {},
      { limit: 25 }
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.flowExecutionId).toBe('exec-1');
    expect(result.nextToken).toBeUndefined();
    expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(2);
  });

  it('returns an item-derived nextToken when the requested page fills mid-partition', async () => {
    ddbMock
      .on(QueryCommand)
      .resolves({ Items: [flowRecord('exec-1'), flowRecord('exec-2')], LastEvaluatedKey: { x: 1 } as any });

    const result = await ExecutionMonitoringService.listExecutions(
      'flow-a',
      {},
      { limit: 2 }
    );

    expect(result.items).toHaveLength(2);
    expect(result.nextToken).toBeDefined();
    const decoded = JSON.parse(Buffer.from(result.nextToken!, 'base64').toString('utf-8'));
    // The cursor must carry both GSI keys and base-table keys to be a valid ExclusiveStartKey.
    expect(decoded).toMatchObject({
      flowDefinitionId: 'flow-a',
      flowExecutionId: 'exec-2',
      startTime: '2026-06-22T10:00:00.000Z',
      eventTimestamp_stepInstanceId_attempt: 'METADATA',
    });
  });
});
