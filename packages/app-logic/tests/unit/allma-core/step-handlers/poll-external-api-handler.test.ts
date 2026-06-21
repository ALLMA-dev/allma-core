import { describe, it, expect, beforeEach } from 'vitest';
import { SFNClient, StartSyncExecutionCommand } from '@aws-sdk/client-sfn';
import { HttpMethod, StepType, type StepDefinition } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { handlePollExternalApi } from '../../../../src/allma-core/step-handlers/poll-external-api-handler.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

// POLL_EXTERNAL_API delegates the actual polling loop to a generic Step Functions express
// state machine; we stub its synchronous execution at the SFN client layer.
const sfnMock = mockClient(SFNClient);

const makeStepDef = (overrides: Record<string, unknown> = {}): StepDefinition =>
  ({
    id: 'poll-1',
    name: 'Poll Job Status',
    stepType: StepType.POLL_EXTERNAL_API,
    apiCallDefinition: {
      apiUrlTemplate: { template: 'https://api.test/status' },
      apiHttpMethod: HttpMethod.GET,
    },
    pollingConfig: { intervalSeconds: 5, maxAttempts: 10 },
    exitConditions: {
      successCondition: '$.data.done',
      failureCondition: '$.data.failed',
    },
    ...overrides,
  }) as unknown as StepDefinition;

describe('handlePollExternalApi', () => {
  beforeEach(() => resetAwsClientMocks(sfnMock));

  it('returns the final API response on a successful poll', async () => {
    sfnMock.on(StartSyncExecutionCommand).resolves({
      status: 'SUCCEEDED',
      output: JSON.stringify({ pollResult: { responseData: { done: true, items: [1, 2] } } }),
    });

    const result = await handlePollExternalApi(
      makeStepDef(),
      {},
      makeRuntimeState({ currentContextData: { jobId: 'j-9' } })
    );

    expect(result.outputData).toEqual({ done: true, items: [1, 2] });
    expect(sfnMock).toHaveReceivedCommandTimes(StartSyncExecutionCommand, 1);
  });

  it('passes the flow context and polling config into the state machine input', async () => {
    sfnMock.on(StartSyncExecutionCommand).resolves({
      status: 'SUCCEEDED',
      output: JSON.stringify({ pollResult: { responseData: {} } }),
    });

    await handlePollExternalApi(makeStepDef(), {}, makeRuntimeState({ currentContextData: { jobId: 'j-9' } }));

    const input = JSON.parse(sfnMock.commandCalls(StartSyncExecutionCommand)[0].args[0].input.input as string);
    expect(input.flowContext).toEqual({ jobId: 'j-9' });
    expect(input.pollingConfig).toEqual({ intervalSeconds: 5, maxAttempts: 10 });
  });

  it('throws when the polling state machine does not succeed', async () => {
    sfnMock.on(StartSyncExecutionCommand).resolves({
      status: 'FAILED',
      error: 'States.TaskFailed',
      cause: JSON.stringify({ errorMessage: 'max attempts exhausted' }),
    });

    await expect(handlePollExternalApi(makeStepDef(), {}, makeRuntimeState())).rejects.toThrow(
      'Polling loop failed: max attempts exhausted'
    );
  });

  it('rejects a structurally invalid step definition', async () => {
    await expect(
      handlePollExternalApi({ stepType: StepType.POLL_EXTERNAL_API } as never, {}, makeRuntimeState())
    ).rejects.toThrow('Invalid StepDefinition for POLL_EXTERNAL_API.');
  });
});
