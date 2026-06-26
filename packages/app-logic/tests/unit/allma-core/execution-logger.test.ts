import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { ExecutionLoggerPayload } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

/**
 * Covers the logger actions added for live progress / execution trees: CREATE_METADATA now stamps
 * tree linkage + a GSI sort key, and the new UPDATE_PROGRESS action guards a monotonic self-stamp
 * and an optional bubble-up to the root, swallowing conditional-check failures as benign no-ops.
 */

vi.hoisted(() => {
    process.env.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME = 'exec-log-table';
});

const { handler } = await import('../../../src/allma-core/execution-logger.js');
const ddbMock = mockClient(DynamoDBDocumentClient);

const invoke = (payload: ExecutionLoggerPayload) => handler(payload, {} as never, (() => undefined) as never);

beforeEach(() => {
    resetAwsClientMocks(ddbMock);
});

describe('CREATE_METADATA', () => {
    it('defaults to a ROOT node and a depth-0 tree sort key for a top-level execution', async () => {
        ddbMock.on(PutCommand).resolves({});
        await invoke({
            action: 'CREATE_METADATA',
            record: {
                flowExecutionId: '11111111-1111-1111-1111-111111111111',
                flowDefinitionId: 'flow-a',
                flowDefinitionVersion: 1,
                startTime: '2026-06-27T00:00:00.000Z',
                initialInputPayload: { flowDefinitionId: 'flow-a' } as any,
                enableExecutionLogs: true,
            },
        });

        const item = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item as any;
        expect(item.executionKind).toBe('ROOT');
        expect(item.rootFlowExecutionId).toBe('11111111-1111-1111-1111-111111111111');
        expect(item.depth).toBe(0);
        expect(item.tree_sort_key).toBe('0000##11111111-1111-1111-1111-111111111111');
    });

    it('persists supplied sub-flow linkage and encodes it into the tree sort key', async () => {
        ddbMock.on(PutCommand).resolves({});
        await invoke({
            action: 'CREATE_METADATA',
            record: {
                flowExecutionId: '22222222-2222-2222-2222-222222222222',
                flowDefinitionId: 'flow-b',
                flowDefinitionVersion: 1,
                startTime: '2026-06-27T00:00:00.000Z',
                initialInputPayload: { flowDefinitionId: 'flow-b' } as any,
                enableExecutionLogs: true,
                parentFlowExecutionId: '11111111-1111-1111-1111-111111111111',
                parentStepInstanceId: 's3',
                rootFlowExecutionId: '11111111-1111-1111-1111-111111111111',
                depth: 1,
                executionKind: 'SYNC_SUBFLOW',
            },
        });

        const item = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item as any;
        expect(item.executionKind).toBe('SYNC_SUBFLOW');
        expect(item.rootFlowExecutionId).toBe('11111111-1111-1111-1111-111111111111');
        expect(item.tree_sort_key).toBe('0001#s3#22222222-2222-2222-2222-222222222222');
    });
});

describe('UPDATE_PROGRESS', () => {
    const basePayload = (): ExecutionLoggerPayload => ({
        action: 'UPDATE_PROGRESS',
        flowExecutionId: '22222222-2222-2222-2222-222222222222',
        progress: {
            progressUpdatedAt: '2026-06-27T00:00:05.000Z',
            progressPercent: 50,
            completedStepCount: 2,
            totalStepCount: 4,
            currentStepInstanceId: 's2',
            currentCheckpoint: { id: 'b', label: 'Extract', order: 1, ordinal: 2 },
            totalCheckpoints: 3,
        },
        rootBubbleUp: {
            rootFlowExecutionId: '11111111-1111-1111-1111-111111111111',
            liveStatus: {
                activeExecutionId: '22222222-2222-2222-2222-222222222222',
                depth: 1,
                checkpointId: 'b',
                checkpointLabel: 'Extract',
                percent: 50,
                updatedAt: '2026-06-27T00:00:05.000Z',
            },
        },
    });

    it('stamps the own record (guarded, monotonic) and bubbles up to the root', async () => {
        ddbMock.on(UpdateCommand).resolves({});
        await invoke(basePayload());

        const calls = ddbMock.commandCalls(UpdateCommand);
        expect(calls).toHaveLength(2);

        const selfStamp = calls[0].args[0].input;
        expect(selfStamp.Key).toMatchObject({ flowExecutionId: '22222222-2222-2222-2222-222222222222', eventTimestamp_stepInstanceId_attempt: 'METADATA' });
        expect(selfStamp.UpdateExpression).toContain('#progressPercent = :progressPercent');
        expect(selfStamp.ConditionExpression).toContain('attribute_exists(#sk)');
        expect(selfStamp.ConditionExpression).toContain('#progressUpdatedAt <= :progressUpdatedAt');

        const bubble = calls[1].args[0].input;
        expect(bubble.Key).toMatchObject({ flowExecutionId: '11111111-1111-1111-1111-111111111111' });
        expect(bubble.UpdateExpression).toContain('#liveStatus = :liveStatus');
    });

    it('does not bubble up when no rootBubbleUp is supplied', async () => {
        ddbMock.on(UpdateCommand).resolves({});
        const payload = basePayload();
        delete (payload as any).rootBubbleUp;
        await invoke(payload);
        expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
    });

    it('swallows a conditional-check failure (out-of-order / missing record) without throwing', async () => {
        ddbMock.on(UpdateCommand).rejects(Object.assign(new Error('conditional'), { name: 'ConditionalCheckFailedException' }));
        await expect(invoke(basePayload())).resolves.toBeUndefined();
    });
});
