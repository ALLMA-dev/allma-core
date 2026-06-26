# Design: Real-Time Flow Execution Status & Client Notifications

| | |
|---|---|
| **Status** | Draft for implementation |
| **Scope** | Platform (`packages/*`, `allma.cdk/`) — product-agnostic |
| **Audience** | Allma platform engineers |
| **Related** | Admin execution monitoring, Step Functions orchestration, `onCompletionActions` |

---

## 1. Summary

This document specifies how the Allma platform exposes **live, easy-to-read execution progress** and **delivers status to the application that triggered a flow** (e.g. a consumer app such as the generic `examples/basic-deployment`).

It delivers three capabilities:

1. **Progress model** — "what is going on now", "which stage", and "how many steps / checkpoints done vs. left → percentage". *No time estimation / ETA.*
2. **Subflow roll-up** — progress of nested sub-flows and parallel branches is visible from the top-level execution the caller triggered.
3. **Notifications & subscriptions** — the triggering application is reliably told about progress and, critically, **terminal status including hard crashes**, via a per-trigger callback and/or a pub/sub topic.

The design is **additive and backward-compatible**: all new fields are optional; flows that adopt nothing keep working and still get a zero-config step-count progress bar.

---

## 2. Goals / Non-Goals

### Goals
- Show, for any running execution: the current step, a human-readable stage, and a percentage based on **completed steps / checkpoints**.
- Let flow authors mark a small set of steps as **checkpoints** so progress reflects *meaningful milestones*, not millisecond micro-steps.
- Surface **sub-flow and parallel-branch** progress from the root execution.
- Notify the triggering application of progress and terminal status, **including crashes where the flow never finalizes gracefully**.
- Let a consumer application **subscribe** to the status of flows *it* triggered, without Admin (Cognito) credentials.
- Keep the Admin UI as the rich, authenticated monitoring surface.

### Non-Goals
- **No ETA / time-to-completion estimation.** Explicitly out of scope.
- No change to flow execution semantics or the iterative Step Functions loop.
- No new GraphQL/AppSync stack. We stay REST + SNS/EventBrige, optionally WebSocket later.
- No historical duration baselines or percentile analytics.

---

## 3. Background — current architecture (as-is)

| Concern | Where | Notes |
|---|---|---|
| Execution + step records | DynamoDB `AllmaFlowExecutionLogTable`, `PK=flowExecutionId`, `SK=eventTimestamp_stepInstanceId_attempt` | One `METADATA` record per execution; one `STEP#…` record per step attempt. `core-cdk/lib/constructs/data-stores.ts` |
| Record schemas | `packages/core-types/src/logging/records.ts` | `AllmaFlowExecutionRecordSchema`, `AllmaStepExecutionRecordSchema` |
| Status enums | same | flow: `INITIALIZING\|RUNNING\|COMPLETED\|FAILED\|TIMED_OUT\|CANCELLED`; step: `STARTED\|COMPLETED\|FAILED\|RETRYING_SFN\|RETRYING_CONTENT\|SKIPPED` |
| Record writer | `packages/app-logic/src/allma-core/execution-logger.ts` (+ `execution-logger-client.ts`) | **Async, fire-and-forget** (`Event` invocation). Step records may lag a step boundary by ~seconds. |
| Metadata create | `packages/app-logic/src/allma-flows/initialize-flow.ts` | writes `status=RUNNING` METADATA record |
| Metadata finalize | `packages/app-logic/src/allma-flows/finalize-flow.ts` | sets terminal status; runs `onCompletionActions` |
| Orchestration | `packages/core-cdk/lib/constructs/orchestration.ts` | iterative Lambda-per-step loop on Step Functions; **SFN execution name = `flowExecutionId`** |
| Step processor | `packages/app-logic/src/allma-flows/iterative-step-processor/` | `index.ts`, `step-executor.ts`, `sync-flow-handler.ts`, `parallel-handler.ts` |
| Sub-flow (SYNC) | `sync-flow-handler.ts` | nested SFN `.sync` execution; child gets a **new** `flowExecutionId`; link to parent is **only a string** in `triggerSource` |
| Step definition | `packages/core-types/src/steps/definitions.ts` | `StepInstance` has `displayName`, `transitions[]` (conditional, JSONPath), `defaultNextStepInstanceId`; **no stage/checkpoint concept** |
| Admin routes | `packages/core-types/src/admin/endpoints.ts` | `ALLMA_ADMIN_API_ROUTES`, version `v1`, base `/allma/flow-executions` |
| Admin handler/service | `packages/app-logic/src/allma-admin/execution-monitoring.ts` + `services/execution-monitoring.service.ts` | list / detail / step-record / branch-steps |
| Admin auth | `packages/core-sdk/src/authUtils.ts` `withAdminAuth` | Cognito `Admins` group + `EXECUTIONS_READ` permission |
| UI | `packages/admin-shell/src/features/executions/*`, `src/api/executionService.ts` | REST + manual refresh; **no polling on execution views**; no WS/SSE |
| Flow-level egress | `finalize-flow.ts` + `packages/core-types/src/flow/actions.ts` `onCompletionActions` | API_CALL / SNS_SEND / CUSTOM_LAMBDA_INVOKE work; SQS_SEND stubbed |
| Crash net | `packages/core-cdk/lib/constructs/monitoring.ts` | EventBridge rule on SFN `FAILED\|TIMED_OUT\|ABORTED` → SNS alerts topic |
| Trigger entry | `flow-start-request-listener.ts` (SQS), `allma-admin/flow-trigger.ts` (API) | `StartFlowExecutionInput` has `triggerSource` string; **no callback/replyTo field** |

