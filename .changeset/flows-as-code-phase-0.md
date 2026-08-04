---
"@allma/core-types": minor
"@allma/core-sdk": patch
"@allma/core-cdk": patch
---

Flows-as-Code Phase 0 — foundational, fully backward-compatible platform changes.

- **`@allma/core-types`**: add the canonical module-config registry
  (`SYSTEM_MODULE_CONFIG_SCHEMAS`, `SYSTEM_MODULES_WITHOUT_CONFIG_SCHEMA`,
  `MODULE_CONFIG_STEP_TYPES`, `getSystemModuleConfigSchema`) mapping system
  `moduleIdentifier`s to their existing `customConfig` schemas, plus a reusable
  warn-mode validator (`collectCustomConfigWarnings`) that never throws on
  unknown/consumer modules. Add `FlowAuthoringSchema`/`FlowAuthoringFormat`
  (a `FlowDefinition` without the server-owned `createdAt`/`updatedAt`/
  `publishedAt`/`isPublished`, `version` defaulting to `1`) and the
  `applyFlowImportDefaults` helper. Add the `SystemModuleIdentifier` type. A
  completeness test fails CI if a new step type or system module is added without
  a registry entry or an explicit gap acknowledgement.
- **`@allma/core-sdk`**: `validateAllmaConfig` now stamps `createdAt`/`updatedAt`
  (and defaults `version`) for authoring-format flows before validation, so
  flows authored without those server-owned fields import cleanly. Full flows
  already carrying them are unchanged.
- **`@allma/core-cdk`**: rebuilt to pick up the bundled `allma-app-logic`
  importer change — the import path now stamps flow timestamps and runs a
  non-fatal `customConfig` lint pass (logged via the structured logger). No
  flow that imports today stops importing; enforcement is a later phase.
