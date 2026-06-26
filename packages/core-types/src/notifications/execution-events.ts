import { z } from 'zod';
import { AllmaErrorSchema } from '../common/core.js';

/**
 * Shared, product-agnostic contracts for delivering flow-execution status to the application that
 * triggered a flow (Pillar C). Two complementary mechanisms use these:
 *  - a per-trigger `notificationConfig` (point-to-point webhook / SNS / SQS callback), and
 *  - a platform `AllmaExecutionStatusTopic` (pub/sub broadcast).
 *
 * The event payload is self-describing (carries `status`, `occurredAt`, `progressPercent`) because
 * delivery is **at-least-once and unordered**: consumers must dedupe on
 * (`flowExecutionId`, `eventType`, `occurredAt`) and treat a higher `occurredAt` as newer.
 */

/** Version of {@link ExecutionStatusEventSchema}. Bump on a breaking payload change. */
export const EXECUTION_EVENT_SCHEMA_VERSION = '1.0' as const;

/** Lifecycle events a consumer can be notified about. */
export const NotificationEventTypeSchema = z.enum(['STARTED', 'CHECKPOINT', 'TERMINAL']);
export type NotificationEventType = z.infer<typeof NotificationEventTypeSchema>;

/**
 * Per-trigger notification configuration. Supplied on the trigger input (per execution) so the
 * caller decides **where** to be notified without baking sinks into the flow definition, and
 * without needing Admin (Cognito) credentials. At least one sink should be provided.
 */
export const NotificationConfigSchema = z.object({
  /** HTTPS endpoint to POST the event to; signed with HMAC-SHA256 when `signingSecretArn` is set. */
  webhookUrl: z.string().url().optional(),
  /** SNS topic to publish the event to (the consumer's own topic). */
  snsTopicArn: z.string().startsWith('arn:aws:sns:').optional(),
  /** SQS queue URL to send the event to (the consumer's own queue). */
  sqsUrl: z.string().url().optional(),
  /** Which lifecycle events to deliver to the sinks above. Defaults to terminal-only. */
  events: z.array(NotificationEventTypeSchema).default(['TERMINAL']),
  /** Echoed back on every event so the caller can correlate to its own job/record. */
  correlationKey: z.string().optional(),
  /**
   * Secrets Manager ARN of the HMAC signing secret. The platform reads it at send time and never
   * persists the raw secret. When omitted, webhooks are delivered unsigned.
   */
  signingSecretArn: z.string().optional(),
});
export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;

/** Checkpoint milestone carried on an event (mirrors the step's declared checkpoint). */
export const EventCheckpointSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number().int().optional(),
  ordinal: z.number().int().optional(),
});

/**
 * The JSON payload delivered to webhook / SNS / SQS sinks and published to the status topic.
 * Identical across all delivery channels so a consumer parses it once.
 */
export const ExecutionStatusEventSchema = z.object({
  schemaVersion: z.string(),
  eventType: NotificationEventTypeSchema,
  /** The root execution the caller triggered (use this to correlate a whole tree). */
  rootFlowExecutionId: z.string(),
  /** The node that produced the event (may equal `rootFlowExecutionId`). */
  flowExecutionId: z.string(),
  flowDefinitionId: z.string(),
  flowDefinitionVersion: z.number().int().optional(),
  /** The node's status. */
  status: z.enum(['INITIALIZING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED']),
  depth: z.number().int().optional(),
  checkpoint: EventCheckpointSchema.optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  headline: z
    .object({
      label: z.string(),
      percent: z.number().int().min(0).max(100).optional(),
    })
    .optional(),
  correlationKey: z.string().optional(),
  /** Populated on a TERMINAL FAILED / TIMED_OUT event. */
  errorInfo: AllmaErrorSchema.optional(),
  occurredAt: z.string().datetime({ offset: true }),
});
export type ExecutionStatusEvent = z.infer<typeof ExecutionStatusEventSchema>;

/**
 * Message-attribute keys set on every status-topic publish so subscribers can filter server-side
 * (e.g. by `flowDefinitionId` or a set of `rootFlowExecutionId`s) via a subscription filter policy.
 */
export const EXECUTION_EVENT_ATTRIBUTE_KEYS = {
  flowDefinitionId: 'flowDefinitionId',
  rootFlowExecutionId: 'rootFlowExecutionId',
  eventType: 'eventType',
  status: 'status',
} as const;

/** Header carrying the HMAC-SHA256 signature of the raw webhook body (hex, prefixed `sha256=`). */
export const EXECUTION_WEBHOOK_SIGNATURE_HEADER = 'x-allma-signature' as const;