### Two architectural facts that drive the design

1. **A SYNC sub-flow suspends its parent.** It runs as a nested SFN `.sync` task, so while the child runs, the parent's orchestrator Lambda is *not executing*. The parent therefore **cannot pull** child status — propagation must be **child-driven (push up)** or **assembled at read time (pull the tree)**.
2. **Graceful finalize is not guaranteed.** `finalize-flow` (and thus `onCompletionActions` and the terminal DynamoDB write) is skipped on a hard crash (Lambda OOM/timeout, SFN abort). The **EventBridge SFN-status-change event is the only crash-proof terminal signal**, and today it only emails an alerts topic. Reliable client notification and "stuck-at-RUNNING" repair must be built on EventBridge, not on `finalize-flow`.

---

## 4. Design overview

Three pillars:

```
 ┌────────────────────────────────────────────────────────────────────┐
 │ A. PROGRESS MODEL (per execution)                                    │
 │   • checkpoint on the step definition  → derived denominator         │
 │   • orchestrator stamps METADATA: currentStep, completedSteps,       │
 │     totalSteps, currentCheckpoint, percent                           │
 ├────────────────────────────────────────────────────────────────────┤
 │ B. EXECUTION TREE (across sub-flows / branches)                      │
 │   • structured linkage on child METADATA: parent/root ids            │
 │   • GSI by rootFlowExecutionId → one query returns the whole tree    │
 │   • child bubbles a one-line liveStatus onto the ROOT record         │
 ├────────────────────────────────────────────────────────────────────┤
 │ C. DELIVERY                                                          │
 │   • Admin UI: authenticated REST + polling (tree mode)               │
 │   • Client: per-trigger notificationConfig + status SNS topic        │
 │   • EventBridge dispatcher: crash-safe terminal + reconcile RUNNING  │
 └────────────────────────────────────────────────────────────────────┘
```

---

## 5. Pillar A — Progress model

### 5.1 Checkpoints live on the step (no separate list)

Add an optional `checkpoint` to `StepInstance` in `packages/core-types/src/steps/definitions.ts`:

```ts
// StepInstanceSchema additions
checkpoint: z
  .object({
    id: z.string().min(1),       // stable id; UI/clients map id → display/status
    label: z.string().min(1),    // human-readable milestone ("Extracting documents")
    order: z.number().int().min(0).optional(), // optional, for monotonic ordering
  })
  .optional(),
```

**Why on the step and not a flow-level list:** the checkpoint travels with the step. Adding/removing/reordering/cloning steps keeps progress correct automatically — there is no second list to keep in sync. The denominator is **derived** from the flow definition at runtime.

