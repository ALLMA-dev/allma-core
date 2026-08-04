---
"@allma/flow-builder": minor
---

Flows-as-Code Phase 3 — config-as-code, typed object references, typed context,
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
