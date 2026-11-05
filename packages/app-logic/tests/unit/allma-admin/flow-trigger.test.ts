import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import type { StartFlowExecutionInput } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

vi.hoisted(() => {
  process.env.ALLMA_FLOW_START_REQUEST_QUEUE_URL = 'https://sqs.test/queue';
});

vi.mock('../../../src/allma-admin/services/flow-activation.service.js', () => ({
  FlowActivationService: { isFlowActive: vi.fn().mockResolvedValue(true) },
}));

const { handler } = await import('../../../src/allma-admin/flow-trigger.js');
const { FlowActivationService } = await import('../../../src/allma-admin/services/flow-activation.service.js');

const sqsMock = mockClient(SQSClient);

const iamContext = (userArn = 'arn:aws:iam::111122223333:role/CallerRole') => ({
  authorizer: { iam: { userArn, accountId: '111122223333' } },
});

const event = (
  body: unknown,
  requestContextExtra: Record<string, unknown> = iamContext(),
): APIGatewayProxyEventV2 =>
  ({
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {},
    pathParameters: { flowId: 'flow-1' },
    queryStringParameters: {},
    requestContext: { requestId: 'req-1', http: { sourceIp: '1.2.3.4' }, ...requestContextExtra },
  }) as unknown as APIGatewayProxyEventV2;

const invoke = async (
  body: unknown,
  requestContextExtra?: Record<string, unknown>,
): Promise<APIGatewayProxyStructuredResultV2> =>
  (await handler(event(body, requestContextExtra))) as APIGatewayProxyStructuredResultV2;

beforeEach(() => {
  resetAwsClientMocks(sqsMock);
  delete process.env.ALLMA_WEBHOOK_API_KEY_SECRET_ARN;
  sqsMock.on(SendMessageCommand).resolves({ MessageId: 'msg-1' });
  vi.mocked(FlowActivationService.isFlowActive).mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('flow-trigger handler', () => {
  it('rejects an unauthenticated request with 401 and never queues the flow', async () => {
    const result = await invoke({ seed: 1 }, {});
    expect(result.statusCode).toBe(401);
    expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(0);
    // Auth is checked before flow activation.
    expect(FlowActivationService.isFlowActive).not.toHaveBeenCalled();
  });

  it('stamps the authenticated principal as ownerPrincipal on the queued StartFlowExecutionInput', async () => {
    const result = await invoke({ seed: 1 });
    expect(result.statusCode).toBe(202);

    const sent = sqsMock.commandCalls(SendMessageCommand)[0].args[0].input;
    const startInput = JSON.parse(sent.MessageBody as string) as StartFlowExecutionInput;
    expect(startInput.ownerPrincipal).toBe('arn:aws:iam::111122223333:role/CallerRole');
    expect(startInput.flowDefinitionId).toBe('flow-1');
    expect(startInput.initialContextData).toEqual({ seed: 1 });
  });

  it('returns 403 when the flow is inactive (auth already passed)', async () => {
    vi.mocked(FlowActivationService.isFlowActive).mockResolvedValue(false);
    const result = await invoke({ seed: 1 });
    expect(result.statusCode).toBe(403);
    expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(0);
  });
});
