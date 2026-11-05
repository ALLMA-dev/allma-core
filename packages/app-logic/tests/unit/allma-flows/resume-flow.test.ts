import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SFNClient,
  SendTaskSuccessCommand,
  TaskTimedOut,
} from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';
import { ContinuationStateService, ContinuationOwnershipMismatchError } from '../../../src/allma-core/continuation-state.service.js';

vi.hoisted(() => {
  process.env.ALLMA_CONTINUATION_TABLE_NAME = 'continuation-table';
});

const { handler } = await import('../../../src/allma-flows/resume-flow.js');

const sfnMock = mockClient(SFNClient);
const ddbMock = mockClient(DynamoDBDocumentClient);

// A caller authenticated via the IAM authorizer: a non-system principal by default.
const iamContext = (userArn = 'arn:aws:iam::111122223333:role/CallerRole') => ({
  authorizer: { iam: { userArn, accountId: '111122223333' } },
});

const event = (body: unknown, requestContextExtra: Record<string, unknown> = iamContext()): APIGatewayProxyEventV2 =>
  ({
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {},
    requestContext: { requestId: 'req-1', ...requestContextExtra },
  }) as unknown as APIGatewayProxyEventV2;

const invoke = async (
  body: unknown,
  requestContextExtra?: Record<string, unknown>,
): Promise<APIGatewayProxyStructuredResultV2> =>
  (await handler(
    event(body, requestContextExtra),
    {} as never,
    (() => undefined) as never,
  )) as APIGatewayProxyStructuredResultV2;

beforeEach(() => {
  resetAwsClientMocks(sfnMock, ddbMock);
  delete process.env.ALLMA_WEBHOOK_API_KEY_SECRET_ARN;
  ddbMock.on(DeleteCommand).resolves({ Attributes: { taskToken: 'tok-1', flowExecutionId: 'exec-1' } });
  sfnMock.on(SendTaskSuccessCommand).resolves({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resume-flow handler', () => {
  it('passes the authenticated principal as the owner and resumes the SFN task (202)', async () => {
    const consumeSpy = vi.spyOn(ContinuationStateService, 'consumeContinuationRecord');
    const result = await invoke({ correlationValue: 'key-1', payload: { reply: 'hi' } });

    expect(result.statusCode).toBe(202);
    expect(consumeSpy).toHaveBeenCalledWith('key-1', 'arn:aws:iam::111122223333:role/CallerRole');
    expect(ddbMock.commandCalls(DeleteCommand)[0].args[0].input.ReturnValues).toBe('ALL_OLD');
    const sfnInput = sfnMock.commandCalls(SendTaskSuccessCommand)[0].args[0].input;
    expect(sfnInput.taskToken).toBe('tok-1');
    expect(JSON.parse(sfnInput.output as string)).toEqual({ reply: 'hi' });
  });

  it('passes undefined owner (system bypass) for the orchestration-role caller', async () => {
    const consumeSpy = vi.spyOn(ContinuationStateService, 'consumeContinuationRecord');
    const result = await invoke(
      { correlationValue: 'key-1', payload: { reply: 'ok' } },
      iamContext('arn:aws:iam::111122223333:role/AllmaOrchestrationLambdaRole-dev'),
    );

    expect(result.statusCode).toBe(202);
    expect(consumeSpy).toHaveBeenCalledWith('key-1', undefined);
  });

  it('returns 401 when the request carries neither IAM context nor a configured caller secret', async () => {
    const consumeSpy = vi.spyOn(ContinuationStateService, 'consumeContinuationRecord');
    const result = await invoke({ correlationValue: 'key-1' }, {});
    expect(result.statusCode).toBe(401);
    expect(consumeSpy).not.toHaveBeenCalled();
    expect(sfnMock.commandCalls(SendTaskSuccessCommand)).toHaveLength(0);
  });

  it('returns 403 and never sends SendTaskSuccess when the caller does not own the waiting run', async () => {
    vi.spyOn(ContinuationStateService, 'consumeContinuationRecord').mockRejectedValueOnce(
      new ContinuationOwnershipMismatchError(),
    );
    const result = await invoke({ correlationValue: 'key-1' });
    expect(result.statusCode).toBe(403);
    expect(sfnMock.commandCalls(SendTaskSuccessCommand)).toHaveLength(0);
  });

  it('returns 400 for an invalid request body', async () => {
    const consumeSpy = vi.spyOn(ContinuationStateService, 'consumeContinuationRecord');
    const result = await invoke({ payload: {} });
    expect(result.statusCode).toBe(400);
    expect(consumeSpy).not.toHaveBeenCalled();
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(0);
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

  it('returns 413 when the resume payload exceeds the SFN limit without consuming the continuation record', async () => {
    const consumeSpy = vi.spyOn(ContinuationStateService, 'consumeContinuationRecord');
    const result = await invoke({ correlationValue: 'key-1', payload: { blob: 'x'.repeat(300 * 1024) } });
    expect(result.statusCode).toBe(413);
    expect(consumeSpy).not.toHaveBeenCalled();
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(0);
    expect(sfnMock.commandCalls(SendTaskSuccessCommand)).toHaveLength(0);

    const retryResult = await invoke({ correlationValue: 'key-1', payload: { reply: 'ok' } });
    expect(retryResult.statusCode).toBe(202);
    expect(consumeSpy).toHaveBeenCalledOnce();
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(1);
    expect(sfnMock.commandCalls(SendTaskSuccessCommand)).toHaveLength(1);
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
