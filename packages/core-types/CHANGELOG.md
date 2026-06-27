# @allma/core-types

## 1.5.0

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

## 1.4.0

### Minor Changes

- a7b39cd: `LLM_INVOCATION` model selection now supports Handlebars templating. The `llmProvider`, `modelId`,
  and every `fallbacks[]` entry are rendered against the flow context at runtime (the same context as
  `templateContextMappings`), so flows can centralize/parameterize model choice, e.g.
  `"modelId": "{{config.llmModels.bedrockSonnet}}"`. Plain values without `{{ }}` are unchanged, so
  existing flows are unaffected. Resolved values are validated after rendering: an empty `modelId` or
  an `llmProvider` that does not resolve to a valid provider fails the step with a clear error.

## 1.3.0

### Minor Changes

- 9f5cdad: Add per-step execution statistics. A new Admin Panel **Statistics** view and
  `GET /allma/dashboard/step-stats` admin API report step counts, failures, average duration, and
  LLM token usage broken down by step type, by flow, and over time (per-hour / per-day) for the last
  24 hours and 7 days. Step-execution log records now carry `flowDefinitionId`, `flowDefinitionVersion`
  and (for LLM steps) `inputTokens` / `outputTokens`, and a new `GSI_StepStats_ByTime` index backs the
  on-read aggregation.

## 1.2.0

### Minor Changes

- ac065ee: feat(llm): support image & PDF attachments on `LLM_INVOCATION` steps. Add the resolved media contract (`LlmMediaKind`, `LlmMediaContent`, `media` on `LlmGenerationRequest`) plus supported-MIME constants, and extend the step schema with `mediaAttachments` (static list of S3-pointer / URL / inline-base64 sources) and `mediaAttachmentsPath` (dynamic JSONPath). Media is resolved to base64 at runtime and wired through to the multimodal Gemini and Bedrock Anthropic adapters.

## 1.1.3

### Patch Changes

- 0ce23e0: Integration tests fixes, build fixes

## 1.1.2

### Patch Changes

- 1951c6d: Concurency and logging improvements
- cd2218e: fix: parallel step logging and display improvements
- 9e3d6ee: Context hydration fixes, S3 preview tool
- 6ee1569: Parallel batch processing and input/output of step improvements
- 6ee1569: Sub-Flow execution fixes

## 1.1.1

### Patch Changes

- 4d6f2f4: Email send attachments improvements and cc, bcc added
- 4706c67: Email send has CC and fromName parameters now

## 1.1.0

### Minor Changes

- 96b1d0c: Agents feature is added

### Patch Changes

- af39aab: Small changes across the system to improve stability

## 1.0.17

### Patch Changes

- 131aa94: Small fixes here and there

## 1.0.16

### Patch Changes

- e4301e0: Flow variables functionality has been added
- 7b7f11e: Join data step added to Allma

## 1.0.15

### Patch Changes

- 2e86990: Step creation on UI fixed (no StepDefinition for system steps)

## 1.0.14

### Patch Changes

- 97ea67a: Send email with attachments implemented
- 6f103d7: CDK deployment imports improvements
- 23b6fb6: List files on S3 step added

## 1.0.13

### Patch Changes

- e233841: LLM retry fix, currentItem in PARALLEL fork clean fix

## 1.0.12

### Patch Changes

- 67664df: ExpressionAttributeNames added to DDB steps

## 1.0.11

### Patch Changes

- d643b0c: Orchestrator concurrency added

## 1.0.10

### Patch Changes

- 198a0ee: File download step has been added

## 1.0.9

### Patch Changes

- 664bf52: Email ingress attachment support is added

## 1.0.8

### Patch Changes

- bba0e3e: UI and data templation fixes

## 1.0.7

### Patch Changes

- e0891b0: Dependencies fix. Minor UI and types fixes

## 1.0.6

### Patch Changes

- af014ee: Packages configurations fix for NPM

## 1.0.5

### Patch Changes

- 389235b: Core error reporting improve. Admin UI MCP paths fix

## 1.0.4

### Patch Changes

- 33b6f11: Dependencies and paths updated to fix deployment issues

## 1.0.3

### Patch Changes

- 921cdc7: packages configuration fixed for public use

## 1.0.2

### Patch Changes

- ca55090: Schedule and MCP steps are added. Minor fixes of other parts of the system.

## 1.0.1

### Patch Changes

- 4659536: Initial change
