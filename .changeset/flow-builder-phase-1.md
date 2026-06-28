---
"@allma/flow-builder": minor
---

Add **`@allma/flow-builder`** — Flows-as-Code Phase 1. A new published,
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
