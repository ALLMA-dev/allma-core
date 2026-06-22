import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from '../_helpers/aws-mock.js';

// The service reads the table name at module load, so set it before importing.
process.env.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME = 'test-exec-log-table';

const { getStepStats } = await import('../../../src/allma-admin/services/step-stats.service.js');

const ddbMock = mockClient(DynamoDBDocumentClient);

const NOW = new Date('2026-06-21T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const iso = (msAgo: number) => new Date(NOW.getTime() - msAgo).toISOString();

/** Records spanning the 24h and 7d windows, with a STARTED event that must be ignored. */
const records = [
  { stepType: 'LLM_INVOCATION', status: 'COMPLETED', startTime: iso(1 * HOUR), durationMs: 1000, flowDefinitionId: 'flow-a', inputTokens: 100, outputTokens: 50 },
  { stepType: 'API_CALL', status: 'FAILED', startTime: iso(2 * HOUR), durationMs: 500, flowDefinitionId: 'flow-a' },
  { stepType: 'LLM_INVOCATION', status: 'STARTED', startTime: iso(30 * 60 * 1000), flowDefinitionId: 'flow-a' },
  { stepType: 'LLM_INVOCATION', status: 'COMPLETED', startTime: iso(3 * DAY), durationMs: 2000, flowDefinitionId: 'flow-b', inputTokens: 200, outputTokens: 80 },
  { stepType: 'DATA_LOAD', status: 'COMPLETED', startTime: iso(6 * DAY), durationMs: 300, flowDefinitionId: 'flow-b' },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  ddbMock.reset();
  ddbMock.on(QueryCommand).resolves({ Items: records });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getStepStats', () => {
  it('counts only terminal events and excludes STARTED', async () => {
    const stats = await getStepStats();
    // 4 terminal events over 7d (the STARTED event is excluded).
    expect(stats.last7Days.totalSteps).toBe(4);
    // Only the two events from the last hour/two-hours fall in the 24h window.
    expect(stats.last24Hours.totalSteps).toBe(2);
  });

  it('aggregates per step type with failures, durations and tokens', async () => {
    const stats = await getStepStats();
    const byType = Object.fromEntries(stats.last7Days.byStepType.map((b) => [b.stepType, b]));

    expect(byType.LLM_INVOCATION.count).toBe(2);
    expect(byType.LLM_INVOCATION.failCount).toBe(0);
    expect(byType.LLM_INVOCATION.avgDurationMs).toBe(1500); // (1000 + 2000) / 2
    expect(byType.LLM_INVOCATION.inputTokens).toBe(300);
    expect(byType.LLM_INVOCATION.outputTokens).toBe(130);

    expect(byType.API_CALL.count).toBe(1);
    expect(byType.API_CALL.failCount).toBe(1);
  });

  it('groups by flow with nested per-step-type detail', async () => {
    const stats = await getStepStats();
    const byFlow = Object.fromEntries(stats.last7Days.byFlow.map((f) => [f.flowDefinitionId, f]));

    expect(byFlow['flow-a'].count).toBe(2);
    expect(byFlow['flow-a'].failCount).toBe(1);
    expect(byFlow['flow-b'].count).toBe(2);
    expect(byFlow['flow-b'].byStepType.map((t) => t.stepType).sort()).toEqual(['DATA_LOAD', 'LLM_INVOCATION']);
  });

  it('builds gap-filled hourly and daily series scoped to their windows', async () => {
    const stats = await getStepStats();
    // Hourly series counts only the 24h-window records.
    expect(stats.perHour.reduce((s, b) => s + b.count, 0)).toBe(2);
    // Daily series counts all 7d-window records.
    expect(stats.perDay.reduce((s, b) => s + b.count, 0)).toBe(4);
    // Series are contiguous (gap-filled): 7 daily buckets + the current partial day.
    expect(stats.perDay.length).toBeGreaterThanOrEqual(7);
  });

  it('passes the stepType filter through to the aggregation', async () => {
    const stats = await getStepStats({ stepType: 'LLM_INVOCATION' });
    expect(stats.filterStepType).toBe('LLM_INVOCATION');
    expect(stats.last7Days.byStepType.every((b) => b.stepType === 'LLM_INVOCATION')).toBe(true);
    expect(stats.last7Days.totalSteps).toBe(2);
  });
});
