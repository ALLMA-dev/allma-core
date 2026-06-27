# @allma/core-cdk

## 1.3.0

### Minor Changes

- f4b1483: Add optional support for calling Gemini through **Vertex AI** instead of the
  key-based Gemini Developer API, to escape the low rate limits of API-key access.

  The `LLM_INVOCATION` Gemini adapter now constructs a Vertex AI client when
  `gemini.useVertex` is set in the stage config (new `gemini` block:
  `useVertex`, `gcpProjectId`, `gcpLocation`, optional `serviceAccountKeySecretArn`).
  Authentication uses a GCP service-account key from Secrets Manager when provided,
  otherwise Application Default Credentials / Workload Identity Federation. The CDK
  construct injects the new env vars (`GEMINI_USE_VERTEX`, `GCP_PROJECT_ID`,
  `GCP_LOCATION`, `GCP_SA_KEY_SECRET_ARN`) onto the iterative step processor and
  grants read access to the service-account key secret when configured.

  Fully backward-compatible and feature-flagged: with `useVertex` unset (the
  default), Gemini keeps using the existing API key from `aiApiKeySecretArn`.

### Patch Changes

- 009f92a: feat(executions): crash-safe client notifications & execution status events (phase 3)

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

- be5a333: feat(executions): live execution progress (current step, checkpoints, % complete)

  Phase 1 of real-time execution status. Adds a read-time progress view for a single flow
  execution and an optional per-step **checkpoint** so flows can report meaningful milestones
  instead of every micro-step.

  - `core-types`: optional `checkpoint` (`{ id, label, order? }`) on `StepInstance`; new
    `FLOW_EXECUTION_PROGRESS` admin route; new `ExecutionProgressResponse` / `ExecutionProgressNode`
    schemas.
  - `core-cdk` (bundles `allma-app-logic`): new `GET /flow-executions/{id}/progress` endpoint that
    computes current step, stage (checkpoint), completed/total steps, a percentage, and a
    waiting-state flag from the execution's step records + flow definition. No new IAM/env — the
    existing execution-monitoring Lambda already reads the config table.
  - `admin-shell`: `useGetExecutionProgress` hook (polls while running, stops on terminal status)
    and an `ExecutionProgressBar` on the execution detail page.

  Backward-compatible: all additions are optional; flows that declare no checkpoints get a
  step-count progress bar. Progress is derived from step records, so it requires execution logging
  to be enabled for the flow. Orchestrator stamping, the sub-flow/branch tree, and client
  notifications follow in later phases.

- ce1e482: feat(executions): execution tree across sub-flows & lag-free progress stamping (phase 2)

  Builds on the Phase 1 single-execution progress view (Pillars B and the authoritative half of A
  from the real-time execution status design).

  - **Orchestrator stamping (Pillar A).** The iterative step processor now stamps the execution's
    `METADATA` record at each step boundary with the current step, completed/total step counts, the
    reached checkpoint, and a percentage — giving the UI/clients a single, lag-free item to poll. A
    new `UPDATE_PROGRESS` logger action performs a guarded, monotonic `UpdateItem`. The Phase 1
    read-time derivation remains as a fallback for executions stamped before this change.
  - **Structured execution-tree linkage (Pillar B).** Sub-flows now record `parentFlowExecutionId`,
    `parentStepInstanceId`, `rootFlowExecutionId`, `depth`, and `executionKind` on their own metadata
    record (sync and async sub-flows; a top-level execution is `ROOT`/depth 0). A new
    `GSI_ByRoot` index returns a whole tree in one query.
  - **Bubble-up roll-up.** On a checkpoint change a sync sub-flow writes a one-line `liveStatus` onto
    the root record so a single GET of the root reflects the deepest active work even while the parent
    is suspended. Async sub-flows are linked but not bubbled into the root headline.
  - **Tree read API.** `GET /flow-executions/{id}/progress?mode=tree|single` — `single` (stamped
    preferred) returns one node; `tree` assembles the nested sub-flow tree with a headline pointing
    at the deepest active leaf.
  - **Admin UI.** The execution progress bar renders the nested sub-flow tree, each node with its own
    bar, current-step line, and waiting state.

  All new fields are optional and backward-compatible: flows adopting nothing keep working, and
  pre-existing executions return a single-node tree. In-memory parallel branches share the parent's
  `flowExecutionId` and remain surfaced via the existing branch-steps view rather than as tree nodes.

