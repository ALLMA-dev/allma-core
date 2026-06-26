import type { FlowDefinition, StampedCheckpoint } from '@allma/core-types';

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'];

/** A declared checkpoint plus the step it lives on and its 1-based ordinal among all checkpoints. */
export interface DeclaredCheckpoint extends StampedCheckpoint {
    stepInstanceId: string;
    ordinal: number;
}

/**
 * Lists the steps in a flow definition that declare a `checkpoint`, ordered by `checkpoint.order`
 * (undefined orders sort last but keep definition order), each annotated with a 1-based `ordinal`.
 */
export function getDeclaredCheckpoints(flowDef: FlowDefinition): DeclaredCheckpoint[] {
    return Object.entries(flowDef.steps)
        .filter(([, s]) => (s as any).checkpoint)
        .map(([stepInstanceId, s]) => ({ stepInstanceId, ...((s as any).checkpoint as StampedCheckpoint) }))
        .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
        .map((c, i) => ({ ...c, ordinal: i + 1 }));
}

/** The progress fields stamped onto a flow execution's metadata record. */
export interface ProgressStamp {
    currentStepInstanceId?: string;
    currentStepDisplayName?: string;
    currentStepType?: string;
    completedStepCount?: number;
    totalStepCount?: number;
    currentCheckpoint?: StampedCheckpoint;
    totalCheckpoints?: number;
    progressPercent: number;
    progressUpdatedAt: string;
}

export interface ProgressComputation {
    stamp: ProgressStamp;
    /** The highest checkpoint reached so far, to carry forward in the runtime state (monotonic). */
    reachedCheckpoint?: StampedCheckpoint;
    /** The 1-based ordinal of `reachedCheckpoint` among all declared checkpoints (0 if none). */
    reachedOrdinal: number;
    /** True when this boundary advanced the reached checkpoint (gates the low-volume bubble-up). */
    checkpointChanged: boolean;
}

/**
 * Computes the progress stamp for a step boundary from the flow definition and the runtime
 * counters carried through the loop. Pure and synchronous so it is cheap to call per step and
 * easy to unit test. Progress is measured against checkpoints when the flow declares any (L2),
 * otherwise against completed-step count (L1); it is monotonic and clamps to 100% on completion.
 */
export function computeProgressStamp(params: {
    flowDef: FlowDefinition;
    currentStepInstanceId?: string;
    completedStepCount: number;
    status: string;
    reachedCheckpoint?: StampedCheckpoint;
    now: string;
}): ProgressComputation {
    const { flowDef, currentStepInstanceId, completedStepCount, status, reachedCheckpoint, now } = params;
    const isTerminal = TERMINAL_STATUSES.includes(status);

    const totalStepCount = Object.keys(flowDef.steps).length;
    const checkpoints = getDeclaredCheckpoints(flowDef);
    const totalCheckpoints = checkpoints.length;

    const ordinalOf = (cp?: StampedCheckpoint): number =>
        cp ? (checkpoints.find((c) => c.id === cp.id)?.ordinal ?? 0) : 0;

    // Advance the reached checkpoint if the current step declares one further along than what we
    // have already reached (monotonic by ordinal, so loops never move the bar backward).
    let newReached = reachedCheckpoint;
    let checkpointChanged = false;
    const currentCp = currentStepInstanceId
        ? checkpoints.find((c) => c.stepInstanceId === currentStepInstanceId)
        : undefined;
    if (currentCp && currentCp.ordinal > ordinalOf(reachedCheckpoint)) {
        newReached = { id: currentCp.id, label: currentCp.label, order: currentCp.order };
        checkpointChanged = true;
    }
    const reachedOrdinal = ordinalOf(newReached);
    const reachedWithOrdinal: StampedCheckpoint | undefined = newReached
        ? { ...newReached, ordinal: reachedOrdinal }
        : undefined;

    let progressPercent: number;
    if (status === 'COMPLETED') {
        progressPercent = 100;
    } else if (totalCheckpoints > 0) {
        progressPercent = Math.round((100 * reachedOrdinal) / totalCheckpoints);
    } else if (totalStepCount > 0) {
        progressPercent = Math.round((100 * completedStepCount) / totalStepCount);
    } else {
        progressPercent = 0;
    }
    progressPercent = Math.max(0, Math.min(100, progressPercent));

    const currentStepDef = currentStepInstanceId ? (flowDef.steps[currentStepInstanceId] as any) : undefined;

    const stamp: ProgressStamp = {
        completedStepCount,
        totalStepCount,
        progressPercent,
        progressUpdatedAt: now,
        ...(totalCheckpoints > 0 && { totalCheckpoints }),
        ...(reachedWithOrdinal && { currentCheckpoint: reachedWithOrdinal }),
        // Once terminal there is no "current" step to point at.
        ...(!isTerminal && currentStepInstanceId && {
            currentStepInstanceId,
            currentStepDisplayName: currentStepDef?.displayName,
            currentStepType: currentStepDef?.stepType,
        }),
    };

    return { stamp, reachedCheckpoint: newReached, reachedOrdinal, checkpointChanged };
}
