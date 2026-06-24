import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
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
  eventTimestamp_stepInstanceId_attempt: '__METADATA__',
});

beforeEach(() => {
  ddbMock.reset();
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
      eventTimestamp_stepInstanceId_attempt: '__METADATA__',
    });
  });
});
