import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  SFNClient,
  SendTaskSuccessCommand,
  TaskTimedOut,
} from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

vi.hoisted(() => {
  process.env.ALLMA_CONTINUATION_TABLE_NAME = 'continuation-table';
});

const { handler } = await import('../../../src/allma-flows/resume-flow.js');

const sfnMock = mockClient(SFNClient);
const ddbMock = mockClient(DynamoDBDocumentClient);

const event = (body: unknown): APIGatewayProxyEventV2 =>
  ({
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: { requestId: 'req-1' },
  }) as unknown as APIGatewayProxyEventV2;

const invoke = async (body: unknown): Promise<APIGatewayProxyStructuredResultV2> =>
  (await handler(event(body), {} as never, (() => undefined) as never)) as APIGatewayProxyStructuredResultV2;

beforeEach(() => {
  resetAwsClientMocks(sfnMock, ddbMock);
  ddbMock.on(DeleteCommand).resolves({ Attributes: { taskToken: 'tok-1', flowExecutionId: 'exec-1' } });
  sfnMock.on(SendTaskSuccessCommand).resolves({});
});

describe('resume-flow handler', () => {
  it('consumes the continuation record and resumes the SFN task (202)', async () => {
    const result = await invoke({ correlationValue: 'key-1', payload: { reply: 'hi' } });

    expect(result.statusCode).toBe(202);
    // The continuation record is atomically deleted to prevent replay.
    expect(ddbMock.commandCalls(DeleteCommand)[0].args[0].input.ReturnValues).toBe('ALL_OLD');
    const sfnInput = sfnMock.commandCalls(SendTaskSuccessCommand)[0].args[0].input;
    expect(sfnInput.taskToken).toBe('tok-1');
    expect(JSON.parse(sfnInput.output as string)).toEqual({ reply: 'hi' });
  });

  it('returns 400 for an invalid request body', async () => {
    const result = await invoke({ payload: {} });
    expect(result.statusCode).toBe(400);
    expect(sfnMock.commandCalls(SendTaskSuccessCommand)).toHaveLength(0);
  });

  it('returns 404 when no waiting task exists for the correlation key', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    const result = await invoke({ correlationValue: 'missing' });
    expect(result.statusCode).toBe(404);
  });

  it('returns 500 when the continuation record is malformed', async () => {
    ddbMock.on(DeleteCommand).resolves({ Attributes: { flowExecutionId: 'exec-1' } });
    const result = await invoke({ correlationValue: 'key-1' });
    expect(result.statusCode).toBe(500);
  });

  it('returns 413 when the resume payload exceeds the SFN limit', async () => {
    const result = await invoke({ correlationValue: 'key-1', payload: { blob: 'x'.repeat(300 * 1024) } });
    expect(result.statusCode).toBe(413);
    expect(sfnMock.commandCalls(SendTaskSuccessCommand)).toHaveLength(0);
  });

  it('returns 410 when the SFN task has timed out or the token is invalid', async () => {
    sfnMock.on(SendTaskSuccessCommand).rejects(new TaskTimedOut({ message: 'gone', $metadata: {} }));
    const result = await invoke({ correlationValue: 'key-1' });
    expect(result.statusCode).toBe(410);
  });

  it('returns 500 on an unexpected SFN error', async () => {
    sfnMock.on(SendTaskSuccessCommand).rejects(new Error('network blip'));
    const result = await invoke({ correlationValue: 'key-1' });
    expect(result.statusCode).toBe(500);
  });
});
