import { describe, it, expect, beforeEach } from 'vitest';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { StepType, TransientStepError, PermanentStepError, type StepDefinition } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../../_helpers/aws-mock.js';
import { makeRuntimeState } from '../../../_helpers/fixtures.js';
import { executeSendEmail } from '../../../../../src/allma-core/step-handlers/email/send-email-handler.js';

// Simple emails go through SESv2 SendEmail; emails with attachments are assembled into a raw
// MIME message (pulling bodies from S3) and sent via classic SES SendRawEmail. All three
// clients are stubbed at the send layer.
const sesV2Mock = mockClient(SESv2Client);
const sesMock = mockClient(SESClient);
const s3Mock = mockClient(S3Client);

const makeStepDef = (overrides: Record<string, unknown> = {}): StepDefinition =>
  ({
    id: 'email-1',
    stepType: StepType.EMAIL,
    from: 'sender@test.com',
    to: 'recipient@test.com',
    subject: 'Hello {{name}}',
    body: '<p>Hi {{name}}</p>',
    ...overrides,
  }) as unknown as StepDefinition;

describe('executeSendEmail', () => {
  beforeEach(() => {
    resetAwsClientMocks(sesV2Mock, sesMock, s3Mock);
  });

  it('sends a simple email via SESv2 and returns the message id and rendered params', async () => {
    sesV2Mock.on(SendEmailCommand).resolves({ MessageId: 'msg-123' });

    const result = await executeSendEmail(
      makeStepDef(),
      {},
      makeRuntimeState({ currentContextData: { name: 'Ada' } })
    );

    expect(result.outputData).toMatchObject({
      sesMessageId: 'msg-123',
      _meta: { status: 'SUCCESS' },
      renderedEmail: { subject: 'Hello Ada', body: '<p>Hi Ada</p>' },
    });
    expect(sesV2Mock).toHaveReceivedCommandWith(SendEmailCommand, {
      FromEmailAddress: 'sender@test.com',
      Destination: { ToAddresses: ['recipient@test.com'] },
    });
    expect(sesMock).toHaveReceivedCommandTimes(SendRawEmailCommand, 0);
  });

  it('formats the From header with a display name when fromName is set', async () => {
    sesV2Mock.on(SendEmailCommand).resolves({ MessageId: 'm' });

    await executeSendEmail(makeStepDef({ fromName: 'Allma Support' }), {}, makeRuntimeState());

    expect(sesV2Mock).toHaveReceivedCommandWith(SendEmailCommand, {
      FromEmailAddress: '"Allma Support" <sender@test.com>',
    });
  });

  it('splits a comma-separated recipient string into multiple addresses', async () => {
    sesV2Mock.on(SendEmailCommand).resolves({ MessageId: 'm' });

    await executeSendEmail(makeStepDef({ to: 'a@test.com, b@test.com' }), {}, makeRuntimeState());

    expect(sesV2Mock).toHaveReceivedCommandWith(SendEmailCommand, {
      Destination: { ToAddresses: ['a@test.com', 'b@test.com'] },
    });
  });

  it('extracts the bare address from a "Name <email>" recipient', async () => {
    sesV2Mock.on(SendEmailCommand).resolves({ MessageId: 'm' });

    await executeSendEmail(makeStepDef({ to: 'Ada Lovelace <ada@test.com>' }), {}, makeRuntimeState());

    expect(sesV2Mock).toHaveReceivedCommandWith(SendEmailCommand, {
      Destination: { ToAddresses: ['ada@test.com'] },
    });
  });

  it('sends a raw email via SES when static attachments are present, pulling the body from S3', async () => {
    s3Mock.on(GetObjectCommand).resolves({
      Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } as never,
      ContentLength: 3,
      ContentType: 'application/pdf',
    });
    sesMock.on(SendRawEmailCommand).resolves({ MessageId: 'raw-1' });

    const result = await executeSendEmail(
      makeStepDef({
        attachments: [{ filename: 'doc.pdf', s3Pointer: { bucket: 'b', key: 'k' } }],
      }),
      {},
      makeRuntimeState({ currentContextData: { name: 'Ada' } })
    );

    expect(result.outputData!.sesMessageId).toBe('raw-1');
    expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, { Bucket: 'b', Key: 'k' });
    expect(sesMock).toHaveReceivedCommandTimes(SendRawEmailCommand, 1);
    expect(sesV2Mock).toHaveReceivedCommandTimes(SendEmailCommand, 0);
  });

  it('passes cc, bcc, replyTo, and custom headers through to SESv2', async () => {
    sesV2Mock.on(SendEmailCommand).resolves({ MessageId: 'm' });

    await executeSendEmail(
      makeStepDef({
        cc: ['cc@test.com'],
        bcc: 'bcc@test.com',
        replyTo: 'reply@test.com',
        customHeaders: [{ name: 'X-Campaign', value: 'spring' }],
      }),
      {},
      makeRuntimeState()
    );

    expect(sesV2Mock).toHaveReceivedCommandWith(SendEmailCommand, {
      Destination: {
        ToAddresses: ['recipient@test.com'],
        CcAddresses: ['cc@test.com'],
        BccAddresses: ['bcc@test.com'],
      },
      ReplyToAddresses: ['reply@test.com'],
      Content: {
        Simple: expect.objectContaining({
          Headers: [{ Name: 'X-Campaign', Value: 'spring' }],
        }),
      },
    });
  });

  it('resolves dynamic attachments from attachmentsPath and sends a raw email', async () => {
    s3Mock.on(GetObjectCommand).resolves({
      Body: { transformToByteArray: async () => new Uint8Array([9]) } as never,
      ContentLength: 1,
      ContentType: 'text/csv',
    });
    sesMock.on(SendRawEmailCommand).resolves({ MessageId: 'raw-dyn' });

    const result = await executeSendEmail(
      makeStepDef({ attachmentsPath: '$.files' }),
      {},
      makeRuntimeState({
        currentContextData: { name: 'x', files: [{ filename: 'data.csv', s3Pointer: { bucket: 'b', key: 'k' } }] },
      })
    );

    expect(result.outputData!.sesMessageId).toBe('raw-dyn');
    expect(sesMock).toHaveReceivedCommandTimes(SendRawEmailCommand, 1);
  });

  it('sends a simple email when attachmentsPath resolves to undefined', async () => {
    sesV2Mock.on(SendEmailCommand).resolves({ MessageId: 'm' });

    await executeSendEmail(
      makeStepDef({ attachmentsPath: '$.missing' }),
      {},
      makeRuntimeState({ currentContextData: {} })
    );

    expect(sesV2Mock).toHaveReceivedCommandTimes(SendEmailCommand, 1);
    expect(sesMock).toHaveReceivedCommandTimes(SendRawEmailCommand, 0);
  });

  it('rejects when attachmentsPath points at a non-attachment-shaped array', async () => {
    await expect(
      executeSendEmail(
        makeStepDef({ attachmentsPath: '$.files' }),
        {},
        makeRuntimeState({ currentContextData: { files: [{ not: 'an-attachment' }] } })
      )
    ).rejects.toBeInstanceOf(PermanentStepError);
  });

  it('throws a PermanentStepError when an attachment S3 object has no body', async () => {
    s3Mock.on(GetObjectCommand).resolves({ Body: undefined });

    await expect(
      executeSendEmail(
        makeStepDef({ attachments: [{ filename: 'doc.pdf', s3Pointer: { bucket: 'b', key: 'k' } }] }),
        {},
        makeRuntimeState()
      )
    ).rejects.toBeInstanceOf(PermanentStepError);
  });

  it('rejects when a rendered address is not a valid email', async () => {
    await expect(
      executeSendEmail(makeStepDef({ from: 'not-an-email' }), {}, makeRuntimeState())
    ).rejects.toThrow('Invalid rendered parameters for email-send');
  });

  it('wraps a transient SES error as a TransientStepError', async () => {
    sesV2Mock.on(SendEmailCommand).rejects(
      Object.assign(new Error('slow down'), { name: 'ThrottlingException' })
    );

    await expect(executeSendEmail(makeStepDef(), {}, makeRuntimeState())).rejects.toBeInstanceOf(
      TransientStepError
    );
  });
});
