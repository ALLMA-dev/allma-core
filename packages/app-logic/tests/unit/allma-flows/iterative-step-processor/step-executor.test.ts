import { vi, describe, it, expect, beforeEach } from 'vitest';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  StepType,
  LLMProviderType,
  ContentBasedRetryableError,
  RetryableStepError,
  TransientStepError,
  SecurityViolationError,
  type StepHandler,
  type StepDefinition,
  type StepInstance,
} from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

// The execution-traces bucket name is read at import time; set it before importing the SUT.
vi.hoisted(() => {
  process.env.ALLMA_EXECUTION_TRACES_BUCKET_NAME = 'traces-bucket';
  process.env.ALLMA_CONFIG_TABLE_NAME = 'config-table';
});

// Inject fake step handlers via the registry seam (real handlers are covered in Phase 2).
vi.mock('../../../../src/allma-core/step-handlers/handler-registry.js');
// The logger client fans out to a downstream Lambda; stub it everywhere.
vi.mock('../../../../src/allma-core/execution-logger-client.js', () => ({
  executionLoggerClient: { logStepExecution: vi.fn().mockResolvedValue(undefined) },
}));

const { executeStandardStep } = await import(
  '../../../../src/allma-flows/iterative-step-processor/step-executor.js'
);
const { getStepHandler } = await import(
  '../../../../src/allma-core/step-handlers/handler-registry.js'
);
const { executionLoggerClient } = await import(
  '../../../../src/allma-core/execution-logger-client.js'
);

const mockedGetStepHandler = vi.mocked(getStepHandler);
const mockedLogger = vi.mocked(executionLoggerClient);
const s3Mock = mockClient(S3Client);

/** Register a single fake handler and return its mock so calls can be asserted. */
const stubHandler = (output: unknown): ReturnType<typeof vi.fn> => {
  const handler = vi.fn().mockResolvedValue(output) as unknown as StepHandler;
  mockedGetStepHandler.mockReturnValue(handler);
  return handler as unknown as ReturnType<typeof vi.fn>;
};

const START_TIME = '2024-01-01T00:00:00.000Z';

/** Run executeStandardStep with sensible defaults; `step` doubles as the stepDef. */
const run = (step: StepInstance, runtimeState = makeRuntimeState(), stepInput: Record<string, any> = {}) =>
  executeStandardStep(
    step,
    step as unknown as StepDefinition,
    runtimeState,
    stepInput,
    [],
    START_TIME,
    'corr-1',
  );

beforeEach(() => {
  resetAwsClientMocks(s3Mock);
  s3Mock.on(PutObjectCommand).resolves({});
  mockedGetStepHandler.mockReset();
});

