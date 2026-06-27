import crypto from 'node:crypto';
import { SNSClient, PublishCommand, MessageAttributeValue } from '@aws-sdk/client-sns';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import {
    type ExecutionStatusEvent,
    type NotificationConfig,
    type NotificationEventType,
    type AllmaError,
    EXECUTION_EVENT_SCHEMA_VERSION,
    EXECUTION_EVENT_ATTRIBUTE_KEYS,
    EXECUTION_WEBHOOK_SIGNATURE_HEADER,
} from '@allma/core-types';
import { log_info, log_warn, log_error } from '@allma/core-sdk';

// Adaptive retry smooths over transient throttles; webhook retries are handled explicitly below.
const snsClient = new SNSClient({ maxAttempts: 3, retryMode: 'adaptive' });
const sqsClient = new SQSClient({ maxAttempts: 3, retryMode: 'adaptive' });
const secretsClient = new SecretsManagerClient({ maxAttempts: 3, retryMode: 'adaptive' });

const WEBHOOK_TIMEOUT_MS = 5000;
const WEBHOOK_MAX_ATTEMPTS = 3;

// Signing secrets rarely change and a Lambda may deliver many events; cache per warm container.
const signingSecretCache = new Map<string, string>();

export interface BuildEventParams {
    eventType: NotificationEventType;
    rootFlowExecutionId: string;
    flowExecutionId: string;
    flowDefinitionId: string;
    flowDefinitionVersion?: number;
    status: ExecutionStatusEvent['status'];
    depth?: number;
    checkpoint?: ExecutionStatusEvent['checkpoint'];
    progressPercent?: number;
    headlineLabel?: string;
    correlationKey?: string;
    errorInfo?: AllmaError;
    occurredAt: string;
}

/** Assembles a self-describing lifecycle event. Pure (no I/O) so it is trivially testable. */
export function buildExecutionEvent(p: BuildEventParams): ExecutionStatusEvent {
    return {
        schemaVersion: EXECUTION_EVENT_SCHEMA_VERSION,
        eventType: p.eventType,
        rootFlowExecutionId: p.rootFlowExecutionId,
        flowExecutionId: p.flowExecutionId,
        flowDefinitionId: p.flowDefinitionId,
        ...(p.flowDefinitionVersion !== undefined && { flowDefinitionVersion: p.flowDefinitionVersion }),
        status: p.status,
        ...(p.depth !== undefined && { depth: p.depth }),
        ...(p.checkpoint && { checkpoint: p.checkpoint }),
        ...(p.progressPercent !== undefined && { progressPercent: p.progressPercent }),
        ...(p.headlineLabel && {
            headline: { label: p.headlineLabel, ...(p.progressPercent !== undefined && { percent: p.progressPercent }) },
        }),
        ...(p.correlationKey && { correlationKey: p.correlationKey }),
        ...(p.errorInfo && { errorInfo: p.errorInfo }),
        occurredAt: p.occurredAt,
    };
}

/** HMAC-SHA256 of the raw body, hex-encoded and prefixed `sha256=` (the value of the signature header). */
export function signWebhookBody(body: string, secret: string): string {
    return `sha256=${crypto.createHmac('sha256', secret).update(body, 'utf-8').digest('hex')}`;
}

async function getSigningSecret(secretArn: string, correlationId: string): Promise<string | undefined> {
    const cached = signingSecretCache.get(secretArn);
    if (cached) return cached;
    try {
        const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
        const secret = res.SecretString;
        if (secret) signingSecretCache.set(secretArn, secret);
        return secret;
    } catch (e: any) {
        log_error('Failed to read webhook signing secret; delivering unsigned is not allowed when a secret is configured.', { secretArn, error: e.message }, correlationId);
        return undefined;
    }
}

/** Publishes an event to the platform status topic with filterable message attributes. */
export async function publishToStatusTopic(event: ExecutionStatusEvent, topicArn: string): Promise<void> {
    const messageAttributes: Record<string, MessageAttributeValue> = {
        [EXECUTION_EVENT_ATTRIBUTE_KEYS.flowDefinitionId]: { DataType: 'String', StringValue: event.flowDefinitionId },
        [EXECUTION_EVENT_ATTRIBUTE_KEYS.rootFlowExecutionId]: { DataType: 'String', StringValue: event.rootFlowExecutionId },
        [EXECUTION_EVENT_ATTRIBUTE_KEYS.eventType]: { DataType: 'String', StringValue: event.eventType },
        [EXECUTION_EVENT_ATTRIBUTE_KEYS.status]: { DataType: 'String', StringValue: event.status },
    };
    await snsClient.send(new PublishCommand({ TopicArn: topicArn, Message: JSON.stringify(event), MessageAttributes: messageAttributes }));
}

