import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import type { SQSEvent } from 'aws-lambda';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

vi.hoisted(() => {
  process.env.ALLMA_STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:123456789012:stateMachine:orchestrator';
});

const { handler } = await import('../../../src/allma-flows/flow-start-request-listener.js');

const sfnMock = mockClient(SFNClient);

const sqsEvent = (bodies: unknown[]): SQSEvent =>
  ({
    Records: bodies.map((body, i) => ({
      messageId: `m-${i}`,
      body: JSON.stringify(body),
      eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:flow-start',
    })),
  }) as unknown as SQSEvent;

const invoke = (event: SQSEvent) => handler(event, {} as never, (() => undefined) as never);

beforeEach(() => {
  resetAwsClientMocks(sfnMock);
  sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'arn:exec:1' });
});

describe('flow-start-request-listener handler', () => {
  it('starts a Step Functions execution for a valid SQS record', async () => {
    await invoke(sqsEvent([{ flowDefinitionId: 'flow-x', flowExecutionId: '11111111-1111-4111-8111-111111111111' }]));

    const input = sfnMock.commandCalls(StartExecutionCommand)[0].args[0].input;
    expect(input.stateMachineArn).toBe(process.env.ALLMA_STATE_MACHINE_ARN);
    expect(input.name).toBe('11111111-1111-4111-8111-111111111111');
    const started = JSON.parse(input.input as string);
    expect(started.flowDefinitionId).toBe('flow-x');
    expect(started.triggerSource).toContain('SQS:');
  });

  it('generates a flowExecutionId when the record omits one', async () => {
    await invoke(sqsEvent([{ flowDefinitionId: 'flow-x' }]));

    const input = sfnMock.commandCalls(StartExecutionCommand)[0].args[0].input;
    expect(typeof input.name).toBe('string');
    expect(input.name!.length).toBeGreaterThan(0);
  });

  it('does nothing when there are no records', async () => {
    await invoke({ Records: [] } as unknown as SQSEvent);
    expect(sfnMock.commandCalls(StartExecutionCommand)).toHaveLength(0);
  });

  it('throws on an invalid input schema so the message is retried/DLQ-ed', async () => {
    await expect(invoke(sqsEvent([{ notAFlow: true }]))).rejects.toThrow(/Invalid input schema/);
  });

  it('throws when StartExecution does not return an executionArn', async () => {
    sfnMock.on(StartExecutionCommand).resolves({});
    await expect(invoke(sqsEvent([{ flowDefinitionId: 'flow-x' }]))).rejects.toThrow(/did not return an executionArn/);
  });
});