**Derived progress (computed by the orchestrator, see 5.3):**

- `totalCheckpoints` = number of steps in the flow definition whose `checkpoint` is set
  *(or, if `order` is used, `max(order) + 1`).*
- `reachedCheckpointOrder` = highest `order` among checkpoint steps that have completed
  *(or count of distinct completed checkpoint steps when `order` is absent).*
- `percent` = `round(100 * (reachedCheckpointOrder + 1) / totalCheckpoints)`.

**Rules:**
- **Monotonic:** track the *highest* order reached, so loops re-entering an earlier step never move the bar backward.
- **Skipped intermediate checkpoints** (conditional branches) simply jump the bar forward — acceptable and author-controlled (place checkpoints on the common path).
- **Clamp to 100 % on terminal `COMPLETED`** so a path that never hits the highest-ordered checkpoint still completes the bar.

### 5.2 Two-layer progress

| Layer | Denominator | Author effort | When used |
|---|---|---|---|
| **L1 step-count** (default) | `totalSteps` = distinct steps executed vs. count of steps in the definition | none | always available |
| **L2 checkpoint** (opt-in) | `totalCheckpoints` derived from tagged steps | tag a few steps | when the flow declares any `checkpoint` |

Resolution: **if the flow defines ≥1 checkpoint, the UI/clients render L2; otherwise L1.** L1 is honest-but-noisy (a 5 ms step moves it as much as a 5 min step; conditionals/loops make the total approximate). L2 is the readable experience.

### 5.3 Orchestrator stamps the METADATA record

The iterative step processor already carries `FlowRuntimeState` (`currentStepInstanceId`) through the loop. Extend the runtime state with `completedStepCount` and `reachedCheckpoint`, and **stamp the METADATA record at each step boundary** (single `UpdateItem`, one cheap item to poll).

New `AllmaFlowExecutionRecordSchema` fields (in `packages/core-types/src/logging/records.ts`):

```ts
// progress (Pillar A)
currentStepInstanceId: z.string().optional(),
currentStepDisplayName: z.string().optional(),
currentStepType: z.string().optional(),
completedStepCount: z.number().int().optional(),
totalStepCount: z.number().int().optional(),        // count of steps in definition
currentCheckpoint: z
  .object({ id: z.string(), label: z.string(), order: z.number().int().optional() })
  .optional(),
totalCheckpoints: z.number().int().optional(),
progressPercent: z.number().int().min(0).max(100).optional(),
progressUpdatedAt: z.string().datetime({ offset: true }).optional(),
```

**Write cadence & cost:**
- `currentStep*` / `completedStepCount` / `progressPercent`: updated **once per step boundary** inside the iterative processor (it is already writing/transitioning there). This is an `UpdateItem` on the same partition key, no extra read.
- `currentCheckpoint` / `liveStatus` bubble-up (Pillar B): updated **only when a checkpoint step completes** — coarse, low volume.

> **Why stamp the metadata item instead of deriving from STEP records on read?**
> The step logger is async/fire-and-forget and may lag or arrive out of order. Stamping the metadata item from the orchestrator (which is authoritative and synchronous) gives the UI a **single, lag-free item to GET**, avoids scanning step records on every poll, and is what the client bubble-up (Pillar B) needs anyway.

---

## 6. Pillar B — Execution tree across sub-flows & branches

### 6.1 Structured linkage (replace the `triggerSource` string)

When a sub-flow / branch is launched, write structured linkage onto the **child** METADATA record. Set these in `sync-flow-handler.ts` (and branch fan-out in `parallel-handler.ts` / `orchestration.ts`), and persist them in `initialize-flow.ts`:

```ts
// AllmaFlowExecutionRecordSchema additions (linkage)
parentFlowExecutionId: z.string().uuid().optional(),
parentStepInstanceId: z.string().optional(),
rootFlowExecutionId: z.string().uuid().optional(),  // = self for a top-level execution
depth: z.number().int().min(0).optional(),          // 0 = root
executionKind: z.enum(['ROOT', 'SYNC_SUBFLOW', 'ASYNC_SUBFLOW', 'PARALLEL_BRANCH']).optional(),
```

