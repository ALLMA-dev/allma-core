import { describe, it, expect } from 'vitest';
import { SfnActionType, StepType } from '@allma/core-types';
import {
  resolveNextStep,
  determineNextSfnAction,
} from '../../../../src/allma-flows/iterative-step-processor/transition-resolver.js';
import { makeStepInstance, makeRuntimeState, makeFlowDefinition } from '../../_helpers/fixtures.js';

describe('resolveNextStep', () => {
  it('returns the first transition whose condition is met', async () => {
    const step = makeStepInstance({
      transitions: [
        { condition: '$.score > 90', nextStepInstanceId: 'high', maxTransitions: 5 },
        { condition: '$.score > 50', nextStepInstanceId: 'mid', maxTransitions: 5 },
      ],
      defaultNextStepInstanceId: 'low',
    });
    const rt = makeRuntimeState({ currentContextData: { score: 75 } });

    const { nextStepId, transitionDetails } = await resolveNextStep(step, rt);
    expect(nextStepId).toBe('mid');
    expect(transitionDetails.type).toBe('CONDITION');
    expect(transitionDetails.chosenNextStepId).toBe('mid');
  });

  it('falls back to the default next step when no condition matches', async () => {
    const step = makeStepInstance({
      transitions: [{ condition: '$.score > 90', nextStepInstanceId: 'high', maxTransitions: 5 }],
      defaultNextStepInstanceId: 'low',
    });
    const rt = makeRuntimeState({ currentContextData: { score: 10 } });

    const { nextStepId, transitionDetails } = await resolveNextStep(step, rt);
    expect(nextStepId).toBe('low');
    expect(transitionDetails.type).toBe('DEFAULT');
  });

  it('ends the path when there are no transitions and no default', async () => {
    const step = makeStepInstance({});
    const rt = makeRuntimeState({ currentContextData: {} });

    const { nextStepId, transitionDetails } = await resolveNextStep(step, rt);
    expect(nextStepId).toBeUndefined();
    expect(transitionDetails.type).toBe('END_OF_PATH');
  });

  it('can evaluate conditions against root runtime-state fields', async () => {
    const step = makeStepInstance({
      transitions: [{ condition: '$.status == "RUNNING"', nextStepInstanceId: 'go', maxTransitions: 5 }],
    });
    const rt = makeRuntimeState({ status: 'RUNNING', currentContextData: {} });

    const { nextStepId } = await resolveNextStep(step, rt);
    expect(nextStepId).toBe('go');
  });
});

describe('determineNextSfnAction', () => {
  const cid = 'cid';

  it('returns PROCESS_STEP when there is no next step', () => {
    const rt = makeRuntimeState({ currentStepInstanceId: undefined });
    expect(determineNextSfnAction(rt, makeFlowDefinition(), cid).sfnAction).toBe(SfnActionType.PROCESS_STEP);
  });

  it('returns PROCESS_STEP for an ordinary next step', () => {
    const rt = makeRuntimeState({ currentStepInstanceId: 'step-1' });
    const flow = makeFlowDefinition({ steps: { 'step-1': makeStepInstance({ stepType: StepType.NO_OP }) } });
    expect(determineNextSfnAction(rt, flow, cid).sfnAction).toBe(SfnActionType.PROCESS_STEP);
  });

  it('returns WAIT_FOR_EXTERNAL_EVENT when the next step waits', () => {
    const rt = makeRuntimeState({ currentStepInstanceId: 'wait' });
    const flow = makeFlowDefinition({
      steps: { wait: makeStepInstance({ stepInstanceId: 'wait', stepType: StepType.WAIT_FOR_EXTERNAL_EVENT }) },
    });
    expect(determineNextSfnAction(rt, flow, cid).sfnAction).toBe(SfnActionType.WAIT_FOR_EXTERNAL_EVENT);
  });

  it('returns POLL_EXTERNAL_API with the polling task input', () => {
    const rt = makeRuntimeState({ currentStepInstanceId: 'poll' });
    const flow = makeFlowDefinition({
      steps: {
        poll: makeStepInstance({
          stepInstanceId: 'poll',
          stepType: StepType.POLL_EXTERNAL_API,
          apiCallDefinition: { url: 'https://x' },
          pollingConfig: { intervalSeconds: 5 },
          exitConditions: { success: '$.done' },
        } as never),
      },
    });
    const result = determineNextSfnAction(rt, flow, cid);
    expect(result.sfnAction).toBe(SfnActionType.POLL_EXTERNAL_API);
    expect(result.pollingTaskInput).toMatchObject({ apiCallDefinition: { url: 'https://x' } });
  });

  it('throws when the next step is missing from the flow definition', () => {
    const rt = makeRuntimeState({ currentStepInstanceId: 'ghost' });
    expect(() => determineNextSfnAction(rt, makeFlowDefinition(), cid)).toThrow(/not found/);
  });
});
