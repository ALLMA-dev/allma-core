import { describe, it, expect } from 'vitest';
import { _computeExecutionProgress } from '../../../src/allma-admin/services/execution-monitoring.service.js';
import type { AllmaFlowExecutionRecord, AllmaStepExecutionRecord, FlowDefinition } from '@allma/core-types';

/**
 * `_computeExecutionProgress` derives the live progress node (current step, stage/checkpoint,
 * completed/total, percentage, waiting-state) from an execution's metadata + step records and
 * its flow definition. These tests pin the read-time progress contract that the Admin UI and
 * consumer status views depend on.
 */

const baseMetadata = (overrides: Partial<AllmaFlowExecutionRecord> = {}): AllmaFlowExecutionRecord =>
  ({
    flowExecutionId: '11111111-1111-1111-1111-111111111111',
    eventTimestamp_stepInstanceId_attempt: 'METADATA',
    itemType: 'ALLMA_FLOW_EXECUTION_RECORD',
    flowDefinitionId: 'flow-a',
    flowDefinitionVersion: 1,
    status: 'RUNNING',
    startTime: '2026-01-01T00:00:00.000Z',
    initialInputPayload: { flowDefinitionId: 'flow-a' },
    enableExecutionLogs: true,
    ...overrides,
  }) as AllmaFlowExecutionRecord;

// Minimal step event; only the fields the progress computation reads are required.
const stepEvent = (
  stepInstanceId: string,
  status: AllmaStepExecutionRecord['status'],
  eventTimestamp: string,
  stepType = 'NO_OP',
): AllmaStepExecutionRecord =>
  ({
    flowExecutionId: '11111111-1111-1111-1111-111111111111',
    eventTimestamp_stepInstanceId_attempt: `STEP#${eventTimestamp}#${stepInstanceId}#1#${status}`,
    itemType: 'ALLMA_STEP_EXECUTION_RECORD',
    eventTimestamp,
    stepInstanceId,
    stepType,
    status,
    startTime: eventTimestamp,
    fullRecordS3Pointer: { bucket: 'b', key: 'k' },
  }) as AllmaStepExecutionRecord;

const flowDef = (steps: Record<string, any>): FlowDefinition =>
  ({ id: 'flow-a', version: 1, startStepInstanceId: 's1', steps } as unknown as FlowDefinition);

describe('_computeExecutionProgress', () => {
  it('uses step-count progress when the flow declares no checkpoints', () => {
    const def = flowDef({
      s1: { stepInstanceId: 's1', stepType: 'NO_OP', displayName: 'First' },
      s2: { stepInstanceId: 's2', stepType: 'NO_OP', displayName: 'Second' },
      s3: { stepInstanceId: 's3', stepType: 'NO_OP', displayName: 'Third' },
      s4: { stepInstanceId: 's4', stepType: 'NO_OP', displayName: 'Fourth' },
    });
    const events = [
      stepEvent('s1', 'STARTED', '2026-01-01T00:00:01.000Z'),
      stepEvent('s1', 'COMPLETED', '2026-01-01T00:00:02.000Z'),
      stepEvent('s2', 'STARTED', '2026-01-01T00:00:03.000Z'),
      stepEvent('s2', 'COMPLETED', '2026-01-01T00:00:04.000Z'),
      stepEvent('s3', 'STARTED', '2026-01-01T00:00:05.000Z'),
    ];

    const node = _computeExecutionProgress(baseMetadata(), events, def);

    expect(node.completedStepCount).toBe(2);
    expect(node.totalStepCount).toBe(4);
    expect(node.progressPercent).toBe(50); // 2 of 4 completed
    expect(node.currentStep?.stepInstanceId).toBe('s3');
    expect(node.currentStep?.displayName).toBe('Third');
    expect(node.currentCheckpoint).toBeUndefined();
    expect(node.isWaiting).toBe(false);
  });

  it('measures progress against checkpoints when declared, using the highest reached', () => {
    const def = flowDef({
      s1: { stepInstanceId: 's1', stepType: 'NO_OP', checkpoint: { id: 'a', label: 'Upload', order: 0 } },
      s2: { stepInstanceId: 's2', stepType: 'NO_OP' },
      s3: { stepInstanceId: 's3', stepType: 'NO_OP', checkpoint: { id: 'b', label: 'Extract', order: 1 } },
      s4: { stepInstanceId: 's4', stepType: 'NO_OP', checkpoint: { id: 'c', label: 'Save', order: 2 } },
    });
    const events = [
      stepEvent('s1', 'STARTED', '2026-01-01T00:00:01.000Z'),
      stepEvent('s1', 'COMPLETED', '2026-01-01T00:00:02.000Z'),
      stepEvent('s2', 'COMPLETED', '2026-01-01T00:00:03.000Z'),
      stepEvent('s3', 'STARTED', '2026-01-01T00:00:04.000Z'),
    ];

    const node = _computeExecutionProgress(baseMetadata(), events, def);

    expect(node.totalCheckpoints).toBe(3);
    expect(node.currentCheckpoint).toMatchObject({ id: 'b', label: 'Extract', ordinal: 2 });
    expect(node.progressPercent).toBe(67); // round(100 * 2/3)
  });

  it('flags the waiting state for long-pausing step types', () => {
    const def = flowDef({
      s1: { stepInstanceId: 's1', stepType: 'WAIT_FOR_EXTERNAL_EVENT', displayName: 'Await approval' },
    });
    const events = [stepEvent('s1', 'STARTED', '2026-01-01T00:00:01.000Z', 'WAIT_FOR_EXTERNAL_EVENT')];

    const node = _computeExecutionProgress(baseMetadata(), events, def);

    expect(node.isWaiting).toBe(true);
    expect(node.currentStep?.stepInstanceId).toBe('s1');
  });

  it('clamps to 100% and drops the current step on terminal COMPLETED', () => {
    const def = flowDef({
      s1: { stepInstanceId: 's1', stepType: 'NO_OP', checkpoint: { id: 'a', label: 'Start', order: 0 } },
      s2: { stepInstanceId: 's2', stepType: 'NO_OP', checkpoint: { id: 'b', label: 'End', order: 1 } },
    });
    // Only the first checkpoint was reached, but the flow completed → bar must still read 100%.
    const events = [
      stepEvent('s1', 'STARTED', '2026-01-01T00:00:01.000Z'),
      stepEvent('s1', 'COMPLETED', '2026-01-01T00:00:02.000Z'),
    ];

    const node = _computeExecutionProgress(
      baseMetadata({ status: 'COMPLETED', endTime: '2026-01-01T00:00:03.000Z' }),
      events,
      def,
    );

    expect(node.progressPercent).toBe(100);
    expect(node.currentStep).toBeUndefined();
  });

  it('degrades gracefully when the flow definition is unavailable', () => {
    const events = [
      stepEvent('s1', 'COMPLETED', '2026-01-01T00:00:02.000Z'),
      stepEvent('s2', 'STARTED', '2026-01-01T00:00:03.000Z'),
    ];

    const node = _computeExecutionProgress(baseMetadata(), events, undefined);

    expect(node.totalStepCount).toBeUndefined();
    expect(node.totalCheckpoints).toBeUndefined();
    expect(node.completedStepCount).toBe(1);
    // No definition → cannot resolve a percentage from a denominator, stays at 0 while running.
    expect(node.progressPercent).toBe(0);
    // Current step still identified from the records, with stepType falling back to the event.
    expect(node.currentStep?.stepInstanceId).toBe('s2');
  });
});
