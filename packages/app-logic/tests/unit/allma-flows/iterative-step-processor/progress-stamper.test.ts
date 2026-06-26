import { describe, it, expect } from 'vitest';
import { computeProgressStamp, getDeclaredCheckpoints } from '../../../../src/allma-flows/iterative-step-processor/progress-stamper.js';
import type { FlowDefinition } from '@allma/core-types';

/**
 * `computeProgressStamp` is the pure core of Pillar A stamping: from the flow definition and the
 * runtime counters carried through the loop it derives the progress fields written onto the
 * metadata record at each step boundary. These tests pin its checkpoint math, monotonicity, and
 * the L1/L2 percentage resolution.
 */

const flowDef = (steps: Record<string, any>): FlowDefinition =>
    ({ id: 'flow-a', version: 1, startStepInstanceId: 's1', steps } as unknown as FlowDefinition);

const NOW = '2026-06-27T00:00:00.000Z';

describe('getDeclaredCheckpoints', () => {
    it('orders checkpoints by order and assigns 1-based ordinals', () => {
        const def = flowDef({
            s1: { stepInstanceId: 's1', stepType: 'NO_OP', checkpoint: { id: 'b', label: 'B', order: 1 } },
            s2: { stepInstanceId: 's2', stepType: 'NO_OP' },
            s3: { stepInstanceId: 's3', stepType: 'NO_OP', checkpoint: { id: 'a', label: 'A', order: 0 } },
        });
        const cps = getDeclaredCheckpoints(def);
        expect(cps.map((c) => c.id)).toEqual(['a', 'b']);
        expect(cps.map((c) => c.ordinal)).toEqual([1, 2]);
        expect(cps[0].stepInstanceId).toBe('s3');
    });
});

describe('computeProgressStamp', () => {
    it('uses step-count progress (L1) when no checkpoints are declared', () => {
        const def = flowDef({
            s1: { stepInstanceId: 's1', stepType: 'NO_OP', displayName: 'First' },
            s2: { stepInstanceId: 's2', stepType: 'NO_OP', displayName: 'Second' },
            s3: { stepInstanceId: 's3', stepType: 'NO_OP' },
            s4: { stepInstanceId: 's4', stepType: 'NO_OP' },
        });
        const { stamp } = computeProgressStamp({
            flowDef: def,
            currentStepInstanceId: 's2',
            completedStepCount: 1,
            status: 'RUNNING',
            now: NOW,
        });
        expect(stamp.totalStepCount).toBe(4);
        expect(stamp.completedStepCount).toBe(1);
        expect(stamp.progressPercent).toBe(25); // 1 of 4
        expect(stamp.currentStepInstanceId).toBe('s2');
        expect(stamp.currentStepDisplayName).toBe('Second');
        expect(stamp.currentCheckpoint).toBeUndefined();
        expect(stamp.totalCheckpoints).toBeUndefined();
        expect(stamp.progressUpdatedAt).toBe(NOW);
    });

    it('measures progress against checkpoints (L2) when the current step declares one', () => {
        const def = flowDef({
            s1: { stepInstanceId: 's1', stepType: 'NO_OP', checkpoint: { id: 'a', label: 'Upload', order: 0 } },
            s2: { stepInstanceId: 's2', stepType: 'NO_OP', checkpoint: { id: 'b', label: 'Extract', order: 1 } },
            s3: { stepInstanceId: 's3', stepType: 'NO_OP', checkpoint: { id: 'c', label: 'Save', order: 2 } },
        });
        const { stamp, reachedCheckpoint, checkpointChanged, reachedOrdinal } = computeProgressStamp({
            flowDef: def,
            currentStepInstanceId: 's2',
            completedStepCount: 1,
            status: 'RUNNING',
            now: NOW,
        });
        expect(stamp.totalCheckpoints).toBe(3);
        expect(stamp.currentCheckpoint).toMatchObject({ id: 'b', label: 'Extract', ordinal: 2 });
        expect(stamp.progressPercent).toBe(67); // round(100 * 2/3)
        expect(reachedOrdinal).toBe(2);
        expect(checkpointChanged).toBe(true);
        expect(reachedCheckpoint).toMatchObject({ id: 'b' });
    });

    it('is monotonic: a loop re-entering an earlier checkpoint never moves the bar backward', () => {
        const def = flowDef({
            s1: { stepInstanceId: 's1', stepType: 'NO_OP', checkpoint: { id: 'a', label: 'A', order: 0 } },
            s2: { stepInstanceId: 's2', stepType: 'NO_OP', checkpoint: { id: 'b', label: 'B', order: 1 } },
        });
        // Already reached checkpoint b, now re-entering step s1 (checkpoint a).
        const { stamp, checkpointChanged } = computeProgressStamp({
            flowDef: def,
            currentStepInstanceId: 's1',
            completedStepCount: 3,
            status: 'RUNNING',
            reachedCheckpoint: { id: 'b', label: 'B', order: 1 },
            now: NOW,
        });
        expect(checkpointChanged).toBe(false);
        expect(stamp.currentCheckpoint).toMatchObject({ id: 'b', ordinal: 2 });
        expect(stamp.progressPercent).toBe(100); // still at the highest reached (2 of 2)
    });

    it('clamps to 100% and drops the current step on terminal COMPLETED', () => {
        const def = flowDef({
            s1: { stepInstanceId: 's1', stepType: 'NO_OP', checkpoint: { id: 'a', label: 'Start', order: 0 } },
            s2: { stepInstanceId: 's2', stepType: 'NO_OP', checkpoint: { id: 'b', label: 'End', order: 1 } },
        });
        const { stamp } = computeProgressStamp({
            flowDef: def,
            currentStepInstanceId: undefined,
            completedStepCount: 2,
            status: 'COMPLETED',
            reachedCheckpoint: { id: 'a', label: 'Start', order: 0 },
            now: NOW,
        });
        expect(stamp.progressPercent).toBe(100);
        expect(stamp.currentStepInstanceId).toBeUndefined();
    });
});