describe('executeStandardStep', () => {
  it('dispatches to the resolved handler and merges output under the default mapping', async () => {
    const handler = stubHandler({ outputData: { greeting: 'hi' } });
    const step = makeStepInstance({ stepInstanceId: 'step-1', defaultNextStepInstanceId: 'step-2' });
    const runtimeState = makeRuntimeState({ currentContextData: { steps_output: {} } });

    const { updatedRuntimeState, nextStepId } = await run(step, runtimeState, { seed: 1 });

    expect(handler).toHaveBeenCalledTimes(1);
    // Handler receives (stepDef, finalStepInput, runtimeState).
    expect(handler.mock.calls[0][1]).toEqual({ seed: 1 });
    expect(handler.mock.calls[0][2]).toBe(runtimeState);
    expect(nextStepId).toBe('step-2');
    expect(updatedRuntimeState.currentContextData.steps_output['step-1']).toEqual({ greeting: 'hi' });
  });

  it('renders literals into the handler input', async () => {
    const handler = stubHandler({ outputData: {} });
    const step = makeStepInstance({
      literals: { label: 'static', echo: '{{seed}}' },
    });

    await run(step, makeRuntimeState(), { seed: 42 });

    const passedInput = handler.mock.calls[0][1];
    expect(passedInput.label).toBe('static');
    // Handlebars renders against the merged context (which includes the step input).
    expect(passedInput.echo).toBe('42');
  });

  it('applies explicit output mappings into the context', async () => {
    stubHandler({ outputData: { value: { nested: 7 } } });
    const step = makeStepInstance({
      outputMappings: { '$.result': '$.value.nested' },
    });

    const { updatedRuntimeState } = await run(step);

    expect(updatedRuntimeState.currentContextData.result).toBe(7);
  });

  it('emits STARTED and COMPLETED execution logs when logging is enabled', async () => {
    stubHandler({ outputData: { ok: true } });
    const step = makeStepInstance();
    const runtimeState = makeRuntimeState({ enableExecutionLogs: true });

    await run(step, runtimeState);

    const statuses = mockedLogger.logStepExecution.mock.calls.map(c => c[0].status);
    expect(statuses).toContain('STARTED');
    expect(statuses).toContain('COMPLETED');
  });

  describe('error handling', () => {
    it('converts a content error into a RetryableStepError while attempts remain', async () => {
      const handler = vi.fn().mockRejectedValue(new ContentBasedRetryableError('bad json'));
      mockedGetStepHandler.mockReturnValue(handler as unknown as StepHandler);
      const step = makeStepInstance({
        onError: { retryOnContentError: { count: 3, intervalSeconds: 1, backoffRate: 1 } },
      });

      await expect(run(step)).rejects.toBeInstanceOf(RetryableStepError);
    });

    it('throws ContentBasedRetryableError when output validation fails with no retry budget', async () => {
      stubHandler({ outputData: { result: { name: 'only-name' } } });
      const step = makeStepInstance({
        outputValidation: { requiredFields: ['$.result.id'] },
      } as Partial<StepInstance>);

      await expect(run(step)).rejects.toBeInstanceOf(ContentBasedRetryableError);
    });

    it('rejects with SecurityViolationError when an LLM response trips the forbidden-string check', async () => {
      stubHandler({ outputData: { llm_response: 'the secret token is 123' } });
      const step = makeStepInstance({
        stepType: StepType.LLM_INVOCATION,
        llmProvider: LLMProviderType.GEMINI,
        modelId: 'gemini-pro',
        promptTemplateId: 'p1',
        securityValidatorConfig: { forbiddenStrings: ['secret'] },
      } as Partial<StepInstance>);

      await expect(run(step)).rejects.toBeInstanceOf(SecurityViolationError);
    });

    it('suppresses the error and writes error output when continueOnFailure is set', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('boom'));
      mockedGetStepHandler.mockReturnValue(handler as unknown as StepHandler);
      const step = makeStepInstance({
        stepInstanceId: 'step-1',
        defaultNextStepInstanceId: 'step-2',
        onError: { continueOnFailure: true },
      });
      const runtimeState = makeRuntimeState({ currentContextData: { steps_output: {} } });

      const { updatedRuntimeState, nextStepId } = await run(step, runtimeState);

      expect(nextStepId).toBe('step-2');
      const captured = updatedRuntimeState.currentContextData.steps_output['step-1'];
      expect(captured.errorMessage).toBe('boom');
      expect(captured.isRetryable).toBe(false);
    });

    it('rethrows a plain error when no fallback handling applies', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('hard failure'));
      mockedGetStepHandler.mockReturnValue(handler as unknown as StepHandler);

      await expect(run(makeStepInstance())).rejects.toThrow('hard failure');
    });
  });

  describe('transient retry loop', () => {
    it('retries a TransientStepError and then succeeds', async () => {
      vi.useFakeTimers();
      try {
        const handler = vi
          .fn()
          .mockRejectedValueOnce(new TransientStepError('throttled'))
          .mockResolvedValueOnce({ outputData: { ok: true } });
        mockedGetStepHandler.mockReturnValue(handler as unknown as StepHandler);

        const promise = run(makeStepInstance());
        await vi.runAllTimersAsync();
        await promise;

        expect(handler).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('output mapping fallbacks and logging', () => {
    it('falls back to the step input when a mapped source is absent from the output', async () => {
      // The handler output lacks `echoed`, but it exists in the step input — the smart
      // mapping rewrites the source to the non-enumerable `_step_input` fallback.
      stubHandler({ outputData: { unrelated: true } });
      const step = makeStepInstance({ outputMappings: { '$.captured': '$.echoed' } });

      const { updatedRuntimeState } = await run(step, makeRuntimeState(), { echoed: 'from-input' });

      expect(updatedRuntimeState.currentContextData.captured).toBe('from-input');
    });

    it('logs a COMPLETED record carrying the handled error when continueOnFailure is set', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('handled'));
      mockedGetStepHandler.mockReturnValue(handler as unknown as StepHandler);
      const step = makeStepInstance({ onError: { continueOnFailure: true } });

      await run(step, makeRuntimeState({ enableExecutionLogs: true }));

      const completed = mockedLogger.logStepExecution.mock.calls
        .map(c => c[0])
        .find(r => r.status === 'COMPLETED');
      expect(completed?.errorInfo?.errorMessage).toBe('handled');
    });

    it('captures the sandbox debug-log pointer when running in sandbox mode', async () => {
      mockedLogger.logStepExecution.mockResolvedValue({ bucket: 'b', key: 'k' } as never);
      stubHandler({ outputData: { ok: true } });
      const runtimeState = makeRuntimeState({
        enableExecutionLogs: true,
        _internal: { sandboxMode: true },
      });

      await run(makeStepInstance(), runtimeState);

      expect(runtimeState._internal?.sandboxDebugLogS3Pointer).toEqual({ bucket: 'b', key: 'k' });
      mockedLogger.logStepExecution.mockResolvedValue(undefined);
    });
  });

  describe('S3 offload toggles', () => {
    it('offloads output to S3 when forceS3Offload is set', async () => {
      stubHandler({ outputData: { payload: 'small-but-forced' } });
      const step = makeStepInstance({ forceS3Offload: true });

      await run(step);

      expect(s3Mock).toHaveReceivedCommand(PutObjectCommand);
    });

    it('does not offload output when disableS3Offload is set', async () => {
      stubHandler({ outputData: { payload: 'kept-inline' } });
      const step = makeStepInstance({ disableS3Offload: true });

      await run(step);

      expect(s3Mock).not.toHaveReceivedCommand(PutObjectCommand);
    });

    it('leaves small payloads inline by default', async () => {
      stubHandler({ outputData: { small: true } });

      await run(makeStepInstance());

      expect(s3Mock).not.toHaveReceivedCommand(PutObjectCommand);
    });
  });
});
