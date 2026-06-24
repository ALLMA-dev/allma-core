import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD, ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD } from '@allma/core-types';
import { mockClient } from '../_helpers/aws-mock.js';

// The service reads the table name at module load, so set it before importing.
process.env.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME = 'test-exec-log-table';

const { ExecutionMonitoringService } = await import('../../../src/allma-admin/services/execution-monitoring.service.js');

const ddbMock = mockClient(DynamoDBDocumentClient);

const FLOW_ID = 'flow-a';

const flowRecord = (id: string, startTime: string) => ({
  flowExecutionId: id,
  itemType: ITEM_TYPE_ALLMA_FLOW_EXECUTION_RECORD,
  status: 'COMPLETED',
  startTime,
  endTime: startTime,
  flowDefinitionId: FLOW_ID,
  flowDefinitionVersion: 1,
  enableExecutionLogs: true,
});

const stepRecord = (startTime: string) => ({
  flowExecutionId: 'exec-with-steps',
  itemType: ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD,
  status: 'COMPLETED',
  startTime,
  flowDefinitionId: FLOW_ID,
});

beforeEach(() => {
  ddbMock.reset();
});

describe('ExecutionMonitoringService.listExecutions', () => {
  it('skips interleaved step records and still returns flow executions', async () => {
    // DynamoDB applies FilterExpression after Limit, so the mock returns only the records that
    // match `itemType = ALLMA_FLOW_EXECUTION_RECORD` — but the first page is dominated by step
    // records that get filtered out, leaving a single flow record on the page.
    const flow = flowRecord('exec-1', '2026-06-20T10:00:00.000Z');
    ddbMock.on(QueryCommand).resolvesOnce({
      Items: [flow],
      // The page was full of (filtered-out) step records, so DynamoDB hands back a cursor.
      LastEvaluatedKey: { flowDefinitionId: FLOW_ID, startTime: flow.startTime, flowExecutionId: 'exec-1', eventTimestamp_stepInstanceId_attempt: 'METADATA' },
    }).resolves({ Items: [] });

    const result = await ExecutionMonitoringService.listExecutions(FLOW_ID, {}, { limit: 50 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].flowExecutionId).toBe('exec-1');
  });

  it('pages through the index until it collects the requested number of flow executions', async () => {
    // Each page surfaces one flow record (the rest of the page is step records DynamoDB filtered
    // out). We must follow the cursor across pages instead of returning an empty list.
    const pages = [
      { rec: flowRecord('exec-1', '2026-06-20T12:00:00.000Z') },
      { rec: flowRecord('exec-2', '2026-06-20T11:00:00.000Z') },
      { rec: flowRecord('exec-3', '2026-06-20T10:00:00.000Z') },
    ];
    let call = 0;
    ddbMock.on(QueryCommand).callsFake(() => {
      const page = pages[call];
      call++;
      const isLast = call >= pages.length;
      return {
        Items: [page.rec],
        ...(isLast ? {} : { LastEvaluatedKey: { flowDefinitionId: FLOW_ID, startTime: page.rec.startTime, flowExecutionId: page.rec.flowExecutionId, eventTimestamp_stepInstanceId_attempt: 'METADATA' } }),
      };
    });

    const result = await ExecutionMonitoringService.listExecutions(FLOW_ID, {}, { limit: 3 });

    expect(result.items.map((i) => i.flowExecutionId)).toEqual(['exec-1', 'exec-2', 'exec-3']);
    expect(result.nextToken).toBeUndefined(); // index exhausted
  });

  it('trims to the page size and returns a resume token built from the last returned record', async () => {
    const recs = [
      flowRecord('exec-1', '2026-06-20T12:00:00.000Z'),
      flowRecord('exec-2', '2026-06-20T11:00:00.000Z'),
      flowRecord('exec-3', '2026-06-20T10:00:00.000Z'),
    ];
    // One page returns more matching records than the caller asked for.
    ddbMock.on(QueryCommand).resolves({ Items: recs, LastEvaluatedKey: { foo: 'bar' } });

    const result = await ExecutionMonitoringService.listExecutions(FLOW_ID, {}, { limit: 2 });

    expect(result.items.map((i) => i.flowExecutionId)).toEqual(['exec-1', 'exec-2']);
    expect(result.nextToken).toBeDefined();
    const resume = JSON.parse(Buffer.from(result.nextToken!, 'base64').toString('utf-8'));
    // The cursor must point at the last *returned* record, not the page's LastEvaluatedKey, so the
    // next request does not skip exec-3.
    expect(resume).toEqual({
      flowDefinitionId: FLOW_ID,
      startTime: '2026-06-20T11:00:00.000Z',
      flowExecutionId: 'exec-2',
      eventTimestamp_stepInstanceId_attempt: 'METADATA',
    });
  });
});
