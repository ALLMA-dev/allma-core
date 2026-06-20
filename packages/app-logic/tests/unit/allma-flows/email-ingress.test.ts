import { vi, describe, it, expect, beforeEach } from 'vitest';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

vi.hoisted(() => {
  process.env.EMAIL_TO_FLOW_MAPPING_TABLE_NAME = 'email-map-table';
  process.env.ALLMA_FLOW_START_REQUEST_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/flow-start';
  process.env.INCOMING_EMAILS_BUCKET_NAME = 'incoming-emails';
});

vi.mock('../../../src/allma-admin/services/flow-activation.service.js', () => ({
  FlowActivationService: { isFlowActive: vi.fn().mockResolvedValue(true) },
}));

const { handler } = await import('../../../src/allma-flows/email-ingress.js');
const { FlowActivationService } = await import('../../../src/allma-admin/services/flow-activation.service.js');

const mockedIsActive = vi.mocked(FlowActivationService.isFlowActive);
const s3Mock = mockClient(S3Client);
const ddbMock = mockClient(DynamoDBDocumentClient);
const sqsMock = mockClient(SQSClient);

const RAW_EMAIL = [
  'From: Alice <alice@example.com>',
  'To: bot@example.com',
  'Subject: Greetings',
  'Content-Type: text/plain',
  '',
  'Please handle this URGENT request.',
  '',
].join('\r\n');

const RAW_EMAIL_WITH_ATTACHMENT = [
  'From: Alice <alice@example.com>',
  'To: bot@example.com',
  'Subject: With attachment',
  'Content-Type: multipart/mixed; boundary="BOUND"',
  '',
  '--BOUND',
  'Content-Type: text/plain',
  '',
  'Body text URGENT',
  '--BOUND',
  'Content-Type: text/plain; name="note.txt"',
  'Content-Disposition: attachment; filename="note.txt"',
  '',
  'hello attachment',
  '--BOUND--',
  '',
].join('\r\n');

const sesEvent = (destination = 'bot@example.com') => ({
  Records: [
    {
      eventSource: 'aws:ses',
      eventVersion: '1.0',
      ses: {
        mail: { messageId: 'msg-1', destination: [destination] },
        receipt: { action: { type: 'Lambda', functionArn: 'arn:fn' } },
      },
    },
  ],
});

const invoke = (event: ReturnType<typeof sesEvent>) =>
  (handler as (e: unknown) => Promise<void>)(event);

beforeEach(() => {
  resetAwsClientMocks(s3Mock, ddbMock, sqsMock);
  s3Mock.on(GetObjectCommand).resolves({ Body: { transformToString: async () => RAW_EMAIL } } as never);
  s3Mock.on(PutObjectCommand).resolves({});
  sqsMock.on(SendMessageCommand).resolves({ MessageId: 'sqs-1' });
  mockedIsActive.mockResolvedValue(true);
});

describe('email-ingress handler', () => {
  it('queues a flow-start request for a matched (default) email mapping', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ keyword: '#DEFAULT', flowDefinitionId: 'flow-x' }] });

    await invoke(sesEvent());

    const body = JSON.parse(sqsMock.commandCalls(SendMessageCommand)[0].args[0].input.MessageBody as string);
    expect(body.flowDefinitionId).toBe('flow-x');
    expect(body.triggerSource).toBe('EmailTrigger:bot@example.com');
    expect(body.initialContextData.triggeringEmail.body).toContain('URGENT');
    expect(body.initialContextData.triggeringEmail.to).toBe('bot@example.com');
  });

  it('prefers a keyword mapping over the default when the body matches', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { keyword: 'URGENT', flowDefinitionId: 'flow-urgent' },
        { keyword: '#DEFAULT', flowDefinitionId: 'flow-default' },
      ],
    });

    await invoke(sesEvent());

    const body = JSON.parse(sqsMock.commandCalls(SendMessageCommand)[0].args[0].input.MessageBody as string);
    expect(body.flowDefinitionId).toBe('flow-urgent');
  });

  it('carries a startStepInstanceId override when the mapping defines one', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ keyword: '#DEFAULT', flowDefinitionId: 'flow-x', stepInstanceId: 'step-7' }],
    });

    await invoke(sesEvent());

    const body = JSON.parse(sqsMock.commandCalls(SendMessageCommand)[0].args[0].input.MessageBody as string);
    expect(body.executionOverrides.startStepInstanceId).toBe('step-7');
  });

  it('uploads attachments to S3 and references them in the flow payload', async () => {
    s3Mock.on(GetObjectCommand).resolves({ Body: { transformToString: async () => RAW_EMAIL_WITH_ATTACHMENT } } as never);
    ddbMock.on(QueryCommand).resolves({ Items: [{ keyword: '#DEFAULT', flowDefinitionId: 'flow-x' }] });

    await invoke(sesEvent());

    expect(s3Mock).toHaveReceivedCommand(PutObjectCommand);
    const body = JSON.parse(sqsMock.commandCalls(SendMessageCommand)[0].args[0].input.MessageBody as string);
    expect(body.initialContextData.triggeringEmail.attachments).toHaveLength(1);
    expect(body.initialContextData.triggeringEmail.attachments[0].filename).toBe('note.txt');
  });

  it('extracts a trigger pattern from the body when the mapping defines one', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ keyword: '#DEFAULT', flowDefinitionId: 'flow-x', triggerMessagePattern: 'handle this (\\w+) request' }],
    });

    await invoke(sesEvent());

    const body = JSON.parse(sqsMock.commandCalls(SendMessageCommand)[0].args[0].input.MessageBody as string);
    expect(body.initialContextData.triggeringEmail.triggerPattern).toBe('URGENT');
  });

  it('discards the email when no mapping matches the recipient', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    await invoke(sesEvent());

    expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(0);
  });

  it('discards the email when the matched flow is inactive', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ keyword: '#DEFAULT', flowDefinitionId: 'flow-x' }] });
    mockedIsActive.mockResolvedValue(false);

    await invoke(sesEvent());

    expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(0);
  });

  it('throws when the email object cannot be read from S3', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ keyword: '#DEFAULT', flowDefinitionId: 'flow-x' }] });
    s3Mock.on(GetObjectCommand).resolves({ Body: undefined } as never);

    await expect(invoke(sesEvent())).rejects.toThrow();
  });
});
