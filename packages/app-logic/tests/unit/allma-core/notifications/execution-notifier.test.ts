import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { ExecutionStatusEvent, NotificationConfig } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';

/**
 * Covers the shared notifier (Pillar C delivery): event construction, HMAC signing, status-topic
 * publish, and per-trigger sink fan-out with the events-array gate.
 */

const {
    buildExecutionEvent,
    signWebhookBody,
    emitLifecycleEvent,
} = await import('../../../../src/allma-core/notifications/execution-notifier.js');

const snsMock = mockClient(SNSClient);
const sqsMock = mockClient(SQSClient);
const secretsMock = mockClient(SecretsManagerClient);

const mockFetch = vi.fn();

beforeEach(() => {
    resetAwsClientMocks(snsMock, sqsMock, secretsMock);
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const sampleEvent = (overrides: Partial<ExecutionStatusEvent> = {}): ExecutionStatusEvent =>
    buildExecutionEvent({
        eventType: 'TERMINAL',
        rootFlowExecutionId: 'R',
        flowExecutionId: 'R',
        flowDefinitionId: 'flow-a',
        flowDefinitionVersion: 3,
        status: 'COMPLETED',
        progressPercent: 100,
        headlineLabel: 'Completed',
        occurredAt: '2026-06-27T00:00:00.000Z',
        ...overrides,
    });

describe('buildExecutionEvent', () => {
    it('stamps the schema version and includes a headline derived from the label', () => {
        const ev = sampleEvent();
        expect(ev.schemaVersion).toBe('1.0');
        expect(ev.eventType).toBe('TERMINAL');
        expect(ev.headline).toEqual({ label: 'Completed', percent: 100 });
        expect(ev.flowDefinitionVersion).toBe(3);
    });
});

describe('signWebhookBody', () => {
    it('produces a sha256= prefixed HMAC matching node crypto', () => {
        const body = '{"a":1}';
        const secret = 's3cr3t';
        const expected = `sha256=${crypto.createHmac('sha256', secret).update(body, 'utf-8').digest('hex')}`;
        expect(signWebhookBody(body, secret)).toBe(expected);
    });
});

describe('emitLifecycleEvent', () => {
    it('publishes to the status topic and skips sinks when no config opts in', async () => {
        snsMock.on(PublishCommand).resolves({ MessageId: 'm1' });
        const failures = await emitLifecycleEvent({ event: sampleEvent(), topicArn: 'arn:aws:sns:us-east-1:1:AllmaExecutionStatusTopic-dev', correlationId: 'c' });
        expect(failures).toBe(0);
        const publishes = snsMock.commandCalls(PublishCommand);
        expect(publishes).toHaveLength(1);
        expect(publishes[0].args[0].input.MessageAttributes?.eventType?.StringValue).toBe('TERMINAL');
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('delivers a signed webhook when the config opts into the event type', async () => {
        secretsMock.on(GetSecretValueCommand).resolves({ SecretString: 'whsec' });
        mockFetch.mockResolvedValue({ ok: true, status: 200 });

        const config: NotificationConfig = {
            webhookUrl: 'https://example.com/hook',
            events: ['TERMINAL'],
            signingSecretArn: 'arn:aws:secretsmanager:us-east-1:1:secret:wh',
            correlationKey: 'job-42',
        };
        const failures = await emitLifecycleEvent({ event: sampleEvent(), notificationConfig: config, correlationId: 'c' });

        expect(failures).toBe(0);
        expect(mockFetch).toHaveBeenCalledOnce();
        const [url, init] = mockFetch.mock.calls[0];
        expect(url).toBe('https://example.com/hook');
        const headers = init.headers as Record<string, string>;
        expect(headers['x-allma-signature']).toMatch(/^sha256=/);
        // correlationKey from the config is echoed into the delivered body.
        expect(JSON.parse(init.body).correlationKey).toBe('job-42');
    });

    it('does not deliver to sinks when the event type is not in the config events list', async () => {
        const config: NotificationConfig = { sqsUrl: 'https://sqs/x', events: ['TERMINAL'] };
        const failures = await emitLifecycleEvent({ event: sampleEvent({ eventType: 'CHECKPOINT', status: 'RUNNING' }), notificationConfig: config, correlationId: 'c' });
        expect(failures).toBe(0);
        expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(0);
    });

    it('counts a failed webhook (non-retryable 4xx) as a sink failure', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 400 });
        const config: NotificationConfig = { webhookUrl: 'https://example.com/hook', events: ['TERMINAL'] };
        const failures = await emitLifecycleEvent({ event: sampleEvent(), notificationConfig: config, correlationId: 'c' });
        expect(failures).toBe(1);
    });
});
