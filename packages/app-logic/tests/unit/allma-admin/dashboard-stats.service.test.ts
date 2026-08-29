import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from '../_helpers/aws-mock.js';

process.env.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME = 'test-exec-log-table';

const { getDashboardStats, DashboardStatsService } = await import(
    '../../../src/allma-admin/services/dashboard-stats.service.js'
);

const ddbMock = mockClient(DynamoDBDocumentClient);

const NOW = new Date('2026-06-21T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const iso = (msAgo: number) => new Date(NOW.getTime() - msAgo).toISOString();

describe('DashboardStatsService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        ddbMock.reset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('queries 24h, 7d, and recent failures and aggregates stats correctly', async () => {
        const records24h = [
            {
                flowExecutionId: 'exec-1',
                status: 'COMPLETED',
                startTime: iso(2 * HOUR),
                endTime: iso(1 * HOUR),
            },
            {
                flowExecutionId: 'exec-2',
                status: 'FAILED',
                startTime: iso(3 * HOUR),
                endTime: iso(2 * HOUR),
            },
        ];

        const records7d = [
            ...records24h,
            {
                flowExecutionId: 'exec-3',
                status: 'RUNNING',
                startTime: iso(2 * DAY),
            },
            {
                flowExecutionId: 'exec-4',
                status: 'TIMED_OUT',
                startTime: iso(3 * DAY),
            },
            {
                flowExecutionId: 'exec-5',
                status: 'CANCELLED',
                startTime: iso(4 * DAY),
            },
            {
                flowExecutionId: 'exec-6',
                status: 'COMPLETED',
                startTime: iso(5 * DAY),
                endTime: new Date(new Date(iso(5 * DAY)).getTime() + 1800000).toISOString(),
            },
        ];

        const recentFailures = [
            {
                flowExecutionId: 'exec-2',
                flowDefinitionId: 'flow-a',
                flowDefinitionVersion: 1,
                startTime: iso(3 * HOUR),
                errorInfo: { errorName: 'StepTimeoutError' },
            },
        ];

        ddbMock
            .on(QueryCommand, {
                ExpressionAttributeValues: {
                    ':itemType': 'ALLMA_FLOW_EXECUTION_RECORD',
                    ':start': iso(24 * HOUR),
                    ':end': NOW.toISOString(),
                },
            })
            .resolves({ Items: records24h })
            .on(QueryCommand, {
                ExpressionAttributeValues: {
                    ':itemType': 'ALLMA_FLOW_EXECUTION_RECORD',
                    ':start': iso(7 * DAY),
                    ':end': NOW.toISOString(),
                },
            })
            .resolves({ Items: records7d })
            .on(QueryCommand, {
                FilterExpression: '#status = :failedStatus',
            })
            .resolves({ Items: recentFailures });

        const stats = await getDashboardStats();

        expect(stats.last24Hours.totalExecutions).toBe(2);
        expect(stats.last24Hours.statusBreakdown.COMPLETED).toBe(1);
        expect(stats.last24Hours.statusBreakdown.FAILED).toBe(1);
        expect(stats.last24Hours.averageDurationMs).toBe(3600000);

        expect(stats.last7Days.totalExecutions).toBe(6);
        expect(stats.last7Days.statusBreakdown.COMPLETED).toBe(2);
        expect(stats.last7Days.statusBreakdown.FAILED).toBe(1);
        expect(stats.last7Days.statusBreakdown.RUNNING).toBe(1);
        expect(stats.last7Days.statusBreakdown.TIMED_OUT).toBe(1);
        expect(stats.last7Days.statusBreakdown.CANCELLED).toBe(1);
        expect(stats.last7Days.averageDurationMs).toBe((3600000 + 1800000) / 2);

        expect(stats.recentFailures).toEqual([
            {
                flowExecutionId: 'exec-2',
                flowDefinitionId: 'flow-a',
                flowDefinitionVersion: 1,
                startTime: iso(3 * HOUR),
                errorName: 'StepTimeoutError',
            },
        ]);
    });

    it('handles pagination across multiple pages with LastEvaluatedKey', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });
        ddbMock
            .on(QueryCommand, {
                ExpressionAttributeValues: {
                    ':itemType': 'ALLMA_FLOW_EXECUTION_RECORD',
                    ':start': iso(24 * HOUR),
                    ':end': NOW.toISOString(),
                },
            })
            .resolvesOnce({
                Items: [{ flowExecutionId: 'exec-p1', status: 'COMPLETED', startTime: iso(2 * HOUR), endTime: iso(1 * HOUR) }],
                LastEvaluatedKey: { PK: 'PAGE_2' },
            })
            .resolvesOnce({
                Items: [{ flowExecutionId: 'exec-p2', status: 'COMPLETED', startTime: iso(3 * HOUR), endTime: iso(2 * HOUR) }],
            });

        const stats = await getDashboardStats();
        expect(stats.last24Hours.totalExecutions).toBe(2);
        expect(stats.last24Hours.statusBreakdown.COMPLETED).toBe(2);
    });

    it('falls back to Unknown Error when errorInfo is missing on failed records', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [
                {
                    flowExecutionId: 'exec-err',
                    flowDefinitionId: 'flow-err',
                    flowDefinitionVersion: 2,
                    startTime: iso(1 * HOUR),
                },
            ],
        });

        const stats = await getDashboardStats();
        expect(stats.recentFailures[0].errorName).toBe('Unknown Error');
    });

    it('returns zeroes and empty lists when no records exist', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const stats = await getDashboardStats();
        expect(stats.last24Hours.totalExecutions).toBe(0);
        expect(stats.last24Hours.averageDurationMs).toBe(0);
        expect(stats.last24Hours.statusBreakdown.COMPLETED).toBe(0);
        expect(stats.last7Days.totalExecutions).toBe(0);
        expect(stats.recentFailures).toEqual([]);
    });

    it('propagates DynamoDB query errors', async () => {
        ddbMock.on(QueryCommand).rejects(new Error('DynamoDB connection failed'));

        await expect(getDashboardStats()).rejects.toThrow('DynamoDB connection failed');
    });

    it('exports DashboardStatsService object with getDashboardStats method', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const stats = await DashboardStatsService.getDashboardStats();
        expect(stats.last24Hours.totalExecutions).toBe(0);
    });
});
