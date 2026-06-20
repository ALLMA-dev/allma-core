import { describe, it, expect } from 'vitest';
import { StepType } from '@allma/core-types';
import { getStepHandler } from '../../../../src/allma-core/step-handlers/handler-registry.js';
import { handleNoOp } from '../../../../src/allma-core/step-handlers/noop-handler.js';

/**
 * The registry maps every supported StepType to its handler and is the single dispatch
 * point for the step executor. We assert it resolves a handler for each registered type,
 * aliases start-point steps to the NO_OP handler, and throws for unknown types.
 */
describe('getStepHandler', () => {
  const registeredTypes: StepType[] = [
    StepType.LLM_INVOCATION,
    StepType.NO_OP,
    StepType.API_CALL,
    StepType.POLL_EXTERNAL_API,
    StepType.WAIT_FOR_EXTERNAL_EVENT,
    StepType.DATA_LOAD,
    StepType.DATA_TRANSFORMATION,
    StepType.DATA_SAVE,
    StepType.CUSTOM_LAMBDA_INVOKE,
    StepType.START_FLOW_EXECUTION,
    StepType.MCP_CALL,
    StepType.FILE_DOWNLOAD,
    StepType.EMAIL,
    StepType.SQS_SEND,
    StepType.SNS_PUBLISH,
    StepType.EMAIL_START_POINT,
    StepType.SCHEDULE_START_POINT,
  ];

  it.each(registeredTypes)('resolves a handler for %s', (stepType) => {
    expect(typeof getStepHandler(stepType)).toBe('function');
  });

  it('aliases start-point step types to the NO_OP handler', () => {
    expect(getStepHandler(StepType.EMAIL_START_POINT)).toBe(handleNoOp);
    expect(getStepHandler(StepType.SCHEDULE_START_POINT)).toBe(handleNoOp);
  });

  it('throws an explicit error for a step type with no registered handler', () => {
    expect(() => getStepHandler(StepType.END_FLOW)).toThrow(
      `Unsupported stepType: ${StepType.END_FLOW}`
    );
  });

  it('throws for an entirely unknown step type', () => {
    expect(() => getStepHandler('NOT_A_REAL_TYPE' as StepType)).toThrow(/Unsupported stepType/);
  });
});
