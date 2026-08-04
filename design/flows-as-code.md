# Design: Flows as Code — A TypeScript Builder for Allma Flow Definitions

**Status:** Proposal / RFC (revised)
**Scope:** Platform (`packages/*`). Product-agnostic.
**Date:** 2026-06-28

> Revision note: this version corrects several inaccurate validation claims in the first draft,
> promotes the dual-source-of-truth question from an open issue to a first-class design, and adds a
> set of **foundational platform changes** that make the builder inherit validation from the shared
> contract instead of reimplementing it. Claims are grounded in the current code; file references are
> given inline.

---

## 1. Problem & Goal

Today an Allma **`Flow`** is authored either in the Visual Flow Editor or by hand-writing
`*.flow.json` files that the CDK config-importer loads into DynamoDB at deploy time. Hand-authored
JSON has real costs for engineers who maintain flows in a repo:

- **No type safety.** A typo in a `stepType`, a wrong config key, or a malformed JSONPath surfaces
  only at deploy time (`FlowDefinitionSchema.safeParse` in the importer) or — for module
  `customConfig` — only at **runtime** (see §2, the validation gap).
- **Stringly-typed graph wiring.** `startStepInstanceId`, every `transitions[].nextStepInstanceId`,
  `defaultNextStepInstanceId`, and `onError.fallbackStepInstanceId` are free-text step-ID references.
  Renaming a step is a find-and-replace; a dangling reference is invisible until validation.
- **Stringly-typed cross-artifact references.** Sub-flow `flowDefinitionId`, prompt-template IDs,
  custom-lambda names, and reusable `stepDefinitionId` are bare strings with no existence check at
  author time.
- **No reuse / abstraction at the source level**, and **poor editor support** (no autocomplete, no
  inline docs, no go-to-definition).

**Goal:** let engineers define flows in TypeScript with **compile-time type safety, refactor-safe
references (intra- *and* cross-flow), build-time validation that is at least as strict as deploy —
and ideally stricter — and a deterministic JSON artifact**, while the platform's wire/storage
contract and the Visual Editor keep working unchanged.

```ts
const flow = defineFlow({ id: 'order-intake', description: 'Load → enrich → save' });
const s = flow.steps({
  load:   s3DataLoad({ sourceS3Uri: 's3://...' }),
  enrich: llmInvocation({ llmProvider: 'BEDROCK', /* typed */ }),
  save:   s3DataSave({ /* typed */ }),
});
s.load.next(s.enrich); s.enrich.next(s.save);
flow.start(s.load);
export default flow;
```

### Non-goals

- Replacing the Visual Editor. It remains fully supported; code- and editor-authored flows coexist
  under an explicit **ownership model** (§6) rather than a merge.
- A new flow runtime, orchestrator, or DynamoDB schema. The builder is a compile-time tool that
  emits the existing artifact.

### Source-of-truth clarification (correcting the first draft)

The first draft simultaneously claimed "JSON remains the single source of truth" *and* proposed that
code authors flows. Those conflict. The corrected position: **JSON remains the wire/storage
contract**, but for a given flow, **either code or the Visual Editor owns authoring** — never both at
once. Ownership is explicit, persisted, and enforced (§6).

---

## 2. Background: the existing contract (what we must produce — and its gaps)

All of the following already exists in `@allma/core-types` and the deploy pipeline. Read this section
carefully: two of the first draft's central claims do not hold against the code.

### Flow definition
`packages/core-types/src/flow/core.ts` — `FlowDefinition` / `FlowDefinitionSchema`. The schema's
`.superRefine` enforces **cross-references**: `startStepInstanceId` exists; every transition /
default-next / fallback target exists; every JSONPath (`condition`, mappings, `aggregationConfig`) is
well-formed. The top-level type is **hand-written** (`core.ts:44-64`) specifically "to prevent
TypeScript error TS7056 due to the complexity of the inferred Zod schema type" — direct evidence that
deriving types across this schema is not free (see §9, TS7056 risk). The object is `.passthrough()`
(`core.ts:90`).

