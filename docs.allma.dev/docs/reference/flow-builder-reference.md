---
title: Flow Builder Reference
sidebar_position: 2
---

# Flow Builder Reference

`@allma/flow-builder` is a **build-time** tool for authoring Allma artifacts in
TypeScript. It introduces no new runtime, orchestrator, or storage schema — it
emits the existing `AllmaExportFormat` JSON (see the
[Flow Definition Reference](./flow-definition-reference.md)). This page is the
exhaustive reference for its API and CLI. For a task-oriented walkthrough, see
[Authoring Flows in Code](../how-to-guides/authoring-flows-in-code.md).

## `defineFlow(options)`

Returns a fluent **`FlowBuilder`**. Two-phase: declare, then wire.

| Option | Type | Notes |
| --- | --- | --- |
| `id` | `string` | The `flowDefinitionId`. Required. |
| `name` | `string` | Optional display name. |
| `description` | `string \| null` | Optional. |
| `version` | `number` | Target version slot for the importer. Defaults to `1`. |
| `enableExecutionLogs` | `boolean` | Per-step execution logs. |
| `variables` | `Record<string, unknown>` | Becomes `flowVariables` — the only place deploy placeholders render. |
| `defaultStepConfig` | object | Flow-wide default inference params / customConfig / error handler. |
| `onCompletionActions` | `OnCompletionAction[]` | Actions to run on completion. |

```ts
const flow = defineFlow({ id: 'my-flow' });
const s = flow.steps({ /* … */ });   // Phase 1 — returns a typed record of refs
// Phase 2 — wire with refs
flow.start(s.first);
flow.build();                        // strict gate → FlowAuthoringFormat
flow.toExport();                     // → AllmaExportFormat envelope
```

A `FlowBuilder` also carries a readonly `id` and `kind: 'flow'`, so it is itself a
typed `FlowRef` usable in `startSubFlow`/`startFlowExecution`.

### Step refs (wiring)

Each ref returned by `flow.steps({...})` exposes:

| Method | Purpose |
| --- | --- |
| `.next(ref, { maxTransitions? })` | Default (unconditional) transition. |
| `.when(condition, ref, { maxTransitions? })` | Conditional transition (JSONPath condition). |
| `.onError({ retries?, retryOnContentError?, fallback?, continueOnFailure? })` | Error policy; `fallback` is a typed ref. |

Config setters available on every step (before or during wiring): `.displayName`,
`.inputs`, `.outputs`, `.delay`, `.checkpoint`, `.position`, `.fromDefinition`,
`.defaultNextMaxTransitions`, `.disableS3Offload`, `.forceS3Offload`, `.literals`.

## Step factories

- **17 typed-payload factories**, one per non-module step type — config typed from
  each step's own leaf schema: `llmInvocation`, `apiCall`, `mcpCall`,
  `customLambdaInvoke`, `parallelForkManager`, `startSubFlow`, `startFlowExecution`,
  `noOp`, `endFlow`, `waitForExternalEvent`, `pollExternalApi`, `sqsSend`,
  `snsPublish`, `emailSend`, `emailStartPoint`, `scheduleStartPoint`, `fileDownload`.
- **16 typed module wrappers**, one per registered system module — config typed
  from `SYSTEM_MODULE_CONFIG_SCHEMAS`: `s3DataLoad`, `dynamoDataLoad`,
  `ddbQueryToS3Manifest`, `s3ListFiles`, `sqsGetQueueAttributes`,
  `sqsReceiveMessages`, `s3DataSave`, `dynamoUpdateItem`, `dynamoQueryAndUpdate`,
  `arrayAggregator`, `composeObjectFromInput`, `dateTimeCalculator`, `flattenArray`,
  `generateArray`, `joinData`, `generateUuid`.
- **4 generic escape hatches** for any other module: `dataLoad`, `dataSave`,
  `dataTransform`, `customLogic` — `{ moduleIdentifier, customConfig }`.

## Config-as-code artifacts

Each returns a typed **handle** (`{ id, kind, build(), toExport() }`) that doubles
as a cross-artifact reference.