- For a top-level execution: `rootFlowExecutionId = flowExecutionId`, `depth = 0`, `executionKind = ROOT`.
- `triggerSource` remains for backwards compatibility but is no longer the linkage mechanism.

### 6.2 New GSI: query a whole tree in one shot

Add a GSI to `AllmaFlowExecutionLogTable` in `core-cdk/lib/constructs/data-stores.ts`:

```
GSI_ByRoot
  PK = rootFlowExecutionId
  SK = depth#parentStepInstanceId#flowExecutionId   (or startTime)
  Projection: metadata fields (status, progress*, currentCheckpoint, liveStatus, linkage)
```

A single `Query(rootFlowExecutionId = R)` returns every execution node in the tree (parent, sync children, async children, branches), each carrying its own progress.

> **Backfill note:** only executions created after deployment have linkage. Pre-existing executions return a single-node tree. Acceptable.

### 6.3 Each node stamps its own record (normalized)

No cross-writes for the per-node progress: child `C` stamps `C`'s metadata, parent `P` stamps `P`'s. One writer per record, zero contention.

### 6.4 Bubble-up: child pushes a one-line summary to the root

Because the parent is **suspended** during a SYNC sub-flow, the child writes a compact roll-up onto the **root** record so a single GET of the root reflects "what's happening at the deepest active level". This fires **only on checkpoint change** (coarse → low write volume, negligible contention):

```ts
// AllmaFlowExecutionRecordSchema addition (root only)
liveStatus: z
  .object({
    activeExecutionId: z.string().uuid(),
    depth: z.number().int(),
    stepDisplayName: z.string().optional(),
    checkpointId: z.string().optional(),
    checkpointLabel: z.string().optional(),
    percent: z.number().int().min(0).max(100).optional(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .optional(),
```

Mechanics: the child orchestrator knows `rootFlowExecutionId`; on a checkpoint change it issues a conditional `UpdateItem` on the root METADATA item (`PK=rootFlowExecutionId, SK=METADATA`) setting `liveStatus`. Use a `updatedAt`/`depth`-guarded condition so a shallower execution resuming later overwrites the deeper one cleanly. When the parent resumes after the sub-flow returns, it overwrites `liveStatus` with its own.

### 6.5 End-to-end propagation

```
App triggers flow ──► R returned (rootFlowExecutionId = R)
   │
   R runs … step_4 = START_SUB_FLOW (SYNC) ──► launches child C
   │ (R SUSPENDED in SFN .sync — cannot self-update)
   ▼
   C runs; on each checkpoint:
     ├─ UpdateItem C.METADATA   (own progress — for the tree)
     └─ UpdateItem R.METADATA.liveStatus = {deepest summary}  (bubble-up — one-read)
   │
   C COMPLETED ──► R resumes ──► overwrites R.liveStatus with its own checkpoints
```

- **Admin UI** → read-time **tree** via `GSI_ByRoot` (full nested detail).
- **Client** → single GET of `R` (`liveStatus`) or the SNS event stream; never needs to know `C` exists.

**ASYNC sub-flows:** parent does not wait and may complete while the child runs. Linkage + tree still apply, but async children are **not** bubbled into the root's headline `liveStatus` (the root may already be terminal). The UI shows them as independent linked nodes.

---

## 7. Pillar C — Delivery

### 7.1 Admin UI monitoring (authenticated, REST + polling)

**New endpoint — progress roll-up** (add to `ALLMA_ADMIN_API_ROUTES` in `core-types/src/admin/endpoints.ts`, handler in `allma-admin/execution-monitoring.ts`, logic in `execution-monitoring.service.ts`; guarded by `withAdminAuth` + `EXECUTIONS_READ`):

```
GET /v1/allma/flow-executions/{flowExecutionId}/progress?mode=tree|single
```

- `mode=single` (default): `GetItem` on the METADATA record → returns the node's progress + `liveStatus`. Cheap; for compact status widgets.
- `mode=tree`: `Query(GSI_ByRoot = rootFlowExecutionId)` → assembles the nested tree (Pillar B) → returns root + descendants, each with progress.

