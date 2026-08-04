# @allma/flow-builder

## 0.3.0

### Minor Changes

- 6c59a8b: Upgrade repository target to Node 24 and TypeScript 5.7. This bumps the \`@types/node\` definitions and compiler target, which may require consumers to update their build environments to Node 24 and TS 5.7+.

### Patch Changes

- Updated dependencies [6c59a8b]
  - @allma/core-sdk@1.2.0
  - @allma/core-types@1.8.0

## 0.2.0

### Minor Changes

- 062e1ec: Add **`@allma/flow-builder`** — Flows-as-Code Phase 1. A new published,
  product-agnostic platform package (consumed by example/consumer apps as a
  `devDependency`) for authoring Allma flow definitions in TypeScript, plus an
  `allma-flows` CLI.

  - **Two-phase, ref-based wiring.** `defineFlow({...}).steps({...})` returns a
    typed record of refs; wiring uses `.next(ref)`/`.when(cond, ref)`/`.onError({
fallback: ref })`/`flow.start(ref)` — no string refs, cycles and back-edges
    included. Refs carry the full instance surface (display name, input/output
    mappings, checkpoint, S3-offload flags, position override, step-definition id,
    default-next max transitions, delay, literals).
  - **Per-leaf typed factories** (one per `StepType`, config derived from each
    step's own leaf schema — never the union, avoiding TS7056), **16 registry-typed
    module wrappers** (one per module in `SYSTEM_MODULE_CONFIG_SCHEMAS`), and **4
    generic escape hatches** (`dataLoad`/`dataSave`/`dataTransform`/`customLogic`).
  - **Strict build gate.** `build()` runs, in order: deploy-token placement scan →
    `.strict()` leaf-clone payload parse (stricter than the persisted
    `.passthrough()` schemas) → `customConfig` validation via the registry →
    shared `FlowAuthoringSchema` (cross-refs + JSONPath). Failures aggregate into a
    `FlowBuildError` with step id + field path. `toExport()` emits a deterministic
    (stable key order, fixed `exportedAt`) `AllmaExportFormat`.
  - **Deploy variables** via `deployVar(...)` + a placement scan that flags only
    the three importer-rendered deploy tokens (`{{stage}}`/`{{accountId}}`/
    `{{region}}`) when used outside `flowVariables`, while allowing legitimate
    runtime Handlebars templates (`{{flow_variables.x}}`, `{{steps_output.y}}`)
    anywhere.
  - **Project-level cross-artifact resolution** (`resolveReferences`) with an
    `external(id)` marker, and a **CI type-cost guard** (`scripts/type-cost-guard.mjs`)
    that fails if a schema change reintroduces the TS7056-class inference blow-up.
  - **CLI** `allma-flows build "<glob>" --out <dir>` (TS → deterministic
    `*.flow.json`) and `allma-flows check "<glob>" [--out <dir>]` (strict gate +
    deploy-parity validation via `@allma/core-sdk` + cross-artifact resolution +
    drift check).

  Additive and fully backward compatible: no platform runtime, infra, or schema
  change. Phase 0's warn-mode importer lint and the `FlowDefinitionSchema` contract
  are unchanged.

- ba438df: Add the `authoringSource` flow-ownership marker (Flows-as-Code Phase 2, RFC §6).

  `FlowDefinition`, `FlowAuthoringFormat`, and `FlowDefinitionObjectSchema` gain an optional
  `authoringSource?: 'code' | 'visual'` field that defaults to `'visual'`, so every existing flow is
  unchanged. `@allma/flow-builder`'s `build()` now stamps `'code'` on the flows it emits, marking them
  as managed in code. This is the persisted signal the Visual Editor uses to open code-owned flows
  read-only. The change is additive and backward compatible.

- ba438df: Add an out-of-band drift guard for code-owned flows (Flows-as-Code Phase 2, RFC §6).

  `detectDrift(localCodeFlows, fetchDeployed)` compares each code-owned flow against its deployed
  copy and reports drift when the live version was taken over by the Visual Editor
  (`authoringSource` no longer `'code'`) or its authored fields no longer match the source. The
  `allma-flows check` command gains an opt-in `--remote <baseUrl>` flag that fetches deployed flow
  versions from the admin API (bearer token from `ALLMA_ADMIN_TOKEN`) and fails CI on drift. Without
  `--remote`, `check` is unchanged and performs no network calls.

- ba438df: Add `allma-flows eject` — JSON → TypeScript codegen for adopting a flow into code (Flows-as-Code
  Phase 2, RFC §6).

  `ejectFlow(flow)` (and the new `eject` CLI command) turn a committed/deployed flow definition back
  into a `.flow.ts` builder source: typed-payload steps map to their factories, known system modules
  to their registry-typed wrappers and consumer modules to the generic escape hatches, and
  instance/wiring fields are re-emitted as chained `.displayName()`/`.inputs()`/`.next()`/`.when()`/
  `.onError({ fallback })` calls. The output is round-trippable — `build()`-ing the generated source
  reproduces the original artifact (modulo the `authoringSource:'code'` stamp). This is the adoption /
  one-way ownership-transfer path from the Visual Editor into code.

- ba438df: Add the `jp()` JSONPath helper and the `class Flow` OO facade (Flows-as-Code Phase 2, RFC §5.2/§5.6).

  `jp('$.steps_output.x')` validates a JSONPath eagerly (reusing the shared `JsonPathStringSchema`) and
  returns it as a branded string for use in mappings, conditions, and right-hand operands — a malformed
  path throws at author time. Its comparison builders (`jp.eq/ne/gt/gte/lt/lte`) emit transition-condition
  strings in the exact grammar the runtime evaluator understands.

  `class Flow` (`new Flow(meta)`, `addStep(id, draft)`, `start(ref)`, `build()`/`toExport()`) is an
  imperative authoring facade over the same internals as `defineFlow`; both share one build + strict
  validation core and produce byte-identical artifacts.

- 8b9f64e: Flows-as-Code Phase 3 — config-as-code, typed object references, typed context,
  and an admin-API deploy command. All additive and backward compatible.

  - **`definePrompt` / `defineStep` / `defineMcpConnection`**: author prompt
    templates, reusable step definitions, and MCP connections in code with the same
    strict build gate and deterministic emit as `defineFlow`. Each returns a typed
    handle (`{ id, kind, build(), toExport() }`). `allma-flows build`/`check` now
    emit and validate these alongside flows (one file per artifact, suffixed by kind:
    `*.flow.json` / `*.prompt.json` / `*.step.json` / `*.mcp.json`). These artifacts
    carry a fixed placeholder `createdAt`/`updatedAt` so the committed JSON stays
    byte-stable while satisfying the deploy validator (the server overwrites it on
    import).
  - **Typed object references**: `promptTemplateId`, `subFlowDefinitionId`,
    `flowDefinitionId`, `mcpConnectionId`, and `.fromDefinition(...)` now accept the
    authored handle (or its typed ref) in addition to a bare string id. A
    `FlowBuilder`/`Flow` is itself a `FlowRef`. The builder normalizes a handle to its
    string id, so the wire contract is unchanged; `external('id')` still works. The
    cross-artifact resolution pass and the CLI catalog now cover `mcpConnectionId`.
  - **`flowContext<Ctx>()`**: an opt-in `jp`-shaped helper whose path argument is
    constrained to a context type's dotted key paths (bounded to recursion depth 3),
    turning a stale context path into a compile error. Default `jp`/`inputs`/`outputs`
    remain plain `string`; the CI type-cost guard stays within budget.
  - **`allma-flows deploy`**: promote built artifacts to a running environment via
    the admin `POST /v1/allma/import` route (bearer token from `ALLMA_ADMIN_TOKEN`),
    with optional `--publish`. Honors the importer's version-slot contract and
    surfaces per-item errors. Network/auth live behind a thin adapter, so the
    `planDeploy`/`executeDeploy` core is pure and unit-tested with a stubbed adapter.

### Patch Changes

- ba438df: Document Phase 2 in the README: `jp()` / `class Flow` ergonomics, `allma-flows eject` and `check
--remote`, the Visual-Editor coexistence model (read-only enforcement + one-way ownership transfer),
  and the author-time `customConfig` enforcement decision (the builder enforces strictly at build time
  while the shared wire-contract schema stays advisory, because `customConfig` fields may be supplied
  at runtime via `inputMappings`).
- Updated dependencies [062e1ec]
- Updated dependencies [ba438df]
- Updated dependencies [062e1ec]
  - @allma/core-types@1.7.0
  - @allma/core-sdk@1.1.1
