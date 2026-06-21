import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  StepType,
  SfnActionType,
  HttpMethod,
  SystemModuleIdentifiers,
  PermanentStepError,
  type FlowDefinition,
  type ProcessorInput,
  type ProcessorOutput,
  type StepHandler,
} from '@allma/core-types';
import { makeFlowDefinition, makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

// external-step-invoker (imported transitively) reads the config table name at import time.
vi.hoisted(() => {
  process.env.ALLMA_CONFIG_TABLE_NAME = 'config-table';
});

// The whole point of Phase 3: flow definitions come from in-memory fixtures, not DynamoDB.
vi.mock('../../../../src/allma-core/config-loader.js', () => ({
  loadFlowDefinition: vi.fn(),
  loadStepDefinition: vi.fn(),
  loadFlowMetadata: vi.fn(),
}));
vi.mock('../../../../src/allma-core/step-handlers/handler-registry.js');
vi.mock('../../../../src/allma-core/execution-logger-client.js', () => ({
  executionLoggerClient: { logStepExecution: vi.fn().mockResolvedValue(undefined) },
}));

const { handler } = await import('../../../../src/allma-flows/iterative-step-processor/index.js');
const { loadFlowDefinition } = await import('../../../../src/allma-core/config-loader.js');
const { getStepHandler } = await import(
  '../../../../src/allma-core/step-handlers/handler-registry.js'
);

const mockedLoad = vi.mocked(loadFlowDefinition);
const mockedGetStepHandler = vi.mocked(getStepHandler);

const CTX = { functionName: undefined } as never;
const NOOP = (() => undefined) as never;

/** Invoke the processor and return the (always-present in these tests) ProcessorOutput. */
const invoke = async (input: ProcessorInput): Promise<ProcessorOutput> =>
  (await handler(input, CTX, NOOP)) as ProcessorOutput;

const echoHandler: StepHandler = async (_d, input) => ({ outputData: { ...input } });

/** Register fake handlers keyed by step type, falling back to a no-op echo. */
const useHandlers = (overrides: Partial<Record<StepType, StepHandler>> = {}): void => {
  mockedGetStepHandler.mockImplementation(
    (t: StepType) => overrides[t] ?? echoHandler,
  );
};

const baseInput = (flow: FlowDefinition, currentStepInstanceId: string, contextData = {}): ProcessorInput => ({
  runtimeState: makeRuntimeState({
    flowDefinitionId: flow.id,
    currentStepInstanceId,
    currentContextData: { steps_output: {}, ...contextData },
  }),
});

beforeEach(() => {
  mockedLoad.mockReset();
  mockedGetStepHandler.mockReset();
  useHandlers();
});

describe('iterativeStepProcessor handler (orchestration loop)', () => {
  it('runs a linear flow step-by-step to COMPLETED', async () => {
    const flow = makeFlowDefinition({
      id: 'linear',
      steps: {
        step1: makeStepInstance({
          stepInstanceId: 'step1',
          stepType: StepType.DATA_TRANSFORMATION,
          moduleIdentifier: SystemModuleIdentifiers.COMPOSE_OBJECT_FROM_INPUT,
          outputMappings: { '$.steps_output.step1_result': '$.' },
          defaultNextStepInstanceId: 'step2',
        }),
        step2: makeStepInstance({ stepInstanceId: 'step2', stepType: StepType.NO_OP, defaultNextStepInstanceId: 'step3' }),
        step3: makeStepInstance({ stepInstanceId: 'step3', stepType: StepType.END_FLOW }),
      },
    });
    mockedLoad.mockResolvedValue(flow);
    useHandlers({
      [StepType.DATA_TRANSFORMATION]: async () => ({ outputData: { message: 'hello' } }),
    });

    const r1 = await invoke(baseInput(flow, 'step1', { initial: { greeting: 'hello' } }));
    expect(r1.runtimeState.currentStepInstanceId).toBe('step2');
    expect(r1.runtimeState.currentContextData.steps_output.step1_result).toEqual({ message: 'hello' });

    const r2 = await invoke({ runtimeState: r1.runtimeState });
    expect(r2.runtimeState.currentStepInstanceId).toBe('step3');

    const r3 = await invoke({ runtimeState: r2.runtimeState });
    expect(r3.runtimeState.currentStepInstanceId).toBeUndefined();
    expect(r3.runtimeState.status).toBe('COMPLETED');
  });

  it('follows a conditional transition based on context data', async () => {
    const flow = makeFlowDefinition({
      id: 'conditional',
      steps: {
        start: makeStepInstance({
          stepInstanceId: 'start',
          stepType: StepType.NO_OP,
          transitions: [{ condition: '$.input.value > 10', nextStepInstanceId: 'high' }],
          defaultNextStepInstanceId: 'low',
        }),
        high: makeStepInstance({ stepInstanceId: 'high', stepType: StepType.END_FLOW }),
        low: makeStepInstance({ stepInstanceId: 'low', stepType: StepType.END_FLOW }),
      },
    });
    mockedLoad.mockResolvedValue(flow);

    const high = await invoke(baseInput(flow, 'start', { input: { value: 15 } }));
    expect(high.runtimeState.currentStepInstanceId).toBe('high');

    const low = await invoke(baseInput(flow, 'start', { input: { value: 5 } }));
    expect(low.runtimeState.currentStepInstanceId).toBe('low');
  });

  it('applies executionOverrides.stepOverrides onto the step before executing it', async () => {
    const flow = makeFlowDefinition({
      id: 'override',
      steps: {
        only: makeStepInstance({
          stepInstanceId: 'only',
          stepType: StepType.NO_OP,
          literals: { message: 'original' },
        }),
      },
    });
    mockedLoad.mockResolvedValue(flow);

    let captured: Record<string, unknown> = {};
    useHandlers({
      [StepType.NO_OP]: async (_d, input) => {
        captured = input as Record<string, unknown>;
        return { outputData: { from_handler: input } };
      },
    });

    await invoke({
      runtimeState: makeRuntimeState({
        flowDefinitionId: flow.id,
        currentStepInstanceId: 'only',
        currentContextData: { steps_output: {} },
        executionOverrides: { stepOverrides: { only: { literals: { message: 'overridden' } } } },
      }),
    });

    expect(captured.message).toBe('overridden');
  });

  it('terminates a flow path on an END_FLOW step', async () => {
    const flow = makeFlowDefinition({
      id: 'end',
      steps: { only: makeStepInstance({ stepInstanceId: 'only', stepType: StepType.END_FLOW }) },
    });
    mockedLoad.mockResolvedValue(flow);

    const result = await invoke(baseInput(flow, 'only'));
    expect(result.runtimeState.currentStepInstanceId).toBeUndefined();
    expect(result.runtimeState.status).toBe('COMPLETED');
  });

  it('transitions to the fallback step when a step fails terminally', async () => {
    const flow = makeFlowDefinition({
      id: 'fallback',
      steps: {
        failing: makeStepInstance({
          stepInstanceId: 'failing',
          stepType: StepType.DATA_LOAD,
          moduleIdentifier: SystemModuleIdentifiers.S3_DATA_LOADER,
          onError: { fallbackStepInstanceId: 'fallback', continueOnFailure: false },
        }),
        fallback: makeStepInstance({ stepInstanceId: 'fallback', stepType: StepType.END_FLOW }),
      },
    });
    mockedLoad.mockResolvedValue(flow);
    const failing = vi.fn().mockRejectedValue(new Error('S3 Bucket Not Found'));
    useHandlers({ [StepType.DATA_LOAD]: failing as unknown as StepHandler });

    const result = await invoke(baseInput(flow, 'failing'));
    expect(failing).toHaveBeenCalledTimes(1);
    expect(result.runtimeState.status).toBe('RUNNING');
    expect(result.runtimeState.errorInfo).toBeUndefined();
    expect(result.runtimeState.currentStepInstanceId).toBe('fallback');
  });

  it('fails the flow when a step fails without a fallback', async () => {
    const flow = makeFlowDefinition({
      id: 'no-fallback',
      steps: {
        failing: makeStepInstance({
          stepInstanceId: 'failing',
          stepType: StepType.DATA_LOAD,
          moduleIdentifier: SystemModuleIdentifiers.S3_DATA_LOADER,
        }),
      },
    });
    mockedLoad.mockResolvedValue(flow);
    useHandlers({
      [StepType.DATA_LOAD]: (vi.fn().mockRejectedValue(new Error('S3 Bucket Not Found')) as unknown) as StepHandler,
    });

    const result = await invoke(baseInput(flow, 'failing'));
    expect(result.runtimeState.status).toBe('FAILED');
    expect(result.runtimeState.errorInfo?.errorMessage).toBe('S3 Bucket Not Found');
    expect(result.runtimeState.currentStepInstanceId).toBeUndefined();
  });

  it('returns the WAIT_FOR_EXTERNAL_EVENT action when the next step is an async wait', async () => {
    const flow = makeFlowDefinition({
      id: 'wait',
      steps: {
        setup: makeStepInstance({ stepInstanceId: 'setup', stepType: StepType.NO_OP, defaultNextStepInstanceId: 'wait_step' }),
        wait_step: makeStepInstance({
          stepInstanceId: 'wait_step',
          stepType: StepType.WAIT_FOR_EXTERNAL_EVENT,
          correlationKeyTemplate: 'test-key',
        }),
      },
    });
    mockedLoad.mockResolvedValue(flow);

    const result = await invoke(baseInput(flow, 'setup'));
    expect(result.runtimeState.currentStepInstanceId).toBe('wait_step');
    expect(result.sfnAction).toBe(SfnActionType.WAIT_FOR_EXTERNAL_EVENT);
    expect(result.pollingTaskInput).toBeUndefined();
  });

  it('returns the POLL_EXTERNAL_API action with a specialized polling input', async () => {
    const apiCallDefinition = {
      apiUrlTemplate: { template: 'http://test.com' },
      apiHttpMethod: HttpMethod.GET,
      apiStaticHeaders: {},
    };
    const pollingConfig = { intervalSeconds: 10, maxAttempts: 5 };
    const exitConditions = { successCondition: '$.status == "COMPLETE"', failureCondition: '$.status == "FAILED"' };
    const flow = makeFlowDefinition({
      id: 'poll',
      steps: {
        prep: makeStepInstance({ stepInstanceId: 'prep', stepType: StepType.NO_OP, defaultNextStepInstanceId: 'poll_step' }),
        poll_step: makeStepInstance({
          stepInstanceId: 'poll_step',
          stepType: StepType.POLL_EXTERNAL_API,
          name: 'Poll External API',
          apiCallDefinition,
          pollingConfig,
          exitConditions,
        } as never),
      },
    });
    mockedLoad.mockResolvedValue(flow);

    const result = await invoke(baseInput(flow, 'prep'));
    expect(result.runtimeState.currentStepInstanceId).toBe('poll_step');
    expect(result.sfnAction).toBe(SfnActionType.POLL_EXTERNAL_API);
    expect(result.pollingTaskInput).toEqual({ apiCallDefinition, pollingConfig, exitConditions });
  });

  it('resumes a paused flow by mapping the resumePayload through the wait step', async () => {
    const flow = makeFlowDefinition({
      id: 'resume',
      steps: {
        wait_step: makeStepInstance({
          stepInstanceId: 'wait_step',
          stepType: StepType.WAIT_FOR_EXTERNAL_EVENT,
          correlationKeyTemplate: 'test-key',
          outputMappings: { '$.user_response': '$.response_text' },
          defaultNextStepInstanceId: 'final',
        }),
        final: makeStepInstance({ stepInstanceId: 'final', stepType: StepType.END_FLOW }),
      },
    });
    mockedLoad.mockResolvedValue(flow);

    const result = await invoke({
      runtimeState: makeRuntimeState({
        flowDefinitionId: flow.id,
        currentStepInstanceId: 'wait_step',
        currentContextData: { existing_data: 123 },
      }),
      resumePayload: { response_text: 'the user input', some_other_data: 'ignore' },
    });

    expect(result.runtimeState.currentContextData.user_response).toBe('the user input');
    expect(result.runtimeState.currentContextData.existing_data).toBe(123);
    expect(result.runtimeState.status).toBe('COMPLETED');
    expect(result.runtimeState.currentStepInstanceId).toBeUndefined();
    expect(result.sfnAction).toBe(SfnActionType.PROCESS_STEP);
  });

  it('fails with a ConfigurationError when the current step is missing from the flow definition', async () => {
    const flow = makeFlowDefinition({
      id: 'missing',
      steps: { real: makeStepInstance({ stepInstanceId: 'real', stepType: StepType.END_FLOW }) },
    });
    mockedLoad.mockResolvedValue(flow);

    const result = await invoke(baseInput(flow, 'ghost'));
    expect(result.runtimeState.status).toBe('FAILED');
    expect(result.runtimeState.errorInfo?.errorName).toBe('ConfigurationError');
    expect(result.runtimeState.currentStepInstanceId).toBeUndefined();
  });

  it('propagates a load failure as a catastrophic configuration error', async () => {
    mockedLoad.mockRejectedValue(new PermanentStepError('Flow Definition not found'));

    const result = await invoke(
      baseInput(makeFlowDefinition({ id: 'broken' }), 'step-1'),
    );
    expect(result.runtimeState.status).toBe('FAILED');
  });
});