| Function | Authors | Reference field it satisfies |
| --- | --- | --- |
| `definePrompt(spec)` | a prompt template | `promptTemplateId` (`PromptRef`) |
| `defineStep(meta, draft)` | a reusable step definition | `stepDefinitionId` via `.fromDefinition(handle)` (`StepDefRef`) |
| `defineMcpConnection(spec)` | an MCP connection | `mcpConnectionId` (`McpConnectionRef`) |
| `defineFlow(options)` | a flow | `subFlowDefinitionId` / `flowDefinitionId` (`FlowRef`) |

```ts
const prompt = definePrompt({ id: 'p', name: 'P', content: 'Summarize {{document}}' });
llmInvocation({ llmProvider: 'AWS_BEDROCK', modelId, promptTemplateId: prompt });
```

The builder normalizes a handle to its string `id` in the emitted artifact, so the
wire contract is unchanged. `external('id')` keeps a bare string for an
intentional out-of-dir reference.

:::note Authoring-time timestamps
Prompts, step definitions, and MCP connections emit the fixed placeholder
`createdAt`/`updatedAt` of `1970-01-01T00:00:00.000Z`. This keeps the committed
artifact byte-stable while satisfying the deploy validator (which requires the
field). The server overwrites it on import.
:::

## The build gate

`build()` runs, in order: a deploy-token placement scan; a `.strict()` clone of
each step's leaf schema (catching unknown keys the persisted `.passthrough()`
schemas allow); `customConfig` validation via `SYSTEM_MODULE_CONFIG_SCHEMAS`; and
the shared `FlowAuthoringSchema` (cross-references + JSONPath well-formedness).
Failures aggregate into a single `FlowBuildError` (flows) or `ArtifactBuildError`
(prompts/steps/MCP), each issue prefixed with the offending id and field path.

## `jp` and `flowContext`

`jp('$.path')` validates a JSONPath eagerly and returns it for use in
`inputs`/`outputs` and conditions. Its comparison builders emit transition
conditions in the runtime evaluator's grammar: `jp.eq`, `jp.ne`, `jp.gt`,
`jp.gte`, `jp.lt`, `jp.lte`.

`flowContext<Ctx>()` returns a `jp`-shaped helper whose path argument is
constrained to the dotted key paths of `Ctx` (bounded to depth 3) — an **opt-in**
typed-context check. Default `jp`/`inputs`/`outputs` remain plain `string`.

## Cross-artifact resolution

`resolveReferences(flows, known)` (and `allma-flows check`) verify every
`subFlowDefinitionId` / `flowDefinitionId` / `promptTemplateId` /
`stepDefinitionId` / `mcpConnectionId` resolves to a known artifact or is wrapped
in `external(id)`. Artifacts built together seed the catalog automatically.

## CLI: `allma-flows`

| Command | Purpose |
| --- | --- |
| `build "<glob>" --out <dir> [--exported-at <iso>]` | Compile TS → deterministic `*.<kind>.json`. |
| `check "<glob>" [--out <dir>] [--known <glob>] [--remote <baseUrl>]` | Validate; fail on drift vs committed JSON (`--out`) or vs the deployed copy (`--remote`). |
| `eject <flowId> --from "<glob>" [--out <dir>]` | JSON → `*.flow.ts` (adoption / one-way ownership transfer). |
| `deploy "<glob>" --remote <baseUrl> [--publish] [--overwrite false]` | Promote via the admin import API (no CDK redeploy). |

Modules must `export default` a builder or a `define*` handle. Run under a
TypeScript loader (e.g. `tsx`). Auth for `--remote`/`deploy` is a bearer token in
`ALLMA_ADMIN_TOKEN`.

### Version-slot contract (`deploy`)

`deploy` merges artifacts into one `AllmaExportFormat` and `POST`s it to
`/v1/allma/import` — the same importer `cdk deploy` uses. Therefore: a **new** flow
id is created at its declared version; an **existing** flow id only *updates* a
version slot that already exists. Bumping an existing flow to a not-yet-existing
version requires the admin version-management API first. `--publish` then publishes
each imported flow version. The importer's per-item errors are surfaced, not masked.

## Coexistence & ownership

The builder stamps `authoringSource: 'code'`. Such flows open **read-only** in the
Visual Editor (view + Sandbox only). `eject` adopts a flow into code; the editor's
"Unlock for visual editing" reverts ownership. See
[Authoring Flows in Code](../how-to-guides/authoring-flows-in-code.md#coexistence-with-the-visual-editor).
