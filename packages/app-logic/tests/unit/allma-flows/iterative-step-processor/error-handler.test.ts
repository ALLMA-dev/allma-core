import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as coreSdk from '@allma/core-sdk';
import { handleTerminalError } from '../../../../src/allma-flows/iterative-step-processor/error-handler.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

describe('handleTerminalError', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fails the flow and records error info when no fallback is configured', async () => {
    const errorSpy = vi.spyOn(coreSdk, 'log_error').mockImplementation(() => {});
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
    expect(errorSpy).toHaveBeenCalledWith(
      "Error processing step 'step-1'. No fallback configured. Flow will fail.",
      { error: 'boom' },
      rt.flowExecutionId,
    );
  });

  it('routes to the fallback step and clears the flow-level error when a fallback exists', async () => {
    const warnSpy = vi.spyOn(coreSdk, 'log_warn').mockImplementation(() => {});
    const rt = makeRuntimeState({ currentStepInstanceId: 'step-1', status: 'RUNNING' });
    const step = makeStepInstance({ onError: { fallbackStepInstanceId: 'recover' } } as never);

    const result = await handleTerminalError(new Error('boom'), step, rt);

    expect(result.status).toBe('RUNNING');
    expect(result.currentStepInstanceId).toBe('recover');
    expect(result.errorInfo).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      "Step 'step-1' failed. Transitioning to fallback step 'recover'.",
      { error: 'boom' },
      rt.flowExecutionId,
    );
  });

  it('defaults the error name when the error has none', async () => {
    const rt = makeRuntimeState({ currentStepInstanceId: 'step-1' });
    const result = await handleTerminalError({ message: 'plain object error' }, makeStepInstance(), rt);
    expect(result.errorInfo!.errorName).toBe('StepProcessingError');
  });

  it('emits structured ERROR log and CloudWatch EMF metric when onError.logLevel is ERROR and fallback fires', async () => {
    const errorSpy = vi.spyOn(coreSdk, 'log_error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(coreSdk, 'log_warn').mockImplementation(() => {});

    const rt = makeRuntimeState({
      currentStepInstanceId: 'step-1',
      flowDefinitionId: 'flow-test',
      stepRetryAttempts: { 'step-1': 2 },
    });
    const step = makeStepInstance({
      onError: {
        fallbackStepInstanceId: 'recover',
        logLevel: 'ERROR',
        retries: { count: 2, intervalSeconds: 5, backoffRate: 2 },
      },
    } as never);
    const error = Object.assign(new Error('boom'), { name: 'CustomError' });

    const result = await handleTerminalError(error, step, rt);

    expect(result.status).toBe('RUNNING');
    expect(result.currentStepInstanceId).toBe('recover');
    expect(result.errorInfo).toBeUndefined();

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "Step 'step-1' failed. Transitioning to fallback step 'recover'.",
      {
        flowId: 'flow-test',
        flowExecutionId: rt.flowExecutionId,
        stepInstanceId: 'step-1',
        fallbackStepInstanceId: 'recover',
        errorClass: 'Error',
        errorName: 'CustomError',
        errorMessage: 'boom',
        retriesExhausted: true,
        FlowFallbackFired: 1,
        _aws: {
          Timestamp: expect.any(Number),
          CloudWatchMetrics: [
            {
              Namespace: 'Allma',
              Dimensions: [['flowId', 'stepInstanceId']],
              Metrics: [{ Name: 'FlowFallbackFired' }],
            },
          ],
        },
      },
      rt.flowExecutionId,
    );
  });

  it('emits WARN log without metric when onError.logLevel is unset or WARN', async () => {
    const errorSpy = vi.spyOn(coreSdk, 'log_error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(coreSdk, 'log_warn').mockImplementation(() => {});

    const rt1 = makeRuntimeState({ currentStepInstanceId: 'step-1', flowDefinitionId: 'flow-test' });
    const stepUnset = makeStepInstance({ onError: { fallbackStepInstanceId: 'recover' } } as never);
    await handleTerminalError(new Error('boom 1'), stepUnset, rt1);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "Step 'step-1' failed. Transitioning to fallback step 'recover'.",
      { error: 'boom 1' },
      rt1.flowExecutionId,
    );
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockClear();
    const rt2 = makeRuntimeState({ currentStepInstanceId: 'step-1', flowDefinitionId: 'flow-test' });
    const stepWarn = makeStepInstance({ onError: { fallbackStepInstanceId: 'recover', logLevel: 'WARN' } } as never);
    await handleTerminalError(new Error('boom 2'), stepWarn, rt2);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "Step 'step-1' failed. Transitioning to fallback step 'recover'.",
      { error: 'boom 2' },
      rt2.flowExecutionId,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('flags retriesExhausted as false when non-retryable failure occurs before retries are exhausted', async () => {
    const errorSpy = vi.spyOn(coreSdk, 'log_error').mockImplementation(() => {});
    vi.spyOn(coreSdk, 'log_warn').mockImplementation(() => {});

    const rt = makeRuntimeState({
      currentStepInstanceId: 'step-1',
      flowDefinitionId: 'flow-test',
      stepRetryAttempts: { 'step-1': 0 },
    });
    const step = makeStepInstance({
      onError: {
        fallbackStepInstanceId: 'recover',
        logLevel: 'ERROR',
        retries: { count: 3, intervalSeconds: 5, backoffRate: 2 },
      },
    } as never);

    await handleTerminalError(new Error('validation error'), step, rt);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        retriesExhausted: false,
      }),
      rt.flowExecutionId,
    );
  });
});
