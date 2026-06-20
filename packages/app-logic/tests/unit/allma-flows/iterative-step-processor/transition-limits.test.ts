import { describe, it, expect } from 'vitest';
import { PermanentStepError } from '@allma/core-types';
import { enforceTransitionLimits } from '../../../../src/allma-flows/iterative-step-processor/transition-limits.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

const cid = 'cid';

describe('enforceTransitionLimits', () => {
  it('is a no-op when there is no next step', () => {
    const rt = makeRuntimeState();
    enforceTransitionLimits(makeStepInstance(), undefined, { type: 'DEFAULT' }, rt, cid);
    expect(rt.transitionCounts).toEqual({});
  });

  it('is a no-op for terminal (END_OF_PATH) transitions', () => {
    const rt = makeRuntimeState();
    enforceTransitionLimits(makeStepInstance(), 'next', { type: 'END_OF_PATH' }, rt, cid);
    expect(rt.transitionCounts).toEqual({});
  });

  it('increments the default-transition counter', () => {
    const step = makeStepInstance({ stepInstanceId: 's1', defaultNextMaxTransitions: 5 });
    const rt = makeRuntimeState();
    enforceTransitionLimits(step, 'next', { type: 'DEFAULT' }, rt, cid);
    expect(rt.transitionCounts!['s1_default']).toBe(1);
  });

  it('increments the matched condition-transition counter using its index', () => {
    const step = makeStepInstance({
      stepInstanceId: 's1',
      transitions: [
        { condition: '$.a', nextStepInstanceId: 'A', maxTransitions: 5 },
        { condition: '$.b', nextStepInstanceId: 'B', maxTransitions: 5 },
      ],
    });
    const rt = makeRuntimeState();
    enforceTransitionLimits(step, 'B', { type: 'CONDITION', condition: '$.b' }, rt, cid);
    expect(rt.transitionCounts!['s1_transition_1']).toBe(1);
  });

  it('throws PermanentStepError and marks details when the limit is reached', () => {
    const step = makeStepInstance({ stepInstanceId: 's1', defaultNextMaxTransitions: 2 });
    const rt = makeRuntimeState({ transitionCounts: { s1_default: 2 } });
    const details: Record<string, unknown> = { type: 'DEFAULT' };

    expect(() => enforceTransitionLimits(step, 'next', details, rt, cid)).toThrow(PermanentStepError);
    expect(details.type).toBe('MAX_TRANSITIONS_REACHED');
    expect(details.chosenNextStepId).toBeUndefined();
  });

  it('treats maxTransitions of 0 as infinite (no enforcement, no increment)', () => {
    const step = makeStepInstance({ stepInstanceId: 's1', defaultNextMaxTransitions: 0 });
    const rt = makeRuntimeState({ transitionCounts: { s1_default: 999 } });
    enforceTransitionLimits(step, 'next', { type: 'DEFAULT' }, rt, cid);
    expect(rt.transitionCounts!['s1_default']).toBe(999);
  });

  it('uses a fallback key when the condition cannot be matched', () => {
    const step = makeStepInstance({ stepInstanceId: 's1', transitions: [] });
    const rt = makeRuntimeState();
    enforceTransitionLimits(step, 'X', { type: 'CONDITION', condition: '$.unmatched' }, rt, cid);
    expect(rt.transitionCounts!['s1_to_X']).toBe(1);
  });
});
