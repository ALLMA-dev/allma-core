import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HttpMethod, StepType, type StepDefinition } from '@allma/core-types';

// The handler delegates the actual HTTP work to executeConfiguredApiCall; we mock that
// non-AWS collaborator and assert the handler's request/response mapping and error
// passthrough, not the HTTP transport itself.
vi.mock('../../../../src/allma-core/utils/api-executor');

import { handleApiCall } from '../../../../src/allma-core/step-handlers/api-call-handler.js';
import * as apiExecutor from '../../../../src/allma-core/utils/api-executor.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

const mockedExecute = vi.mocked(apiExecutor.executeConfiguredApiCall);

const makeApiStepDef = (overrides: Partial<StepDefinition> = {}): StepDefinition =>
  ({
    stepInstanceId: 'api-step',
    displayName: 'Call Service',
    stepType: StepType.API_CALL,
    apiUrlTemplate: { template: 'https://example.test/users/{{id}}' },
    apiHttpMethod: HttpMethod.GET,
    ...overrides,
  }) as unknown as StepDefinition;

describe('handleApiCall', () => {
  beforeEach(() => {
    mockedExecute.mockReset();
  });

  it('maps the executor response into status/headers/data output', async () => {
    mockedExecute.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { ok: true },
    } as never);

    const result = await handleApiCall(makeApiStepDef(), { id: '42' }, makeRuntimeState());

    expect(result.outputData).toEqual({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { ok: true },
    });
  });

  it('passes the parsed step, runtime, correlationId, and merged template source to the executor', async () => {
    mockedExecute.mockResolvedValue({ status: 204, headers: {}, data: null } as never);
    const runtimeState = makeRuntimeState({
      flowExecutionId: 'exec-99',
      currentContextData: { ctxKey: 'ctxVal' },
    });

    await handleApiCall(makeApiStepDef(), { inputKey: 'inputVal' }, runtimeState);

    expect(mockedExecute).toHaveBeenCalledTimes(1);
    const [stepArg, runtimeArg, correlationArg, sourceArg] = mockedExecute.mock.calls[0];
    expect((stepArg as { stepInstanceId: string }).stepInstanceId).toBe('api-step');
    expect(runtimeArg).toBe(runtimeState);
    expect(correlationArg).toBe('exec-99');
    // Template source is currentContextData + runtime + stepInput merged.
    expect(sourceArg).toMatchObject({ ctxKey: 'ctxVal', inputKey: 'inputVal', flowExecutionId: 'exec-99' });
  });

  it('rejects a structurally invalid step definition before calling the executor', async () => {
    await expect(
      handleApiCall({ stepType: StepType.API_CALL } as never, {}, makeRuntimeState())
    ).rejects.toThrow('Invalid StepDefinition for API_CALL.');
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('re-throws the executor error so the processor can apply retry/fallback policy', async () => {
    const boom = Object.assign(new Error('upstream 503'), { name: 'TransientStepError' });
    mockedExecute.mockRejectedValue(boom);

    await expect(handleApiCall(makeApiStepDef(), {}, makeRuntimeState())).rejects.toBe(boom);
  });
});