### Step instance (discriminated union)
`packages/core-types/src/steps/definitions.ts` — `StepInstanceSchema` is
`BaseStepDefinitionSchema ∧ instance-fields`, where `BaseStepDefinitionSchema` is the
`StepPayloadUnionSchema` (discriminated union on `stepType`, 21 members) `.and(...).passthrough()`
(`definitions.ts:84-92,163`). Both the base and the instance object are `.passthrough()`.

**Two flavors of step config:**
- **Typed-payload steps** (`LLM_INVOCATION`, `API_CALL`, `PARALLEL_FORK_MANAGER`, …): a dedicated Zod
  payload schema with named fields.
- **Module-identifier steps** (`DATA_LOAD`, `DATA_SAVE`, `DATA_TRANSFORMATION`, `CUSTOM_LOGIC`): a
  `moduleIdentifier` plus a free-form `customConfig`.

### ⚠️ Gap 1 — `customConfig` is **not** validated by `FlowDefinitionSchema`
For the module-identifier steps, `customConfig` is `z.record(z.any())`
(`steps/system/misc.ts:63,72,95,29`; instance-level `customConfig` is `z.record(z.any())` too,
`definitions.ts:86`). The real shapes — `S3DataLoaderCustomConfigSchema`, etc. — are imported and
parsed **only at runtime in the step handlers** (e.g.
`app-logic/src/allma-core/data-loaders/s3-loader.ts`), never by `FlowDefinitionSchema`. So a
malformed S3 loader config passes deploy validation and fails at runtime.

**Consequence for this design:** the first draft's claim that build-time `FlowDefinitionSchema.parse`
"moves *every* cross-reference/JSONPath error to author time" is false for exactly the steps that need
it most. We fix this at the platform level (§4.1) so the builder *and* the importer *and* the editor
all gain it — rather than making the builder a special case.

### ⚠️ Gap 2 — template variables render in **`flowVariables` only**, with **three** globals
The importer's `renderTemplates` replaces only `{{stage}}`, `{{accountId}}`, `{{region}}`, and it is
applied **only to `flow.flowVariables`** — not to arbitrary `customConfig`/payload fields
(`app-logic/src/allma-cdk/config-importer.ts:110-116,149-155,164-171`). A placeholder anywhere else
(e.g. a `tableName` inside `customConfig`) is **never rendered**. The builder must model this
constraint (§5.5), or authors will mint silently-broken configs.

### Version & timestamp semantics (constrains "commit the JSON")
The importer matches on `parsedFlow.version` and **fails if that version slot doesn't already exist**
("Creating new versions for existing flows on import is not supported",
`allma-importer.service.ts:121-130`). So `version` is part of the import contract and cannot simply
be dropped. The importer **strips `createdAt`/`updatedAt` for connections and agents** before
writing (`:157,164,185,192`) but **not for flows** — an inconsistency we exploit in §4.3 to make the
emitted artifact deterministic.

### Editor already auto-lays-out positionless flows
`packages/admin-shell/src/features/flows/editor/flow-utils.ts:67-189` runs a Dagre layout as a
"one-time setup" whenever **no** step carries a valid `position`, and preserves saved positions
otherwise. A code-authored flow that emits **no positions** therefore renders cleanly on first open —
the layout half of coexistence (§6) is already solved by the platform.

### Deployment pipeline (unchanged target)
`*.flow.json` files under an example's `config/flows/` are packaged as an S3 asset, and a CFN custom
resource invokes `config-importer.ts`, which validates with the importer service and writes via the
versioned entity manager. File format is `AllmaExportFormat`
(`{ formatVersion, exportedAt, flows: [...] }`). **The builder's job is to emit this exact JSON.**

---

## 3. Design options considered

### Option A — Typed factories + plain object literals (thin)
Typed factories returning `StepInstance`s; author wires transitions with string IDs.
- ✅ Smallest surface. ❌ Graph wiring stays stringly-typed; no forward-ref checking until Zod runs.

