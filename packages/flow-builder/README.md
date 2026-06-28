# @allma/flow-builder

Author Allma **flow definitions in TypeScript** — with compile-time type safety,
refactor-safe references, a strict build-time validation gate, and a
deterministic JSON artifact the existing CDK config-importer deploys unchanged.

This is a **build-time tool**. It introduces no new runtime, orchestrator, or
DynamoDB schema; it emits the existing `AllmaExportFormat` JSON. Consume it as a
`devDependency` in an example/consumer app.

```ts
import { defineFlow, s3DataLoad, llmInvocation, s3DataSave, deployVar } from '@allma/flow-builder';

const flow = defineFlow({
  id: 'basic-extract-and-store',
  description: 'Load → summarize → store',
  variables: { outputBucket: deployVar('basic-deployment-output-{{stage}}') },
});

const s = flow.steps({                                   // Phase 1: declare
  load:      s3DataLoad({ sourceS3Uri: 's3://in/doc.txt', outputFormat: 'TEXT' }),
  summarize: llmInvocation({ llmProvider: 'AWS_BEDROCK', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' }),
  store:     s3DataSave({ destinationS3UriTemplate: 's3://{{flow_variables.outputBucket}}/out.json' }),
});

s.load.next(s.summarize);                                // Phase 2: wire (refs, not strings)
s.summarize.next(s.store);
flow.start(s.load);

export default flow;
```

See [`samples/basic-extract-and-store.flow.ts`](./samples/basic-extract-and-store.flow.ts)
for the full worked example (with a fallback step).

## Why two phases

`flow.steps({...})` declares every step first and returns a typed record of
**refs**. Wiring then uses those refs — `.next(ref)`, `.when(condition, ref)`,
`.onError({ fallback: ref })`, `flow.start(ref)`. Because every ref exists before
wiring begins, forward and backward edges (cycles, self-loops) are symmetric and
fully typed — there is **no string-ref escape hatch** to drift out of sync.

## Step factories

- **17 typed-payload factories**, one per non-module step type: `llmInvocation`,
  `apiCall`, `mcpCall`, `customLambdaInvoke`, `parallelForkManager`,
  `startSubFlow`, `startFlowExecution`, `noOp`, `endFlow`,
  `waitForExternalEvent`, `pollExternalApi`, `sqsSend`, `snsPublish`,
  `emailSend`, `emailStartPoint`, `scheduleStartPoint`, `fileDownload`. Each
  factory's config is typed from its **own leaf payload schema**.
- **16 typed module wrappers**, one per registered system module (config typed
  from `SYSTEM_MODULE_CONFIG_SCHEMAS`): `s3DataLoad`, `dynamoDataLoad`,
  `ddbQueryToS3Manifest`, `s3ListFiles`, `sqsGetQueueAttributes`,
  `sqsReceiveMessages`, `s3DataSave`, `dynamoUpdateItem`, `dynamoQueryAndUpdate`,
  `arrayAggregator`, `composeObjectFromInput`, `dateTimeCalculator`,
  `flattenArray`, `generateArray`, `joinData`, `generateUuid`.
- **4 generic escape hatches** for any other (e.g. consumer-defined) module:
  `dataLoad`, `dataSave`, `dataTransform`, `customLogic` — `{ moduleIdentifier,
  customConfig }`, with `customConfig` left opaque.

A completeness test fails CI if a new `StepType` lacks a factory, or a newly
registered module lacks a typed wrapper.

## The build gate

`build()` is strict and runs, in order:

1. **Deploy-token placement scan.** See below.
2. **Strict leaf clones** — each step's payload is parsed against a `.strict()`
   clone of its leaf schema, catching unknown keys that the persisted
   `.passthrough()` schemas silently allow (a *stricter-than-deploy* gate).
3. **`customConfig` via the registry** — module steps with a known
   `moduleIdentifier` have their `customConfig` validated against the centralized
   schema. This is the earliest point any `customConfig` is validated.
4. **Shared `FlowAuthoringSchema`** — cross-references (start / transition /
   default-next / fallback targets exist) and JSONPath well-formedness.

Failures are aggregated and thrown as a single `FlowBuildError`, each issue
prefixed with the offending step id and field path. `toExport()` wraps `build()`
in the `AllmaExportFormat` envelope with a deterministic `exportedAt`.

## Deploy variables vs. runtime templates

