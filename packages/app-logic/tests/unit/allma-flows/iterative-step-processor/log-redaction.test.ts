import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import type { SQSEvent } from 'aws-lambda';
import { StepType, type ProcessorInput } from '@allma/core-types';
import { makeFlowDefinition, makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';
import { captureLogs, type LogCapture } from '../../_helpers/logger.js';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';

vi.hoisted(() => {
  process.env.LOG_LEVEL = 'DEBUG';
  process.env.ALLMA_CONFIG_TABLE_NAME = 'config-table';
  process.env.ALLMA_STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:123456789012:stateMachine:orchestrator';
  process.env.LOG_REDACTION_CONFIG = JSON.stringify({ keys: ['email'], patterns: ['[^@\\s]+@[^@\\s]+\\.[a-z]+'] });
});

vi.mock('../../../../src/allma-core/config-loader.js', () => ({
  loadFlowDefinition: vi.fn(),
  loadStepDefinition: vi.fn(),
  loadFlowMetadata: vi.fn(),
}));
vi.mock('../../../../src/allma-core/step-handlers/handler-registry.js');
vi.mock('../../../../src/allma-core/execution-logger-client.js', () => ({
  executionLoggerClient: {
    logStepExecution: vi.fn().mockResolvedValue(undefined),
    updateProgress: vi.fn().mockResolvedValue(undefined),
  },
}));

const { handler } = await import('../../../../src/allma-flows/iterative-step-processor/index.js');
const { handler: listenerHandler } = await import('../../../../src/allma-flows/flow-start-request-listener.js');
const { loadFlowDefinition } = await import('../../../../src/allma-core/config-loader.js');
const { getStepHandler } = await import('../../../../src/allma-core/step-handlers/handler-registry.js');

const EMAIL = 'jane.doe@example.com';
const sfnMock = mockClient(SFNClient);

let logs: LogCapture;
let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

const emitted = (): string =>
  [...logs.raw, ...[...warnSpy.mock.calls, ...errorSpy.mock.calls].flat().map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))].join('\n');

beforeEach(() => {
  logs = captureLogs();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  resetAwsClientMocks(sfnMock);
  sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'arn:exec:1' });
});

afterEach(() => {
  logs.restore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

describe('platform Lambda log redaction via LOG_REDACTION_CONFIG', () => {
  it('iterative step processor never emits the raw email', async () => {
    const flow = makeFlowDefinition({
      id: 'redaction',
      steps: { only: makeStepInstance({ stepInstanceId: 'only', stepType: StepType.END_FLOW }) },
    });
    vi.mocked(loadFlowDefinition).mockResolvedValue(flow);
    vi.mocked(getStepHandler).mockImplementation(() => async (_d, input) => ({ outputData: { ...input } }));
    const input: ProcessorInput = {
      runtimeState: makeRuntimeState({
        flowDefinitionId: flow.id,
        currentStepInstanceId: 'only',
        currentContextData: { steps_output: {}, email: EMAIL, note: `contact ${EMAIL}` },
      }),
    };

    await handler(input, { functionName: undefined } as never, (() => undefined) as never);

    expect(logs.raw.length).toBeGreaterThan(0);
    expect(emitted()).not.toContain(EMAIL);
    expect(emitted()).toContain('[REDACTED]');
  });

  it('flow-start-request-listener never emits the raw email from the SQS body', async () => {
    const event = {
      Records: [{
        messageId: 'm-0',
        body: JSON.stringify({ flowDefinitionId: 'flow-x', initialContextData: { email: EMAIL } }),
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:flow-start',
      }],
    } as unknown as SQSEvent;

    await listenerHandler(event, {} as never, (() => undefined) as never);

    expect(logs.raw.length).toBeGreaterThan(0);
    expect(emitted()).not.toContain(EMAIL);
    expect(emitted()).toContain('[REDACTED]');
  });
});