### Option B — Fluent builder with object step references *(recommended)*
A `FlowBuilder` whose steps are addressed by **refs, not strings**. Wiring (`.next(ref)`,
`.when(cond, ref)`, `.onError({ fallback: ref })`, `flow.start(ref)`) takes refs.
- ✅ Refactor-safe wiring; per-step-type config autocomplete; build-time validation.
- ✅ With a **two-phase API** (§5.2) it eliminates string refs *even for cycles/back-edges*, closing
  the `flow.ref('string')` leak the first draft still had.

### Option C — Class/decorator model (`new Flow()`, `new Step()`, `flow.addStep(step)`)
The literal requested shape.
- ✅ Familiar OO ergonomics. ❌ Eager construction makes forward refs awkward; weaker inference.
- ➡️ Subsumed by B: we expose an `addStep`-style facade over B's internals (§5.6).

**Recommendation: Option B**, packaged as a new published platform package, **on top of a small set
of foundational platform changes (§4)** that the builder shares with the importer and editor.

---

## 4. Foundational platform changes (Phase 0 — valuable even if the builder is never shipped)

These three changes fix the gaps above at the shared-contract level. The builder then *inherits*
validation rather than duplicating it.

### 4.1 A canonical module-config registry in `core-types`

Add a single registry mapping every system `moduleIdentifier` to its config schema (the schemas that
runtime handlers already own, just centralized):

```ts
// packages/core-types/src/steps/system/module-config-registry.ts
export const SYSTEM_MODULE_CONFIG_SCHEMAS: Record<SystemModuleIdentifier, z.ZodTypeAny> = {
  [SystemModuleIdentifiers.S3_DATA_LOADER]: S3DataLoaderCustomConfigSchema,
  [SystemModuleIdentifiers.DYNAMODB_DATA_LOADER]: DynamoDbDataLoaderCustomConfigSchema,
  // ...one entry per known system module
};
```

This becomes the single source of truth feeding: the schema validation (4.2), the builder's typed
wrappers and build-time parse (§5.4), the CI completeness test (§9), and — later — admin config-form
rendering. **A completeness test lives in `core-types`** (where step types are added) asserting every
`StepType` / `SystemModuleIdentifier` has either a typed payload or a registry entry, so drift fails
in the package that caused it.

### 4.2 Validate `customConfig` through the registry — for known modules only

Extend `FlowDefinitionSchema.superRefine` to look up `SYSTEM_MODULE_CONFIG_SCHEMAS[moduleIdentifier]`
and validate `customConfig` against it. **Unknown (consumer-defined) `CUSTOM_LOGIC` modules stay
opaque**, exactly as today. This closes Gap 1 platform-wide (importer, admin save API, Visual Editor,
builder).

**Rollout (because this tightens a persisted contract):** ship as **warn-then-enforce**. First as a
non-fatal lint pass in the importer that logs warnings; clean up any existing flows; then promote to
a hard error. The greenfield builder enforces hard from day one.

### 4.3 `FlowAuthoringFormat` + deterministic artifact

Define `FlowAuthoringFormat` / `FlowAuthoringSchema` = `FlowDefinition` minus the server-owned fields
`createdAt`/`updatedAt`/`publishedAt`/`isPublished` (keep `version`, default `1`, since the importer
needs it as a target slot). The builder emits authoring format with **stable key ordering** (a
canonical serializer). Extend the importer to **strip/stamp `createdAt`/`updatedAt` for flows**, as it
already does for connections and agents — removing the only non-deterministic fields from the
committed artifact. Result: byte-stable JSON, so the §8 CI drift check is meaningful.

---

## 5. Recommended builder design

### 5.1 Package
New published package **`@allma/flow-builder`** under `packages/`. Depends on `@allma/core-types`
(types, schemas, the new registry) and, for the export validator, `@allma/core-sdk`. Product-agnostic.
Consumed by example/consumer apps as a `devDependency`. No platform runtime/infra change.

### 5.2 Two-phase wiring (no string refs, even for cycles)

Declaration and wiring are separate phases. Because every ref exists before wiring begins, forward and
backward edges are symmetric and fully typed — there is **no `flow.ref('string')` escape hatch**.

