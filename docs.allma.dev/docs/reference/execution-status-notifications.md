---
title: Execution Status Notifications
---

# Execution Status Notifications

Allma can tell the application that triggered a flow about its **progress** and, critically, its
**terminal status — including hard crashes** — without that application needing Admin (Cognito)
credentials.

There are two complementary mechanisms:

1. A **per-trigger callback** (`notificationConfig`) — point-to-point delivery to a webhook, SNS
   topic, or SQS queue you own, configured per execution.
2. A platform **execution status SNS topic** — a pub/sub broadcast you can subscribe to and filter.

Both deliver the **same JSON event payload**, so you parse it once regardless of channel.

---

## Lifecycle events

| Event        | When                                                                                  |
| ------------ | ------------------------------------------------------------------------------------- |
| `STARTED`    | The execution begins its first step.                                                   |
| `CHECKPOINT` | The execution advances to a new checkpoint milestone (coarse, author-defined cadence). |
| `TERMINAL`   | The execution ends: `COMPLETED`, `FAILED`, `TIMED_OUT`, or `CANCELLED`.                 |

`TERMINAL` is emitted by a crash-safe EventBridge dispatcher rather than by the in-flow finalize
path, so it is delivered **even when a flow crashes** (Lambda out-of-memory/timeout, Step Functions
abort) and never runs its graceful completion logic. A normal completion delivers **exactly one**
`TERMINAL` event.

---

## Event payload

```jsonc
{
  "schemaVersion": "1.0",
  "eventType": "CHECKPOINT",            // STARTED | CHECKPOINT | TERMINAL
  "rootFlowExecutionId": "R-uuid",      // the execution you triggered
  "flowExecutionId": "C-uuid",          // the node that produced the event (may equal the root)
  "flowDefinitionId": "invoice-flow",
  "flowDefinitionVersion": 7,
  "status": "RUNNING",                  // node status
  "depth": 1,                            // 0 = root, >0 = sub-flow
  "checkpoint": { "id": "extract", "label": "Extracting documents", "order": 2, "ordinal": 3 },
  "progressPercent": 66,
  "headline": { "label": "Extracting documents", "percent": 66 },
  "correlationKey": "your-job-id",      // echoed from your notificationConfig
  "errorInfo": null,                     // populated on a TERMINAL FAILED / TIMED_OUT
  "occurredAt": "2026-06-26T10:15:30.123Z"
}
```

:::warning At-least-once and unordered
Delivery is **at-least-once** and **not ordered**. Every event is self-describing (carries
`status`, `progressPercent`, and `occurredAt`). Consumers **must**:

- **Dedupe** on `(flowExecutionId, eventType, occurredAt)`.
- Treat a higher `occurredAt` as newer; do **not** assume `STARTED` arrives before `CHECKPOINT`.
:::

---

## Option 1 — Per-trigger callback (`notificationConfig`)

Include an optional `notificationConfig` on the flow trigger input. The caller decides **where** to
be notified, **per execution** — no sinks are baked into the flow definition.

```jsonc
{
  "flowDefinitionId": "invoice-flow",
  "initialContextData": { /* ... */ },
  "notificationConfig": {
    // Provide at least one sink:
    "webhookUrl": "https://app.example.com/allma/webhook",
    "snsTopicArn": "arn:aws:sns:us-east-1:111122223333:my-topic",
    "sqsUrl": "https://sqs.us-east-1.amazonaws.com/111122223333/my-queue",

    // Which events to deliver to the sinks above (default: ["TERMINAL"]):
    "events": ["CHECKPOINT", "TERMINAL"],

    // Echoed back on every event so you can correlate to your own record:
    "correlationKey": "your-job-id",

    // Optional HMAC signing secret (Secrets Manager ARN) for webhook delivery:
    "signingSecretArn": "arn:aws:secretsmanager:us-east-1:111122223333:secret:allma-webhook-abc"
  }
}
```