- Updated dependencies [f4b1483]
- Updated dependencies [009f92a]
- Updated dependencies [be5a333]
- Updated dependencies [ce1e482]
  - @allma/core-types@1.5.0

## 1.2.0

### Minor Changes

- 9f5cdad: Add per-step execution statistics. A new Admin Panel **Statistics** view and
  `GET /allma/dashboard/step-stats` admin API report step counts, failures, average duration, and
  LLM token usage broken down by step type, by flow, and over time (per-hour / per-day) for the last
  24 hours and 7 days. Step-execution log records now carry `flowDefinitionId`, `flowDefinitionVersion`
  and (for LLM steps) `inputTokens` / `outputTokens`, and a new `GSI_StepStats_ByTime` index backs the
  on-read aggregation.

### Patch Changes

- Updated dependencies [9f5cdad]
  - @allma/core-types@1.3.0

## 1.1.8

### Patch Changes

- 0ce23e0: Integration tests fixes, build fixes
- Updated dependencies [0ce23e0]
  - @allma/core-sdk@1.0.11
  - @allma/core-types@1.1.3

## 1.1.7

### Patch Changes

- bc48608: Steps Output and aggregation of branches fixes
- f93581f: Monitoring is added

## 1.1.6

### Patch Changes

- 1951c6d: Concurency and logging improvements
- cd2218e: fix: parallel step logging and display improvements
- 9e3d6ee: Context hydration fixes, S3 preview tool
- 6ee1569: Parallel batch processing and input/output of step improvements
- 4c8ae3f: fix: S3 extraction fix for system calls
- 6ee1569: Sub-Flow execution fixes
- 11a6b2a: Email functionality impromenets, flow validation fixes
- Updated dependencies [1951c6d]
- Updated dependencies [cd2218e]
- Updated dependencies [9e3d6ee]
- Updated dependencies [6ee1569]
- Updated dependencies [4c8ae3f]
- Updated dependencies [6ee1569]
  - @allma/core-types@1.1.2
  - @allma/core-sdk@1.0.10

## 1.1.5

### Patch Changes

- 4d6f2f4: Email send attachments improvements and cc, bcc added
- 4706c67: Email send has CC and fromName parameters now
- Updated dependencies [4d6f2f4]
- Updated dependencies [4706c67]
  - @allma/core-types@1.1.1
  - @allma/core-sdk@1.0.9

## 1.1.4

### Patch Changes

- f12a105: Context of branch execution fixed

## 1.1.3

### Patch Changes

- 16bfcf9: Parallel branch execution fixed (S3)

## 1.1.2

### Patch Changes

- 9e6b2ad: Branches execution from S3 fix

## 1.1.1

### Patch Changes

- ff8e0f2: Minor fixes

## 1.1.0

### Minor Changes

- 96b1d0c: Agents feature is added

### Patch Changes

- af39aab: Small changes across the system to improve stability
- Updated dependencies [96b1d0c]
- Updated dependencies [af39aab]
  - @allma/core-types@1.1.0

## 1.0.33

### Patch Changes

- 62f37d3: Email trigger manager improved to notify on conflicting email

## 1.0.32

### Patch Changes

- 70e7b0c: Flow cloning fixed (flowVariables copied now)

## 1.0.31

### Patch Changes

- 86b36ab: binary files processing fix

## 1.0.30

### Patch Changes

- 690adc2: Templating fixes
- Updated dependencies [690adc2]
  - @allma/core-sdk@1.0.7

## 1.0.29

### Patch Changes

- e9b272a: Fix CDK deployment for prod
- 131aa94: Small fixes here and there
- 7e155b6: fix: update execution logic to offload big payloads to S3
- Updated dependencies [131aa94]
- Updated dependencies [7e155b6]
  - @allma/core-types@1.0.17
  - @allma/core-sdk@1.0.6

## 1.0.28

### Patch Changes

- 7dd4f00: Fixes in Importer, UI, schedule service

## 1.0.27

### Patch Changes