```ts
const flow = defineFlow({ id: 'poll-job', description: '...' });

// Phase 1 — declare; returns a typed record of StepRefs
const s = flow.steps({
  start:   noOp(),
  poll:    pollExternalApi({ /* typed */ }),
  done:    endFlow(),
  onError: customLambdaInvoke({ /* typed */ }),
});

// Phase 2 — wire with refs (cycles included)
s.start.next(s.poll);
s.poll.when(jp('$.poll.status').eq('PENDING'), s.poll)   // self-loop, fully typed
      .when(jp('$.poll.status').eq('DONE'), s.done)
      .onError({ fallback: s.onError });
flow.start(s.start);
```

`StepRef`/`StepDraft` keep the chainable config/wiring methods from the first draft, plus the fields
it omitted: `defaultNextMaxTransitions`, `disableS3Offload`/`forceS3Offload`, `position` override,
`stepDefinitionId`, `checkpoint`.

### 5.3 Typed step factories (derived per-leaf, not across the union)

Each typed-payload step gets a factory whose config type is derived from its **leaf** payload schema
(`z.input<typeof LlmInvocationStepPayloadSchema>` minus `stepType`). We never instantiate the giant
union type in authoring code (see §9, TS7056). One factory per `StepType`.

### 5.4 Module steps: registry-typed wrappers + escape hatch + build-time parse

```ts
s3DataLoad(cfg /* z.input<typeof S3DataLoaderCustomConfigSchema> */): StepDraft<...>;
dynamoDataLoad(cfg): StepDraft<...>;
dataLoad({ moduleIdentifier, customConfig }): StepDraft<...>;   // generic escape hatch
```

Wrappers are generated from `SYSTEM_MODULE_CONFIG_SCHEMAS` (§4.1). `.build()` parses each step's
`customConfig` against the registry schema — so even the generic `dataLoad` escape hatch is validated
when its module is known. This is the builder's **headline value**: it is the earliest point any
`customConfig` is validated.

### 5.5 Deploy variables modeled explicitly + placement guard

Deploy placeholders are first-class and live where the importer actually renders them:

```ts
defineFlow({
  id: 'order-intake',
  variables: { tableName: deployVar('OrdersTable-{{stage}}') },  // -> flowVariables
});
// steps reference $.flowVariables.tableName
```

