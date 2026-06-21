import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { StepType, TransientStepError, type StepDefinition } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

// The handler reads the traces bucket env var at module-eval time and fails fast when it is
// unset. Set it before the SUT is imported via vi.hoisted so the happy paths can run; the
// "missing bucket" branch is exercised separately with a fresh module + cleared env.
vi.hoisted(() => {
  process.env.ALLMA_EXECUTION_TRACES_BUCKET_NAME = 'test-traces-bucket';
});

const { handleCustomLambdaInvoke } = await import(
  '../../../../src/allma-core/step-handlers/custom-lambda-invoke-handler.js'
);

const lambdaMock = mockClient(LambdaClient);

const encode = (obj: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(obj));

const makeStepDef = (overrides: Record<string, unknown> = {}): StepDefinition =>
  ({
    id: 'lambda-step',
    stepInstanceId: 'lambda-step',
    stepType: StepType.CUSTOM_LAMBDA_INVOKE,
    lambdaFunctionArnTemplate: 'arn:aws:lambda:us-east-1:123:function:{{fn}}',
    ...overrides,
  }) as unknown as StepDefinition;

describe('handleCustomLambdaInvoke', () => {
  beforeEach(() => resetAwsClientMocks(lambdaMock));
  afterAll(() => {
    delete process.env.ALLMA_EXECUTION_TRACES_BUCKET_NAME;
  });

  it('renders the ARN, invokes the Lambda, and returns the parsed response payload', async () => {
    lambdaMock.on(InvokeCommand).resolves({ Payload: encode({ result: 'ok', value: 7 }) });

    const result = await handleCustomLambdaInvoke(
      makeStepDef(),
      { some: 'input' },
      makeRuntimeState({ currentContextData: { fn: 'my-func' } })
    );

    expect(result.outputData).toEqual({ result: 'ok', value: 7 });
    expect(lambdaMock).toHaveReceivedCommandWith(InvokeCommand, {
      FunctionName: 'arn:aws:lambda:us-east-1:123:function:my-func',
      InvocationType: 'RequestResponse',
    });
  });

  it('builds the default payload (moduleIdentifier + stepInput + correlationId) when no template is given', async () => {
    lambdaMock.on(InvokeCommand).resolves({ Payload: encode({ ok: true }) });

    await handleCustomLambdaInvoke(
      makeStepDef({ moduleIdentifier: 'system/custom' }),
      { a: 1 },
      makeRuntimeState({ flowExecutionId: 'exec-7', currentContextData: { fn: 'f' } })
    );

    const sent = lambdaMock.commandCalls(InvokeCommand)[0].args[0].input;
    expect(JSON.parse(sent.Payload as string)).toEqual({
      moduleIdentifier: 'system/custom',
      stepInput: { a: 1 },
      correlationId: 'exec-7',
    });
  });

  it('passes a pre-offloaded S3 pointer straight through', async () => {
    const pointer = { _s3_output_pointer: { bucket: 'b', key: 'k' } };
    lambdaMock.on(InvokeCommand).resolves({ Payload: encode(pointer) });

    const result = await handleCustomLambdaInvoke(
      makeStepDef(),
      {},
      makeRuntimeState({ currentContextData: { fn: 'f' } })
    );

    expect(result.outputData).toEqual(pointer);
  });

  it('throws a TransientStepError when the Lambda reports a FunctionError', async () => {
    lambdaMock
      .on(InvokeCommand)
      .resolves({ FunctionError: 'Unhandled', Payload: encode({ errorMessage: 'boom inside' }) });

    const promise = handleCustomLambdaInvoke(
      makeStepDef(),
      {},
      makeRuntimeState({ currentContextData: { fn: 'f' } })
    );

    await expect(promise).rejects.toBeInstanceOf(TransientStepError);
    await expect(promise).rejects.toThrow('boom inside');
  });

  it('fails fast (no wrapping) on a ResourceNotFoundException', async () => {
    lambdaMock.on(InvokeCommand).rejects(
      Object.assign(new Error('no such function'), { name: 'ResourceNotFoundException' })
    );

    const promise = handleCustomLambdaInvoke(
      makeStepDef(),
      {},
      makeRuntimeState({ currentContextData: { fn: 'f' } })
    );

    await expect(promise).rejects.not.toBeInstanceOf(TransientStepError);
    await expect(promise).rejects.toThrow('no such function');
  });

  it('wraps a throttling error as a TransientStepError', async () => {
    lambdaMock.on(InvokeCommand).rejects(
      Object.assign(new Error('Rate exceeded'), { name: 'TooManyRequestsException' })
    );

    await expect(
      handleCustomLambdaInvoke(makeStepDef(), {}, makeRuntimeState({ currentContextData: { fn: 'f' } }))
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('rejects a structurally invalid step definition', async () => {
    await expect(
      handleCustomLambdaInvoke({ stepType: StepType.CUSTOM_LAMBDA_INVOKE } as never, {}, makeRuntimeState())
    ).rejects.toThrow('Invalid StepDefinition for CUSTOM_LAMBDA_INVOKE');
  });

  it('fails when the execution traces bucket is not configured', async () => {
    vi.resetModules();
    const saved = process.env.ALLMA_EXECUTION_TRACES_BUCKET_NAME;
    delete process.env.ALLMA_EXECUTION_TRACES_BUCKET_NAME;
    try {
      const freshModule = await import(
        '../../../../src/allma-core/step-handlers/custom-lambda-invoke-handler.js'
      );
      await expect(
        freshModule.handleCustomLambdaInvoke(makeStepDef(), {}, makeRuntimeState())
      ).rejects.toThrow('Execution traces bucket is not configured');
    } finally {
      process.env.ALLMA_EXECUTION_TRACES_BUCKET_NAME = saved;
      vi.resetModules();
    }
  });
});