Two different `{{...}}` worlds — the builder keeps them straight:

- **Deploy tokens** `{{stage}}`, `{{accountId}}`, `{{region}}` are substituted
  by the CDK importer, and **only inside `flowVariables`**. Declare them with
  `deployVar(...)` (which rejects unknown tokens eagerly) and place them in
  `variables`. The build gate **errors** if one of these three appears anywhere
  else — the importer would not render it and the runtime context has no such
  key, so it would silently render empty.
- **Runtime templates** like `{{flow_variables.x}}`, `{{steps_output.y}}`,
  `{{config.z}}` are rendered by the execution-time Handlebars engine and are
  **allowed in any string field**. (The build gate deliberately does *not* flag
  these — only the three deploy tokens when misplaced.)

## Cross-artifact resolution

`resolveReferences(flows, known)` (and `allma-flows check`) verify that every
`subFlowDefinitionId` / `flowDefinitionId` / `promptTemplateId` /
`stepDefinitionId` resolves to a known artifact, or is wrapped in `external(id)`
to document an intentional out-of-dir reference.

## Ergonomics: `jp()` and `class Flow`

`jp('$.steps_output.x')` validates a JSONPath eagerly (a malformed path throws at
author time) and returns it for use in `inputs`/`outputs` and conditions. Its
comparison builders emit transition conditions in the runtime evaluator's grammar:

```ts
s.poll.when(jp.eq('$.poll.status', 'DONE'), s.done);
s.poll.when(jp.gt('$.poll.attempts', 5), s.giveUp);
```

`class Flow` is an imperative authoring facade over the same internals as
`defineFlow`, for teams preferring OO construction (it produces identical artifacts):

```ts
const flow = new Flow({ id: 'order-intake' });
const load = flow.addStep('load', s3DataLoad({ sourceS3Uri: 's3://in/x' }));
const done = flow.addStep('done', endFlow());
load.next(done);
flow.start(load);
export default flow;
```

## CLI

```
allma-flows build "flows/**/*.flow.ts" --out config/flows              # TS -> deterministic *.flow.json
allma-flows check "flows/**/*.flow.ts" [--out config/flows] [--remote <baseUrl>]
                                                                       # validate + drift checks
allma-flows eject <flowId> --from "config/flows/*.json" [--out flows]  # JSON -> *.flow.ts (adoption)
```

Flow modules must `export default` the builder. Run under a TypeScript loader
(e.g. `tsx`) when pointing at `.flow.ts` sources. Commit the generated JSON and
run `allma-flows check` in CI: the byte-stable artifact makes the diff meaningful
and drift between the `.ts` source and committed `.json` fails the build. With
`--remote <baseUrl>` (and an `ALLMA_ADMIN_TOKEN` bearer token), `check` also fails
if a code-owned flow's **deployed** copy was taken over in the Visual Editor.

## Coexistence with the Visual Editor

Code- and editor-authored flows coexist under an explicit, per-flow ownership
model (RFC §6):

- The builder stamps `authoringSource: 'code'` and emits **no step positions**, so
  the editor's existing Dagre auto-layout arranges code-owned flows on first open.
- `@allma/admin-shell` opens `authoringSource === 'code'` flows **read-only**:
  structural edits and Save are disabled (a "Managed in code" banner explains why),
  while viewing and the single-step Sandbox stay available.
- Ownership transfer is deliberate and one-way: `allma-flows eject` adopts a flow
  **into** code (JSON → TS), and the editor's "Unlock for visual editing" action
  flips ownership **back** to the editor.

## `customConfig` validation (author-time)

The builder hard-enforces each module step's `customConfig` against the centralized
registry schema at **build time** — the earliest point any `customConfig` is
validated. The shared `FlowDefinitionSchema` (the wire/storage contract) keeps the
registry check **advisory** (warn-mode in the importer): a required `customConfig`
field may legitimately be supplied at runtime via `inputMappings`, so a hard error
there would reject valid flows. Author in code to get the strict, earliest check.

## Known limitations

- `customConfig` validation checks shape/type via the registry but does not
  reject unknown `customConfig` keys (the runtime strips them); leaf **payload**
  keys are strict.
- Typed `definePrompt`/`defineStep`/MCP object cross-references, `allma-flows
  deploy`, and typed-context generics for mappings are **Phase 3** (RFC §11).