`.build()` **scans emitted payloads/`customConfig` for `{{…}}` tokens and errors if any appear
outside `flowVariables`** (the importer won't render them) or use a token other than
`{{stage}}/{{accountId}}/{{region}}`. This closes Gap 2.

### 5.6 Build / export API and the `class Flow` facade

```ts
interface FlowBuilder {
  steps<M extends Record<string, StepDraft<any>>>(map: M): { [K in keyof M]: StepRef };
  start(step: StepRef): this;
  build(): FlowAuthoringFormat;              // strict gate (see below)
  toExport(): AllmaExportFormat;             // { formatVersion, exportedAt, flows: [build()] }
}
```

`build()` is the validation gate. It resolves refs to IDs, then parses against:
- **`.strict()` clones** of the relevant schemas (catches unknown keys that the persisted
  `.passthrough()` schema would allow — a *stricter* gate than deploy, §9), then
- the standard `FlowAuthoringSchema` (cross-references, JSONPath, and — via §4.2 — `customConfig`).

Zod errors are re-thrown with the offending **step id + field path** prepended. A `class Flow`
facade (`new Flow(meta)`, `flow.addStep(...)`) wraps the same internals for teams preferring OO.

### 5.7 Project-level cross-artifact resolution

The CLI loads **all** artifacts in the config dir (flows, prompts, step-defs, MCP connections) into a
catalog and runs a build-time **resolution pass**: every `flowDefinitionId`, `promptTemplateId`,
`stepDefinitionId` must resolve to a known artifact or be wrapped in an explicit `external('id')`
marker (which excludes it from the check and documents intent). This catches the cross-artifact typos
that intra-flow ref-safety alone cannot. The typed-handle endgame (authoring prompts/step-defs in code
so these become object refs) is Phase 3 (§11).

---

## 6. Coexistence: the ownership model (promoted from "open question")

Two authoring surfaces cannot safely merge edits. We **partition ownership per flow** and enforce it.

- **Persisted marker.** Add `authoringSource?: 'code' | 'visual'` to flow metadata, default
  `'visual'` (nothing changes for existing flows). The builder stamps `'code'`.
- **Editor enforcement (the teeth).** When `authoringSource === 'code'`, the Flow Editor opens
  **read-only**: viewing and **Sandbox stay enabled**; structural edits and Save are disabled, with a
  banner — "Managed in code. Edit the source and redeploy." A marker without enforcement is just a
  comment; this is what the first draft lacked.
- **Layout is free.** The builder emits **no positions**; the editor's existing Dagre pass
  (`flow-utils.ts`) arranges code-owned flows on open. Inspectable and sandboxable, just not editable.
- **Ownership transfer is deliberate, one-way, and logged** — never an automatic 3-way merge:
  - `allma-flows eject <flowId>` (JSON→TS) moves a flow from visual to code (also the adoption path
    for the existing flow set).
  - An explicit admin "unlock for visual editing" action flips the marker back.
- **Out-of-band drift guard.** `allma-flows check` (CI) compares each code-owned flow against the
  deployed version via the admin API and fails if the live copy was last modified by the editor.

---

## 7. Worked example (generic — `examples/basic-deployment`)

Per `AGENTS.md`, platform docs use only the generic demo. A load → enrich → save flow with a fallback:

```ts
import { defineFlow, s3DataLoad, llmInvocation, s3DataSave, customLambdaInvoke, jp, deployVar }
  from '@allma/flow-builder';

const flow = defineFlow({
  id: 'basic-extract-and-store',
  description: 'Load a document from S3, summarize with an LLM, store the result.',
  enableExecutionLogs: true,
  variables: { outputBucket: deployVar('basic-deployment-output-{{stage}}') },
});

const s = flow.steps({
  load:    s3DataLoad({ sourceS3Uri: 's3://basic-deployment-input/{key}', outputFormat: 'TEXT' })
             .displayName('1. Load document')
             .outputs({ [jp('$.steps_output.doc_text')]: jp('$') }),

  summarize: llmInvocation({ llmProvider: 'BEDROCK', modelId: 'anthropic.claude-...' })
             .displayName('2. Summarize')
             .inputs({ 'prompt.document': jp('$.steps_output.doc_text') })
             .outputs({ [jp('$.steps_output.summary')]: jp('$') }),

  store:   s3DataSave({ targetS3Uri: 's3://{{...}}' })   // build() errors: {{}} outside flowVariables
             .displayName('3. Store summary'),

  onError: customLambdaInvoke({ functionName: 'basic-deployment-on-failure' })
             .displayName('Handle failure'),
});

s.load.next(s.summarize).onError({ fallback: s.onError });
s.summarize.next(s.store).onError({ fallback: s.onError });
flow.start(s.load);

export default flow;
```

A wrong key for the step type, an unknown `customConfig` field, a deleted-step fallback, a malformed
JSONPath, or a deploy placeholder in the wrong place are all **compile-time or build-time** errors —
none reach deploy.

---

## 8. Build & deploy integration

A CLI ships with the package: **`allma-flows`**.

```
allma-flows build "flows/**/*.flow.ts" --out config/flows   # compile TS -> deterministic *.flow.json
allma-flows check "flows/**/*.flow.ts"                       # validate + drift check (no write)
allma-flows eject <flowId>                                   # JSON -> TS (adoption / ownership transfer)
```

**Commit the generated JSON** and run `allma-flows check` in CI: PR diffs show the real deployed
artifact (now byte-stable, §4.3); drift between `.ts` and `.json` fails CI; deploy stays a pure "ship
these files" step. The existing CDK custom resource picks them up unchanged.

Optional Phase 3: `allma-flows deploy` calls the flow-management admin API for CI promotion without a
CDK redeploy.

---

## 9. Type-safety & maintainability notes

- **Per-leaf type derivation only.** TS7056 in the repo came from inferring the whole `FlowDefinition`
  (union ∧ passthrough ∧ superRefine; see `core.ts:39-43`). Factories derive from small leaf payload
  schemas; heavy public types are hand-written. A **CI type-cost guard** (`tsc --extendedDiagnostics`
  budget or `@typescript/analyze-trace`) fails fast if a schema change reintroduces the blow-up.
  Fallback if derivation ever gets heavy: codegen the factory `.d.ts` from schemas.
- **Stricter-than-deploy authoring gate.** `.strict()` schema clones in `build()` reject unknown keys
  that the persisted `.passthrough()` schemas allow. The persisted contract stays loose for
  forward-compat; the authoring gate is tighter — the point of the tool.
- **Accurate "wrong key" guarantee.** Unknown keys on a factory's literal are caught by `tsc` excess
  -property checks; the `.strict()` build pass catches them in Zod too. (Plain `.passthrough()` alone
  would not — stated precisely so the doc doesn't overclaim.)
- **Registry-driven completeness.** The `core-types` completeness test (§4.1) makes new step types or
  modules that lack a factory/wrapper fail CI in the package that introduced them.

---

## 10. Risks & mitigations

| Risk                                                          | Mitigation                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `customConfig` unvalidated until runtime (Gap 1)             | Registry (§4.1) + schema validation (§4.2) + builder build-time parse (§5.4).               |
| Non-deterministic JSON breaks drift check                    | `FlowAuthoringFormat`, no timestamps, stable ordering; importer stamps flow timestamps (§4.3). |
| Two surfaces edit one flow                                   | Persisted `authoringSource` + **editor read-only enforcement** + logged one-way transfer (§6). |
| Deploy placeholders silently unrendered (Gap 2)              | `deployVar` + build-time placement/token scan (§5.5).                                        |
| Back-edges fall back to string refs                          | Two-phase wiring (§5.2) — no `flow.ref('string')`.                                           |
| Cross-artifact IDs unchecked                                 | Project-level resolution pass + `external()` marker (§5.7).                                  |
| `z.input` across the union triggers TS7056                   | Per-leaf derivation, hand-written heavy types, CI type-cost guard (§9).                      |
| `.passthrough()` lets typos through Zod                      | `.strict()` clones in the authoring gate (§5.6, §9).                                         |
| Builder drifts from `core-types`                             | Registry + completeness test located in `core-types` (§4.1).                                |
| Tightening persisted schema rejects existing flows           | Warn-then-enforce rollout for §4.2.                                                          |

---

## 11. Proposed phasing

- **Phase 0 — foundational platform changes (independent value):** module-config registry (§4.1);
  warn-mode `customConfig` validation in `FlowDefinitionSchema` (§4.2); `FlowAuthoringFormat` +
  importer stamps flow timestamps (§4.3); completeness test in `core-types`.
- **Phase 1 — builder MVP:** registry-derived typed factories, two-phase wiring, strict authoring
  gate, deterministic emit, `customConfig` build-time parse, project-level cross-artifact resolution,
  deploy-placeholder scan, no positions, `allma-flows build/check`. Migrate one
  `examples/basic-deployment` flow as the reference. `minor` changeset (new published package).
- **Phase 2 — coexistence & ergonomics:** `authoringSource` marker + **editor read-only enforcement**
  (relies on existing Dagre auto-layout); `allma-flows eject`; `jp` path helper; `class Flow` facade;
  promote §4.2 from warn to enforce once existing flows are clean.
- **Phase 3 — config-as-code:** typed `definePrompt`/`defineStep`/MCP with object cross-references;
  `allma-flows deploy` admin-API promoter; typed-context generics for mappings; docs under
  `docs.allma.dev/docs/` (how-to + reference), kept in sync per `AGENTS.md`.

---

## 12. Open questions

1. **Package name** — `@allma/flow-builder` vs. `@allma/flows-sdk` vs. `@allma/flow-dsl`.
2. **`authoringSource` default & migration** — confirm `'visual'` default and whether existing flows
   are left unmarked (treated as visual) or backfilled.
3. **Editor read-only scope** — is disabling structural edits + Save (keeping view + Sandbox) the
   right line, or do we also allow non-structural metadata edits (e.g. description) on code-owned flows?
4. **`class Flow` facade in Phase 1 or Phase 2** — is `defineFlow` enough to satisfy the requested
   ergonomics initially?