async function deliverWebhook(url: string, event: ExecutionStatusEvent, signingSecretArn: string | undefined, correlationId: string): Promise<void> {
    const body = JSON.stringify(event);
    const headers: Record<string, string> = { 'content-type': 'application/json' };

    if (signingSecretArn) {
        const secret = await getSigningSecret(signingSecretArn, correlationId);
        if (!secret) throw new Error('Signing secret unavailable; refusing to send unsigned webhook for a signed config.');
        headers[EXECUTION_WEBHOOK_SIGNATURE_HEADER] = signWebhookBody(body, secret);
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= WEBHOOK_MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
        try {
            const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
            if (res.ok) return;
            // 4xx (except 429) are not retryable — the request is malformed/rejected.
            if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                throw new Error(`Webhook returned non-retryable status ${res.status}`);
            }
            lastError = new Error(`Webhook returned status ${res.status}`);
        } catch (e) {
            lastError = e;
        } finally {
            clearTimeout(timer);
        }
    }
    throw lastError instanceof Error ? lastError : new Error('Webhook delivery failed');
}

/**
 * Delivers an event to every sink configured on the per-trigger callback. Best-effort: each sink is
 * attempted independently and failures are logged (the dispatcher's DLQ is the backstop for terminal
 * delivery). Returns the number of sinks that failed, so callers can decide whether to surface it.
 */
export async function deliverToSinks(event: ExecutionStatusEvent, config: NotificationConfig, correlationId: string): Promise<number> {
    const tasks: Array<Promise<void>> = [];

    if (config.webhookUrl) {
        tasks.push(deliverWebhook(config.webhookUrl, event, config.signingSecretArn, correlationId));
    }
    if (config.snsTopicArn) {
        tasks.push(snsClient.send(new PublishCommand({ TopicArn: config.snsTopicArn, Message: JSON.stringify(event) })).then(() => undefined));
    }
    if (config.sqsUrl) {
        tasks.push(sqsClient.send(new SendMessageCommand({ QueueUrl: config.sqsUrl, MessageBody: JSON.stringify(event) })).then(() => undefined));
    }

    const results = await Promise.allSettled(tasks);
    let failures = 0;
    for (const r of results) {
        if (r.status === 'rejected') {
            failures++;
            log_warn('Notification sink delivery failed.', { eventType: event.eventType, reason: String((r as PromiseRejectedResult).reason) }, correlationId);
        }
    }
    return failures;
}

/**
 * Emits a lifecycle event: always publishes to the status topic (when configured) and, when a
 * per-trigger `notificationConfig` opted into this event type, delivers it to the caller's sinks.
 * Never throws — notification is best-effort and must not disrupt the orchestration loop. Returns
 * the number of per-trigger sink failures (0 when none / not applicable) so a caller that needs the
 * DLQ backstop (the terminal dispatcher) can react.
 */
export async function emitLifecycleEvent(params: {
    event: ExecutionStatusEvent;
    notificationConfig?: NotificationConfig;
    topicArn?: string;
    correlationId: string;
}): Promise<number> {
    const { event, notificationConfig, topicArn, correlationId } = params;

    if (topicArn) {
        try {
            await publishToStatusTopic(event, topicArn);
        } catch (e: any) {
            log_warn('Failed to publish to execution status topic (non-fatal).', { eventType: event.eventType, error: e.message }, correlationId);
        }
    }

    if (notificationConfig && notificationConfig.events.includes(event.eventType)) {
        const eventForCaller = notificationConfig.correlationKey
            ? { ...event, correlationKey: notificationConfig.correlationKey }
            : event;
        const failures = await deliverToSinks(eventForCaller, notificationConfig, correlationId);
        if (failures === 0) {
            log_info('Lifecycle event delivered to caller sinks.', { eventType: event.eventType }, correlationId);
        }
        return failures;
    }
    return 0;
}