**Response schema** (`core-types/src/admin/executionMonitoring.ts`):

```ts
export const ExecutionProgressNodeSchema = z.object({
  flowExecutionId: z.string().uuid(),
  flowDefinitionId: z.string(),
  flowDefinitionVersion: z.number().int().optional(),
  executionKind: z.enum(['ROOT','SYNC_SUBFLOW','ASYNC_SUBFLOW','PARALLEL_BRANCH']),
  parentStepInstanceId: z.string().optional(),
  depth: z.number().int(),
  status: z.enum(['INITIALIZING','RUNNING','COMPLETED','FAILED','TIMED_OUT','CANCELLED']),
  isWaiting: z.boolean(),                 // current step is WAIT_FOR_EXTERNAL_EVENT / POLL_EXTERNAL_API
  currentStep: z.object({
    stepInstanceId: z.string().optional(),
    displayName: z.string().optional(),
    stepType: z.string().optional(),
  }).optional(),
  currentCheckpoint: z.object({ id: z.string(), label: z.string(), order: z.number().int().optional() }).optional(),
  completedStepCount: z.number().int().optional(),
  totalStepCount: z.number().int().optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }).optional(),
  children: z.array(z.lazy(() => ExecutionProgressNodeSchema)).default([]),
});

export const ExecutionProgressResponseSchema = z.object({
  root: ExecutionProgressNodeSchema,
  // convenience: deepest active leaf, for a one-line headline
  headline: z.object({
    executionId: z.string().uuid(),
    label: z.string(),                    // checkpoint label or step displayName
    percent: z.number().int().min(0).max(100).optional(),
    status: z.string(),
  }).optional(),
});
```

**React Query hook** (`packages/admin-shell/src/api/executionService.ts`):

```ts
export function useGetExecutionProgress(flowExecutionId?: string, mode: 'tree'|'single' = 'tree') {
  return useQuery({
    queryKey: [EXECUTION_PROGRESS_QUERY_KEY, flowExecutionId, mode],
    queryFn: () => api.get(ROUTES.FLOW_EXECUTION_PROGRESS(flowExecutionId!), { params: { mode } }),
    enabled: !!flowExecutionId,
    // poll ONLY while running; stop on terminal
    refetchInterval: (q) => {
      const s = q.state.data?.root?.status;
      return s && ['COMPLETED','FAILED','TIMED_OUT','CANCELLED'].includes(s) ? false : 3000;
    },
  });
}
```

**UI rendering** (`features/executions/`):
- **Execution list** (`ExecutionListPage`/`FlowExecutionsPreview`): add a compact progress cell (`progressPercent` + `currentCheckpoint.label`), polling in `single` mode while `RUNNING`.
- **Execution detail** (`ExecutionDetailPage`): a header progress bar + a **nested tree** of sub-flow/branch nodes, each with its own bar and current-step line. The existing step accordion stays for full per-step detail.
- **Waiting state:** when `isWaiting` is true, render "Waiting for external input / polling…" instead of an active spinner (these steps can pause for a long time).

**Cost control:** poll the `single`/`progress` item (not the full step list); 3 s while running; stop immediately on terminal status.

### 7.2 Client subscription (e.g. Optiroq) — get status of flows it triggered

A consumer application triggered the flow and holds the **root `flowExecutionId`** (returned by the trigger API/SQS). It must receive status **without** Cognito Admin credentials, and must be told about **crashes**.

Two complementary mechanisms:

#### (a) Per-trigger callback — point-to-point

Extend `StartFlowExecutionInputSchema` (consumed by `flow-start-request-listener.ts` and `allma-admin/flow-trigger.ts`) with an **optional** `notificationConfig`:

```ts
export const NotificationConfigSchema = z.object({
  // at least one sink
  webhookUrl: z.string().url().optional(),
  snsTopicArn: z.string().startsWith('arn:aws:sns:').optional(),
  sqsUrl: z.string().url().optional(),
  // what to send
  events: z.array(z.enum(['STARTED','CHECKPOINT','TERMINAL'])).default(['TERMINAL']),
  // echoed back so the caller can correlate
  correlationKey: z.string().optional(),
  // webhook signing (HMAC-SHA256 over the raw body)
  signingSecretArn: z.string().optional(), // Secrets Manager ARN; platform never stores raw secrets
}).optional();
```

This is persisted onto the root METADATA record at `initialize-flow`. The caller decides **where** to be notified, **per execution** — exactly what a consumer app needs, instead of baking sinks into every flow definition.

#### (b) Status SNS topic — pub/sub broadcast

Provision a dedicated **execution status topic** (`AllmaExecutionStatusTopic-${stage}`) in `core-cdk`, exported as a stack output (alongside the existing `ALLMA_FLOW_OUTPUT_SNS_TOPIC_ARN`). Every lifecycle event is published with **message attributes** so subscribers filter server-side:

```
MessageAttributes:
  flowDefinitionId : <id>
  rootFlowExecutionId : <R>
  eventType : STARTED | CHECKPOINT | TERMINAL
  status : RUNNING | COMPLETED | FAILED | TIMED_OUT | CANCELLED
```

A consumer subscribes its own SQS queue/HTTPS endpoint with a **subscription filter policy** (e.g. by `flowDefinitionId`, or by a set of `rootFlowExecutionId`s) and reconstructs live status from the stream. Cross-account subscribe is granted via topic policy.

#### Event payload (shared by webhook + SNS)

```jsonc
{
  "schemaVersion": "1.0",
  "eventType": "CHECKPOINT",             // STARTED | CHECKPOINT | TERMINAL
  "rootFlowExecutionId": "R-uuid",
  "flowExecutionId": "C-uuid",           // node that produced the event (may == root)
  "flowDefinitionId": "invoice-flow",
  "flowDefinitionVersion": 7,
  "status": "RUNNING",                   // node status
  "depth": 1,
  "checkpoint": { "id": "extract", "label": "Extracting documents", "order": 2 },
  "progressPercent": 66,
  "headline": { "label": "Extracting documents", "percent": 66 },
  "correlationKey": "optiroq:job:1234",
  "errorInfo": null,                     // populated on TERMINAL FAILED/TIMED_OUT
  "occurredAt": "2026-06-26T10:15:30.123Z"
}
```

> **Idempotency & ordering:** delivery is at-least-once and **not ordered**. Every event is self-describing (carries `status` + `occurredAt` + `progressPercent`). Consumers must **dedupe** on (`flowExecutionId`,`eventType`,`occurredAt`) and treat a higher `occurredAt` as newer. Do not assume `STARTED` arrives before `CHECKPOINT`.

#### Where events are emitted

- `STARTED` / `CHECKPOINT`: from the orchestrator at the same point it stamps progress (publish to the status topic; if `notificationConfig` is present, also dispatch to its sinks). Keep this on the **checkpoint** cadence to bound volume.
- `TERMINAL`: see §7.3 — emitted by the **EventBridge dispatcher**, not by `finalize-flow`, so it survives crashes.

### 7.3 Crash-safe terminal status + reconciler (EventBridge dispatcher)

Promote the existing EventBridge rule (`core-cdk/lib/constructs/monitoring.ts`) from "email an alert" to the **authoritative terminal pipeline**. Add a new Lambda `execution-lifecycle-dispatcher` subscribed to **SFN Execution Status Change** events for the orchestrator + polling state machines, on `SUCCEEDED | FAILED | TIMED_OUT | ABORTED`.

Because **SFN execution name = `flowExecutionId`**, the event's `executionArn` yields the id directly. The dispatcher:

1. **Reconcile** — `GetItem` the METADATA record. If still `RUNNING`/`INITIALIZING`, write the real terminal status + `errorInfo`. *This fixes "zombie RUNNING" executions left by hard crashes.*
2. **Notify the caller** — read `notificationConfig` from the (root) record; dispatch a `TERMINAL` event to its sinks (signed webhook / SNS / SQS), with retry + DLQ.
3. **Broadcast** — publish the `TERMINAL` event to `AllmaExecutionStatusTopic`.
4. (Future) push to the Admin WebSocket.