- e4301e0: Flow variables functionality has been added
- 7b7f11e: Join data step added to Allma
- Updated dependencies [e4301e0]
- Updated dependencies [7b7f11e]
  - @allma/core-types@1.0.16

## 1.0.26

### Patch Changes

- 2e86990: Step creation on UI fixed (no StepDefinition for system steps)
- Updated dependencies [2e86990]
  - @allma/core-types@1.0.15

## 1.0.25

### Patch Changes

- f8c4d05: Send email output contains rendered values now
- 97ea67a: Send email with attachments implemented
- 6f103d7: CDK deployment imports improvements
- 23b6fb6: List files on S3 step added
- Updated dependencies [97ea67a]
- Updated dependencies [6f103d7]
- Updated dependencies [23b6fb6]
  - @allma/core-types@1.0.14

## 1.0.24

### Patch Changes

- a2f6fed: Import via CDK permissions fix

## 1.0.23

### Patch Changes

- a0f0d9b: Conditions util improvement. Step execution error handling updated

## 1.0.22

### Patch Changes

- e233841: LLM retry fix, currentItem in PARALLEL fork clean fix
- Updated dependencies [e233841]
  - @allma/core-types@1.0.13

## 1.0.21

### Patch Changes

- 67664df: ExpressionAttributeNames added to DDB steps
- Updated dependencies [67664df]
  - @allma/core-types@1.0.12

## 1.0.20

### Patch Changes

- e2bb9b1: Email ingress more sender fields
- d643b0c: Orchestrator concurrency added
- Updated dependencies [d643b0c]
  - @allma/core-types@1.0.11

## 1.0.19

### Patch Changes

- 77d9180: S3 resolver improvements
- Updated dependencies [77d9180]
  - @allma/core-sdk@1.0.5

## 1.0.18

### Patch Changes

- 198a0ee: File download step has been added
- Updated dependencies [198a0ee]
  - @allma/core-types@1.0.10

## 1.0.17

### Patch Changes

- 664bf52: Email ingress attachment support is added
- Updated dependencies [664bf52]
  - @allma/core-types@1.0.9
  - @allma/core-sdk@1.0.4

## 1.0.16

### Patch Changes

- 60e46cc: Admin UI start step fix. Admin API custom domain setup fix

## 1.0.15

### Patch Changes

- 65b1d0e: Email parsing fixed

## 1.0.14

### Patch Changes

- bba0e3e: UI and data templation fixes
- Updated dependencies [bba0e3e]
  - @allma/core-types@1.0.8

## 1.0.13

### Patch Changes

- e0891b0: Dependencies fix. Minor UI and types fixes
- dab7d32: CDK updated to expose Orchestrator ARN
- Updated dependencies [e0891b0]
  - @allma/core-types@1.0.7

## 1.0.12

### Patch Changes

- 950a3ba: Dependencies fix

## 1.0.11

### Patch Changes

- 5ebad0f: Dependencies fixes

## 1.0.10

### Patch Changes

- acc7a27: Remote build fix. Minor fixes

## 1.0.9

### Patch Changes

- af014ee: Packages configurations fix for NPM
- Updated dependencies [af014ee]
  - @allma/core-types@1.0.6

## 1.0.8

### Patch Changes

- e753c0e: Lambdas deploy fix. Flows import with CDK update

## 1.0.7

### Patch Changes

- 63fc2b8: paths fix in CDK

## 1.0.6

### Patch Changes

- 10aeb8e: tsconfig fixes

## 1.0.5

### Patch Changes

- 33b6f11: Dependencies and paths updated to fix deployment issues
- Updated dependencies [33b6f11]
  - @allma/core-types@1.0.4

## 1.0.4

### Patch Changes

- 52ae1c2: code-logic build fix for CDK

## 1.0.3

### Patch Changes

- 921cdc7: packages configuration fixed for public use
- Updated dependencies [921cdc7]
  - @allma/core-types@1.0.3

## 1.0.2

### Patch Changes

- ca55090: Schedule and MCP steps are added. Minor fixes of other parts of the system.
- Updated dependencies [ca55090]
  - @allma/core-types@1.0.2

## 1.0.1

### Patch Changes

- 4659536: Initial change
- Updated dependencies [4659536]
  - @allma/core-types@1.0.1
