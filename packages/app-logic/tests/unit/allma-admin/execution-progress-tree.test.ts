import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

/**
 * Pins the Pillar B read API: `getExecutionProgress` prefers the orchestrator-stamped metadata in
 * `single` mode, falls back to read-time derivation for un-stamped/legacy executions, and assembles
 * the nested sub-flow tree from a single GSI_ByRoot query in `tree` mode.
 */

vi.hoisted(() => {
    process.env.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME = 'exec-log-table';
});

vi.mock('../../../src/allma-core/config-loader.js', () => ({
    loadFlowDefinition: vi.fn(),
}));

const { ExecutionMonitoringService } = await import('../../../src/allma-admin/services/execution-monitoring.service.js');
const { loadFlowDefinition } = await import('../../../src/allma-core/config-loader.js');
const mockedLoadDef = vi.mocked(loadFlowDefinition);

const ddbMock = mockClient(DynamoDBDocumentClient);

const ROOT = '11111111-1111-1111-1111-111111111111';
const CHILD = '22222222-2222-2222-2222-222222222222';

const stampedMeta = (overrides: Record<string, any> = {}) => ({
    flowExecutionId: ROOT,
    eventTimestamp_stepInstanceId_attempt: 'METADATA',
    itemType: 'ALLMA_FLOW_EXECUTION_RECORD',
    flowDefinitionId: 'flow-a',
    flowDefinitionVersion: 1,
    status: 'RUNNING',
    startTime: '2026-06-27T00:00:00.000Z',
    executionKind: 'ROOT',
    rootFlowExecutionId: ROOT,
    depth: 0,
    // Stamped fields (Pillar A):
    progressUpdatedAt: '2026-06-27T00:00:05.000Z',
    progressPercent: 40,
    completedStepCount: 2,
    totalStepCount: 5,
    currentStepInstanceId: 's3',
    currentStepDisplayName: 'Third',
    currentStepType: 'NO_OP',
    ...overrides,
});

beforeEach(() => {
    resetAwsClientMocks(ddbMock);
    mockedLoadDef.mockReset();
});

describe('getExecutionProgress — single mode', () => {
    it('serves the stamped metadata directly (no step-record/flow-def reads)', async () => {
        ddbMock.on(GetCommand).resolves({ Item: stampedMeta() });

        const res = await ExecutionMonitoringService.getExecutionProgress(ROOT, 'corr', 'single');

        expect(res).not.toBeNull();
        expect(res!.root.progressPercent).toBe(40);
        expect(res!.root.completedStepCount).toBe(2);
        expect(res!.root.currentStep?.displayName).toBe('Third');
        expect(res!.headline.label).toBe('Third');
        // Stamped path must not touch the flow definition.
        expect(mockedLoadDef).not.toHaveBeenCalled();
    });

    it('falls back to read-time derivation when the record is not stamped', async () => {
        const unstamped = stampedMeta({ progressUpdatedAt: undefined, progressPercent: undefined });
        delete (unstamped as any).progressUpdatedAt;
        delete (unstamped as any).progressPercent;

        ddbMock.on(GetCommand).resolves({ Item: unstamped });
        // _getExecutionRecords (base-table Query) returns one completed step.
        ddbMock.on(QueryCommand).resolves({
            Items: [
                {
                    flowExecutionId: ROOT,
                    itemType: 'ALLMA_STEP_EXECUTION_RECORD',
                    eventTimestamp: '2026-06-27T00:00:01.000Z',
                    stepInstanceId: 's1',
                    stepType: 'NO_OP',
                    status: 'COMPLETED',
                    startTime: '2026-06-27T00:00:01.000Z',
                },
            ],
        });
        mockedLoadDef.mockResolvedValue({
            id: 'flow-a',
            version: 1,
            startStepInstanceId: 's1',
            steps: { s1: { stepInstanceId: 's1', stepType: 'NO_OP' }, s2: { stepInstanceId: 's2', stepType: 'NO_OP' } },
        } as any);

        const res = await ExecutionMonitoringService.getExecutionProgress(ROOT, 'corr', 'single');

        expect(mockedLoadDef).toHaveBeenCalledOnce();
        expect(res!.root.completedStepCount).toBe(1);
        expect(res!.root.totalStepCount).toBe(2);
        expect(res!.root.progressPercent).toBe(50);
    });

    it('returns null when the execution does not exist', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });
        const res = await ExecutionMonitoringService.getExecutionProgress(ROOT, 'corr', 'single');
        expect(res).toBeNull();
    });
});

describe('getExecutionProgress — tree mode', () => {
    it('assembles nested sub-flow nodes and points the headline at the deepest active leaf', async () => {
        ddbMock.on(GetCommand).resolves({ Item: stampedMeta() });
        ddbMock.on(QueryCommand).resolves({
            Items: [
                stampedMeta(),
                stampedMeta({
                    flowExecutionId: CHILD,
                    executionKind: 'SYNC_SUBFLOW',
                    depth: 1,
                    parentFlowExecutionId: ROOT,
                    parentStepInstanceId: 's3',
                    progressPercent: 75,
                    currentStepDisplayName: 'Child step',
                    startTime: '2026-06-27T00:00:02.000Z',
                }),
            ],
        });

        const res = await ExecutionMonitoringService.getExecutionProgress(ROOT, 'corr', 'tree');

        expect(res!.root.flowExecutionId).toBe(ROOT);
        expect(res!.root.children).toHaveLength(1);
        expect(res!.root.children[0].flowExecutionId).toBe(CHILD);
        expect(res!.root.children[0].executionKind).toBe('SYNC_SUBFLOW');
        expect(res!.root.children[0].parentStepInstanceId).toBe('s3');
        // Deepest active leaf is the child.
        expect(res!.headline.executionId).toBe(CHILD);
        expect(res!.headline.label).toBe('Child step');
    });

    it('degrades to a single-node tree when there is no linkage (legacy execution)', async () => {
        ddbMock.on(GetCommand).resolves({ Item: stampedMeta() });
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await ExecutionMonitoringService.getExecutionProgress(ROOT, 'corr', 'tree');

        expect(res!.root.flowExecutionId).toBe(ROOT);
        expect(res!.root.children).toHaveLength(0);
    });
});
