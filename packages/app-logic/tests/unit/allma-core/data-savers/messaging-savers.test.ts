import { describe, it, expect, beforeEach } from 'vitest';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { TransientStepError } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';
import { executeSnsPublisher } from '../../../../src/allma-core/data-savers/sns-publisher.js';
import { executeSqsSender } from '../../../../src/allma-core/data-savers/sqs-sender.js';

const snsMock = mockClient(SNSClient);
const sqsMock = mockClient(SQSClient);

describe('executeSnsPublisher', () => {
  beforeEach(() => resetAwsClientMocks(snsMock));
  const TOPIC = 'arn:aws:sns:us-east-1:123456789012:my-topic';

  it('publishes the JSON-serialized payload and returns the message id', async () => {
    snsMock.on(PublishCommand).resolves({ MessageId: 'sns-1' });

    const result = await executeSnsPublisher(
      {} as never,
      { payload: { event: 'created', id: 7 }, topicArn: TOPIC },
      makeRuntimeState()
    );

    expect(result.outputData).toMatchObject({ snsMessageId: 'sns-1', _meta: { status: 'SUCCESS' } });
    expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
      TopicArn: TOPIC,
      Message: JSON.stringify({ event: 'created', id: 7 }),
    });
  });

  it('forwards message attributes for subscriber-side filtering', async () => {
    snsMock.on(PublishCommand).resolves({ MessageId: 'm' });

    await executeSnsPublisher(
      {} as never,
      { payload: { x: 1 }, topicArn: TOPIC, messageAttributes: { kind: { DataType: 'String', StringValue: 'order' } } },
      makeRuntimeState()
    );

    expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
      MessageAttributes: { kind: { DataType: 'String', StringValue: 'order' } },
    });
  });

  it('maps a transient SNS error to a TransientStepError', async () => {
    snsMock.on(PublishCommand).rejects(Object.assign(new Error('busy'), { name: 'ThrottlingException' }));

    await expect(
      executeSnsPublisher({} as never, { payload: { x: 1 }, topicArn: TOPIC }, makeRuntimeState())
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('rejects input with an invalid topic ARN', async () => {
    await expect(
      executeSnsPublisher({} as never, { payload: { x: 1 }, topicArn: 'not-an-arn' }, makeRuntimeState())
    ).rejects.toThrow('Invalid input for SNS publisher');
  });
});

describe('executeSqsSender', () => {
  beforeEach(() => resetAwsClientMocks(sqsMock));
  const QUEUE = 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue';

  it('sends the JSON-serialized payload and returns the message id', async () => {
    sqsMock.on(SendMessageCommand).resolves({ MessageId: 'sqs-1' });

    const result = await executeSqsSender(
      {} as never,
      { payload: { task: 'go' }, queueUrl: QUEUE },
      makeRuntimeState()
    );

    expect(result.outputData).toMatchObject({ sqsMessageId: 'sqs-1', _meta: { status: 'SUCCESS' } });
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, {
      QueueUrl: QUEUE,
      MessageBody: JSON.stringify({ task: 'go' }),
    });
  });

  it('includes FIFO message group and deduplication ids when provided', async () => {
    sqsMock.on(SendMessageCommand).resolves({ MessageId: 'm' });

    await executeSqsSender(
      {} as never,
      { payload: { x: 1 }, queueUrl: QUEUE, messageGroupId: 'g1', messageDeduplicationId: 'd1' },
      makeRuntimeState()
    );

    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, {
      MessageGroupId: 'g1',
      MessageDeduplicationId: 'd1',
    });
  });

  it('maps a transient SQS error to a TransientStepError', async () => {
    sqsMock.on(SendMessageCommand).rejects(Object.assign(new Error('busy'), { name: 'ServiceUnavailable' }));

    await expect(
      executeSqsSender({} as never, { payload: { x: 1 }, queueUrl: QUEUE }, makeRuntimeState())
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('rejects input with an invalid queue URL', async () => {
    await expect(
      executeSqsSender({} as never, { payload: { x: 1 }, queueUrl: 'nope' }, makeRuntimeState())
    ).rejects.toThrow('Invalid input for SQS sender');
  });
});