```
SFN status change (SUCCEEDED|FAILED|TIMED_OUT|ABORTED)
        │  detail.executionArn → flowExecutionId
        ▼
 execution-lifecycle-dispatcher (Lambda)
        ├─ reconcile DynamoDB METADATA if not already terminal   (crash repair)
        ├─ read notificationConfig → deliver TERMINAL to caller   (webhook/SNS/SQS + DLQ)
        └─ publish TERMINAL to AllmaExecutionStatusTopic          (pub/sub)
```

> **Why not `onCompletionActions`/`finalize-flow` alone:** they are skipped on a hard crash. `onCompletionActions` remains supported for **in-flow declarative actions**, but it is **not** the crash-safe path. The dispatcher is.

**Dedup vs. finalize:** on a graceful finish, both `finalize-flow` (writes terminal status) and the dispatcher (reconcile) run. The reconciler's "only if not already terminal" condition makes it a no-op write in that case; terminal **notifications** are emitted **only** by the dispatcher to guarantee exactly the crash path is covered and to avoid double-send.

---

## 8. Data model changes (summary)

### `packages/core-types`
- `steps/definitions.ts`: `StepInstance.checkpoint?: { id, label, order? }`.
- `logging/records.ts` `AllmaFlowExecutionRecordSchema`: progress fields (§5.3), linkage fields (§6.1), `liveStatus` (§6.4), `notificationConfig` (§7.2a).
- `runtime/core.ts` `FlowRuntimeStateSchema`: `completedStepCount`, `reachedCheckpoint`, `rootFlowExecutionId`, `parentFlowExecutionId`, `parentStepInstanceId`, `depth`.
- inputs: `StartFlowExecutionInputSchema.notificationConfig?` (§7.2a).
- `admin/endpoints.ts`: `FLOW_EXECUTION_PROGRESS(id)` route.
- `admin/executionMonitoring.ts`: `ExecutionProgressNode/Response` schemas.
- New shared event schema: `notifications/execution-events.ts` (the §7.2 payload).

### `packages/core-cdk`
- `data-stores.ts`: add `GSI_ByRoot` to `AllmaFlowExecutionLogTable`.
- new construct `notifications.ts`: `AllmaExecutionStatusTopic-${stage}` (+ stack output), `execution-lifecycle-dispatcher` Lambda, DLQ.
- `monitoring.ts`: point the SFN-status EventBridge rule at the dispatcher (keep the alerts target).
- IAM: dispatcher gets `dynamodb:GetItem/UpdateItem` on the log table, `sns:Publish` on the status topic, `sqs:SendMessage`/HTTPS egress for webhooks, `secretsmanager:GetSecretValue` for signing secrets.

### `packages/app-logic`
- `initialize-flow.ts`: persist linkage + `notificationConfig`; init progress fields.
- `iterative-step-processor/index.ts` + `step-executor.ts`: maintain `completedStepCount`/`reachedCheckpoint`; stamp METADATA progress each step boundary; on checkpoint change emit `STARTED`/`CHECKPOINT` events + bubble `liveStatus` to root.
- `sync-flow-handler.ts` + `parallel-handler.ts`: pass `parent*`/`root*`/`depth`/`executionKind` into child start input.
- new `execution-lifecycle-dispatcher.ts` (§7.3).
- `allma-admin/execution-monitoring.ts` + `services/execution-monitoring.service.ts`: `/progress` endpoint (single + tree).

### `packages/admin-shell`
- `api/executionService.ts`: `useGetExecutionProgress` (polling while running).
- `features/executions/`: progress cell in lists; header bar + nested sub-flow tree in detail; waiting-state rendering.

### `packages/core-sdk` (optional)
- helper for HMAC webhook signing + a small client-side `verifySignature` example for consumers.

---

## 9. Implementation plan (phased)

