import { describe, it, expect } from 'vitest';
import { StepType, type StepDefinition } from '@allma/core-types';
import { handleWaitForExternalEvent } from '../../../../src/allma-core/step-handlers/wait-for-external-event-handler.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

// This handler runs the pre-wait logic (optionally rendering and "sending" a prompt) before
// the Step Functions task pauses the flow. No AWS is involved; TemplateService is real.
const makeStepDef = (overrides: Record<string, unknown> = {}): StepDefinition =>
  ({
    id: 'wait-1',
    name: 'Wait For Reply',
    stepType: StepType.WAIT_FOR_EXTERNAL_EVENT,
    correlationKeyTemplate: 'corr-{{userId}}',
    ...overrides,
  }) as unknown as StepDefinition;

describe('handleWaitForExternalEvent', () => {
  it('returns undefined output and records nothing when no prompt is configured', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: { userId: 'u1' } });

    const result = await handleWaitForExternalEvent(makeStepDef(), {}, runtimeState);

    expect(result.outputData).toBeUndefined();
    expect(runtimeState.currentContextData).toEqual({ userId: 'u1' });
  });

  it('renders a string prompt template and records the sent message into context', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: { name: 'Ada' } });
    const stepDef = makeStepDef({
      promptUserMessageTemplate: 'Hello {{name}}, please reply.',
      messageSenderModuleIdentifier: 'system/slack',
    });

    await handleWaitForExternalEvent(stepDef, {}, runtimeState);

    expect(runtimeState.currentContextData['_log_message_sent_wait-1']).toMatchObject({
      module: 'system/slack',
      message: 'Hello Ada, please reply.',
    });
  });

  it('uses a default prompt for a non-string (object) template', async () => {
    const runtimeState = makeRuntimeState({ currentContextData: {} });
    const stepDef = makeStepDef({
      promptUserMessageTemplate: { blocks: ['complex'] },
      messageSenderModuleIdentifier: 'system/slack',
    });

    await handleWaitForExternalEvent(stepDef, {}, runtimeState);

    expect(runtimeState.currentContextData['_log_message_sent_wait-1']).toMatchObject({
      message: 'Default prompt: Please provide your input.',
    });
  });

  it('rejects a structurally invalid step definition', async () => {
    await expect(
      handleWaitForExternalEvent({ stepType: StepType.WAIT_FOR_EXTERNAL_EVENT } as never, {}, makeRuntimeState())
    ).rejects.toThrow('Invalid StepDefinition for WAIT_FOR_EXTERNAL_EVENT.');
  });
});