| Field             | Notes                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `webhookUrl`      | HTTPS endpoint that receives a `POST` of the event JSON.                                         |
| `snsTopicArn`     | Your SNS topic; Allma publishes the event JSON to it.                                            |
| `sqsUrl`          | Your SQS queue; Allma sends the event JSON as the message body.                                  |
| `events`          | Subset of `STARTED`, `CHECKPOINT`, `TERMINAL`. Defaults to `["TERMINAL"]`.                       |
| `correlationKey`  | Opaque string echoed back on every event.                                                       |
| `signingSecretArn`| Secrets Manager ARN of the HMAC secret. Allma reads it at send time; it never stores raw secrets.|

For cross-account SNS/SQS sinks, grant Allma's platform role permission to publish/send to your
resource via its resource policy.

### Verifying the webhook signature

When `signingSecretArn` is set, each webhook request carries an `x-allma-signature` header
containing `sha256=<hex>`, an HMAC-SHA256 of the **raw request body** keyed by your secret. Verify
it before trusting the payload (use a constant-time comparison):

```ts
import crypto from 'node:crypto';

function verifyAllmaSignature(rawBody: string, header: string, secret: string): boolean {
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody, 'utf-8').digest('hex')}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

Also reject events whose `occurredAt` is far in the past to bound replay.

---

## Option 2 — Subscribe to the status topic

Allma publishes every lifecycle event to a platform SNS topic,
`AllmaExecutionStatusTopic-<stage>` (its ARN is a stack output). Subscribe your own SQS queue or
HTTPS endpoint and filter **server-side** with a subscription filter policy on the message
attributes set on every publish:

| Attribute             | Example value                |
| --------------------- | ---------------------------- |
| `flowDefinitionId`    | `invoice-flow`               |
| `rootFlowExecutionId` | `R-uuid`                     |
| `eventType`           | `STARTED` / `CHECKPOINT` / `TERMINAL` |
| `status`              | `RUNNING` / `COMPLETED` / `FAILED` / `TIMED_OUT` / `CANCELLED` |

For example, to receive only terminal events for one flow definition:

```json
{
  "flowDefinitionId": ["invoice-flow"],
  "eventType": ["TERMINAL"]
}
```

Cross-account subscriptions are granted via the topic's resource policy.

---

## Execution tree (sub-flows & branches)

A flow can launch [sub-flows](./step-types/04-flow-control/start-sub-flow.md) and parallel branches,
each of which is its **own** execution with its own `flowExecutionId`. Every event is self-locating
within that tree:

- `rootFlowExecutionId` — the top-level execution **you triggered**. Group events by this to follow
  one logical job end-to-end.
- `flowExecutionId` — the specific node that produced the event (equals the root for top-level work).
- `depth` — `0` for the root, `>0` for nested sub-flows / branches.

Subscribe and correlate on `rootFlowExecutionId`; you never need to know a sub-flow exists in advance.
`STARTED` / `CHECKPOINT` events from a `SYNC` sub-flow surface the deepest active work, while the
`TERMINAL` event always describes the execution named in `flowExecutionId`.

## Monitoring progress from the Admin API

Operators with Admin (Cognito) credentials can **poll** live progress instead of (or in addition to)
consuming events, via
[`GET /allma/flow-executions/{id}/progress`](./admin-api/execution-monitoring-api.md#get-execution-progress).
Use `mode=tree` to retrieve the full nested sub-flow tree, or `mode=single` for a compact snapshot.
This is the authenticated surface for the Admin UI; the notification mechanisms on this page are the
**unauthenticated** path for the application that triggered the flow.

## Choosing a mechanism

- Use the **per-trigger callback** when each caller wants results delivered to a specific endpoint
  it owns (the common case for an app that triggers a flow and waits for the outcome).
- Use the **status topic** when one or more independent systems want to observe many executions and
  filter the stream themselves.

You can use both at once.
