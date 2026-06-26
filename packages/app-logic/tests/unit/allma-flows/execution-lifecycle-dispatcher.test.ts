import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

/**
 * Covers the crash-safe terminal dispatcher (Pillar C, §7.3): reconcile of zombie-RUNNING records,
 * the no-op when already terminal, the no-op when no metadata exists, and TERMINAL emission with
 * DLQ-backstop behaviour on sink failure.
 */

vi.hoisted(() => {
    process.env.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME = 'exec-log-table';
    process.env.ALLMA_EXECUTION_STATUS_TOPIC_ARN = 'arn:aws:sns:us-east-1:1:AllmaExecutionStatusTopic-dev';
});

vi.mock('../../../src/allma-core/notifications/execution-notifier.js', async (importOriginal) => {
    const original = await importOriginal<Record<string, unknown>>();
    return { ...original, emitLifecycleEvent: vi.fn().mockResolvedValue(0) };
});

const { handler } = await import('../../../src/allma-flows/execution-lifecycle-dispatcher.js');
const notifier = await import('../../../src/allma-core/notifications/execution-notifier.js');
const mockedEmit = vi.mocked(notifier.emitLifecycleEvent);

const ddbMock = mockClient(DynamoDBDocumentClient);

const EXEC_ARN = 'arn:aws:states:us-east-1:123:execution:AllmaFlowOrchestrator-dev:abc-123';

const invoke = (detail: Record<string, any>) => handler({ detail } as any, {} as never, (() => undefined) as never);

const meta = (overrides: Record<string, any> = {}) => ({
    flowExecutionId: 'abc-123',
    eventTimestamp_stepInstanceId_attempt: 'METADATA',
    itemType: 'ALLMA_FLOW_EXECUTION_RECORD',
    flowDefinitionId: 'flow-a',
    flowDefinitionVersion: 1,
    status: 'RUNNING',
    startTime: '2026-06-27T00:00:00.000Z',
    rootFlowExecutionId: 'abc-123',
    depth: 0,
    ...overrides,
});

beforeEach(() => {
    resetAwsClientMocks(ddbMock);
    mockedEmit.mockClear();
    mockedEmit.mockResolvedValue(0);
});

describe('execution-lifecycle-dispatcher', () => {
    it('reconciles a zombie-RUNNING record to its terminal status and emits TERMINAL', async () => {
        ddbMock.on(GetCommand).resolves({ Item: meta({ status: 'RUNNING' }) });
        ddbMock.on(UpdateCommand).resolves({});

        await invoke({ executionArn: EXEC_ARN, status: 'FAILED', cause: 'boom', error: 'States.Runtime' });

        const updates = ddbMock.commandCalls(UpdateCommand);
        expect(updates).toHaveLength(1);
        expect(updates[0].args[0].input.ExpressionAttributeValues?.[':status']).toBe('FAILED');
        expect(updates[0].args[0].input.ConditionExpression).toContain('#status = :running');

        expect(mockedEmit).toHaveBeenCalledOnce();
        const emitted = mockedEmit.mock.calls[0][0].event;
        expect(emitted.eventType).toBe('TERMINAL');
        expect(emitted.status).toBe('FAILED');
        expect(emitted.errorInfo?.errorMessage).toBe('boom');
    });

    it('maps ABORTED to CANCELLED', async () => {
        ddbMock.on(GetCommand).resolves({ Item: meta({ status: 'RUNNING' }) });
        ddbMock.on(UpdateCommand).resolves({});
        await invoke({ executionArn: EXEC_ARN, status: 'ABORTED' });
        expect(ddbMock.commandCalls(UpdateCommand)[0].args[0].input.ExpressionAttributeValues?.[':status']).toBe('CANCELLED');
        expect(mockedEmit.mock.calls[0][0].event.status).toBe('CANCELLED');
    });

    it('does not write when the record is already terminal, but still emits TERMINAL (graceful path)', async () => {
        ddbMock.on(GetCommand).resolves({ Item: meta({ status: 'COMPLETED', progressPercent: 100 }) });
        await invoke({ executionArn: EXEC_ARN, status: 'SUCCEEDED' });
        expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
        expect(mockedEmit).toHaveBeenCalledOnce();
        expect(mockedEmit.mock.calls[0][0].event.status).toBe('COMPLETED');
    });

    it('is a no-op when no metadata record exists (branch / polling sub-execution)', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });
        await invoke({ executionArn: EXEC_ARN, status: 'SUCCEEDED' });
        expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
        expect(mockedEmit).not.toHaveBeenCalled();
    });

    it('throws when sink delivery fails so EventBridge retry + the DLQ back it up', async () => {
        ddbMock.on(GetCommand).resolves({ Item: meta({ status: 'COMPLETED' }) });
        mockedEmit.mockResolvedValue(1);
        await expect(invoke({ executionArn: EXEC_ARN, status: 'SUCCEEDED' })).rejects.toThrow(/Failed to deliver TERMINAL/);
    });

    it('ignores events with no mappable terminal status', async () => {
        await invoke({ executionArn: EXEC_ARN, status: 'RUNNING' });
        expect(ddbMock.commandCalls(GetCommand)).toHaveLength(0);
        expect(mockedEmit).not.toHaveBeenCalled();
    });
});
