---
"@allma/core-types": minor
"@allma/core-cdk": patch
---

feat(executions): crash-safe client notifications & execution status events (phase 3)

Implements Pillar C of the real-time execution status design: the application that triggered a
flow is reliably told about progress and terminal status — **including hard crashes** — without
Admin (Cognito) credentials. All additions are optional and backward-compatible.

- **Per-trigger callback.** A new optional `notificationConfig` on the trigger input
  (`{ webhookUrl?, snsTopicArn?, sqsUrl?, events, correlationKey?, signingSecretArn? }`) is
  persisted on the root execution record. Webhooks are HMAC-SHA256 signed when a signing-secret ARN
  is supplied (the platform reads it at send time and never stores raw secrets).
- **Status SNS topic.** A new `AllmaExecutionStatusTopic-<stage>` (stack output) broadcasts every
  lifecycle event with filterable message attributes (`flowDefinitionId`, `rootFlowExecutionId`,
  `eventType`, `status`) for server-side subscription filtering, including cross-account.
- **Shared event schema.** `notifications/execution-events.ts` defines the self-describing JSON
  payload (`schemaVersion`, ids, `status`, `checkpoint`, `progressPercent`, `headline`,
  `correlationKey`, `errorInfo`, `occurredAt`). Delivery is at-least-once and unordered; consumers
  dedupe on `(flowExecutionId, eventType, occurredAt)`.
- **Crash-safe dispatcher + reconciler.** A new `execution-lifecycle-dispatcher` Lambda, wired to
  the SFN Execution Status Change EventBridge rule (`SUCCEEDED|FAILED|TIMED_OUT|ABORTED`),
  reconciles "zombie RUNNING" records left by hard crashes, delivers the authoritative `TERMINAL`
  event to the caller's sinks, and publishes it to the status topic (retry + DLQ). `TERMINAL` is
  emitted only here, so a normal completion delivers exactly one and the crash path is always
  covered.
- **STARTED / CHECKPOINT** events are emitted from the orchestrator on the checkpoint cadence.
- Consumer-facing docs added under `docs.allma.dev/docs/reference/`.

`@allma/core-cdk` is a patch: it provisions the new topic / dispatcher / DLQ / EventBridge rule and
bundles the updated `allma-app-logic`, with no change to its published construct API.