**Phase 1 — Single-execution progress (UI).** *No new infra.*
1. `StepInstance.checkpoint` schema.
2. Runtime-state + METADATA progress fields; orchestrator stamping (L1 + L2).
3. `/progress?mode=single` endpoint + `useGetExecutionProgress` + UI progress cell/bar.
4. Waiting-state detection (`WAIT_FOR_EXTERNAL_EVENT` / `POLL_EXTERNAL_API`).

**Phase 2 — Execution tree (sub-flows).**
5. Linkage fields + `GSI_ByRoot`.
6. Stamp linkage in `sync-flow-handler`/branch fan-out + `initialize-flow`.
7. Child bubble-up of `liveStatus` to root.
8. `/progress?mode=tree` + nested UI tree.

**Phase 3 — Client notifications (crash-safe).** *Highest correctness value.*
9. `AllmaExecutionStatusTopic` + `execution-lifecycle-dispatcher` + DLQ.
10. EventBridge rule → dispatcher; **reconcile** zombie RUNNING.
11. `notificationConfig` on trigger input; signed webhook / SNS / SQS delivery.
12. `STARTED`/`CHECKPOINT` event emission from the orchestrator.
13. Consumer docs (subscribe + verify signature) under `docs.allma.dev/docs/reference/`.

**Phase 4 (optional) — WebSocket push** reusing the §7.1 payload, if 3 s polling proves insufficient.

> Phase 3's reconciler + terminal notification is independently valuable: it closes a real correctness gap (silent crashes never notify; executions stuck at RUNNING). Consider shipping it even before Phase 2.

---

## 10. Backward compatibility, versioning, security

- **All new fields optional.** Flows adopting nothing keep working (L1 progress, single-node tree, no notifications). New exported schema fields/endpoints/topic = **minor** changeset bumps per affected `@allma/*` package; no breaking changes → **not** major. (Follow `AGENTS.md` Changesets rules; never select major.)
- **Auth:** the Admin `/progress` endpoint stays behind `withAdminAuth` + `EXECUTIONS_READ`. Consumers never use Admin auth — they receive events via their own SNS/SQS/HTTPS sink or a topic subscription. No public unauthenticated read endpoint is introduced.
- **Webhook security:** HMAC-SHA256 signature header over the raw body; secret stored in the **consumer's** Secrets Manager and referenced by ARN — the platform reads it at send time, never persists raw secrets. Include `occurredAt` to bound replay.
- **Least privilege:** dispatcher IAM scoped to the specific table/topic/queues; cross-account topic subscribe via explicit topic policy.
- **Docs:** product-agnostic only (generic `examples/basic-deployment`); update `docs.allma.dev/docs/reference/` for the new endpoint, the trigger `notificationConfig`, and the status topic. Validate with `npm run build --prefix docs.allma.dev`.

---

## 11. Open questions

1. **Checkpoint authoring UX** in the Flow Editor — mark a step as a checkpoint + set `label`/`order`. (Drives whether `order` is required or auto-assigned by graph order.)
2. **Async sub-flow headline semantics** — show the most-recently-active async child as the root headline, or only sync descendants? (Default: sync only.)
3. **Event volume** for very chatty flows — is checkpoint-cadence enough, or do we also want a coalescing window in the dispatcher?
4. **Retention** — `liveStatus`/progress fields share the record TTL; confirm that matches the desired post-mortem window.
5. **Polling interval** — 3 s default; expose as Admin setting?

---

## 12. Mental model (one paragraph)

Each execution stamps its **own** metadata item with current step + checkpoint percentage. A flow author marks a few steps as **checkpoints** (`{id,label,order}` on the step) so the bar tracks meaningful milestones, and the denominator is derived from the definition — no list to maintain. Because a sync sub-flow **suspends** its parent, the child both records its own progress and **pushes a one-line `liveStatus` up to the root**; the full nested picture is assembled **on read** from a single `GSI_ByRoot` query. The Admin UI polls a `/progress` endpoint (tree mode) while a flow runs. The triggering client gets status **without Admin auth** through a per-trigger `notificationConfig` and/or an execution-status SNS topic, and terminal status — **including crashes** — is guaranteed by an **EventBridge dispatcher** that reconciles the record and notifies, independent of graceful finalize.
