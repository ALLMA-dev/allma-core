import { describe, it, expect, beforeEach } from 'vitest';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageBatchCommand,
  GetQueueAttributesCommand,
  QueueAttributeName,
} from '@aws-sdk/client-sqs';
import { TransientStepError } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';
import { handleSqsReceiveMessages } from '../../../../src/allma-core/data-loaders/sqs-receive-messages.js';
import { handleSqsGetQueueAttributes } from '../../../../src/allma-core/data-loaders/sqs-get-queue-attributes.js';

// Both SQS loaders share one client; stub it at the send layer.
const sqsMock = mockClient(SQSClient);
const QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue';

describe('handleSqsReceiveMessages', () => {
  beforeEach(() => resetAwsClientMocks(sqsMock));

  it('receives and formats messages, then deletes them by default', async () => {
    sqsMock.on(ReceiveMessageCommand).resolves({
      Messages: [
        { MessageId: 'm1', ReceiptHandle: 'r1', Body: 'hello', Attributes: { SentTimestamp: '1' } },
        { MessageId: 'm2', ReceiptHandle: 'r2', Body: 'world' },
      ],
    });
    sqsMock.on(DeleteMessageBatchCommand).resolves({});

    const result = await handleSqsReceiveMessages({ queueUrl: QUEUE_URL } as never, { queueUrl: QUEUE_URL }, makeRuntimeState());

    expect(result.outputData!.messageCount).toBe(2);
    expect(result.outputData!.messages[0]).toMatchObject({ messageId: 'm1', receiptHandle: 'r1', body: 'hello' });
    expect(sqsMock).toHaveReceivedCommandWith(DeleteMessageBatchCommand, {
      QueueUrl: QUEUE_URL,
      Entries: [
        { Id: 'm1', ReceiptHandle: 'r1' },
        { Id: 'm2', ReceiptHandle: 'r2' },
      ],
    });
  });

  it('returns an empty result and skips deletion when no messages are available', async () => {
    sqsMock.on(ReceiveMessageCommand).resolves({ Messages: [] });

    const result = await handleSqsReceiveMessages({} as never, { queueUrl: QUEUE_URL }, makeRuntimeState());

    expect(result.outputData).toEqual({ messages: [], messageCount: 0 });
    expect(sqsMock).toHaveReceivedCommandTimes(DeleteMessageBatchCommand, 0);
  });

  it('does not delete messages when deleteMessages is false', async () => {
    sqsMock.on(ReceiveMessageCommand).resolves({ Messages: [{ MessageId: 'm1', ReceiptHandle: 'r1', Body: 'x' }] });

    await handleSqsReceiveMessages({} as never, { queueUrl: QUEUE_URL, deleteMessages: false }, makeRuntimeState());

    expect(sqsMock).toHaveReceivedCommandTimes(DeleteMessageBatchCommand, 0);
  });

  it('maps a throttling error to a TransientStepError', async () => {
    sqsMock.on(ReceiveMessageCommand).rejects(Object.assign(new Error('slow'), { name: 'ThrottlingException' }));

    await expect(
      handleSqsReceiveMessages({} as never, { queueUrl: QUEUE_URL }, makeRuntimeState())
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('rejects input with an invalid queue URL', async () => {
    await expect(
      handleSqsReceiveMessages({} as never, { queueUrl: 'not-a-url' }, makeRuntimeState())
    ).rejects.toThrow('Invalid stepInput for sqs-receive-messages');
  });
});

describe('handleSqsGetQueueAttributes', () => {
  beforeEach(() => resetAwsClientMocks(sqsMock));

  it('coerces numeric attribute values and leaves non-numeric ones as strings', async () => {
    sqsMock.on(GetQueueAttributesCommand).resolves({
      Attributes: {
        [QueueAttributeName.ApproximateNumberOfMessages]: '5',
        [QueueAttributeName.QueueArn]: 'arn:aws:sqs:us-east-1:123:my-queue',
      },
    });

    const result = await handleSqsGetQueueAttributes(
      {} as never,
      { queueUrl: QUEUE_URL, attributeNames: [QueueAttributeName.ApproximateNumberOfMessages, QueueAttributeName.QueueArn] },
      makeRuntimeState()
    );

    expect(result.outputData!.attributes).toEqual({
      ApproximateNumberOfMessages: 5,
      QueueArn: 'arn:aws:sqs:us-east-1:123:my-queue',
    });
  });

  it('returns an empty attributes object when SQS returns none', async () => {
    sqsMock.on(GetQueueAttributesCommand).resolves({});

    const result = await handleSqsGetQueueAttributes(
      {} as never,
      { queueUrl: QUEUE_URL, attributeNames: [QueueAttributeName.All] },
      makeRuntimeState()
    );

    expect(result.outputData).toEqual({ attributes: {} });
  });

  it('maps a transient error to a TransientStepError', async () => {
    sqsMock.on(GetQueueAttributesCommand).rejects(Object.assign(new Error('down'), { name: 'ServiceUnavailable' }));

    await expect(
      handleSqsGetQueueAttributes({} as never, { queueUrl: QUEUE_URL, attributeNames: [QueueAttributeName.All] }, makeRuntimeState())
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('rejects input that is missing attribute names', async () => {
    await expect(
      handleSqsGetQueueAttributes({} as never, { queueUrl: QUEUE_URL, attributeNames: [] }, makeRuntimeState())
    ).rejects.toThrow('Invalid stepInput for sqs-get-queue-attributes');
  });
});
