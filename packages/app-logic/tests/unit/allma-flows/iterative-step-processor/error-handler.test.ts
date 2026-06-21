import { describe, it, expect } from 'vitest';
import { handleTerminalError } from '../../../../src/allma-flows/iterative-step-processor/error-handler.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

describe('handleTerminalError', () => {
  it('fails the flow and records error info when no fallback is configured', async () => {
    const rt = makeRuntimeState({ currentStepInstanceId: 'step-1', status: 'RUNNING' });
    const error = Object.assign(new Error('boom'), { name: 'CustomError', details: { dynamodb_params: { TableName: 'T' } } });

    const result = await handleTerminalError(error, makeStepInstance(), rt);

    expect(result.status).toBe('FAILED');
    expect(result.currentStepInstanceId).toBeUndefined();
    expect(result.errorInfo).toMatchObject({
      errorName: 'CustomError',
      errorMessage: 'boom',
      isRetryable: false,
    });
    expect(result.errorInfo!.errorDetails).toMatchObject({
      failedStepInstanceId: 'step-1',
      dynamodb_params: { TableName: 'T' },
    });
  });

  it('routes to the fallback step and clears the flow-level error when a fallback exists', async () => {
    const rt = makeRuntimeState({ currentStepInstanceId: 'step-1', status: 'RUNNING' });
    const step = makeStepInstance({ onError: { fallbackStepInstanceId: 'recover' } } as never);

    const result = await handleTerminalError(new Error('boom'), step, rt);

    expect(result.status).toBe('RUNNING');
    expect(result.currentStepInstanceId).toBe('recover');
    expect(result.errorInfo).toBeUndefined();
  });

  it('defaults the error name when the error has none', async () => {
    const rt = makeRuntimeState({ currentStepInstanceId: 'step-1' });
    const result = await handleTerminalError({ message: 'plain object error' }, makeStepInstance(), rt);
    expect(result.errorInfo!.errorName).toBe('StepProcessingError');
  });
});
