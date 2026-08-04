# @allma/core-sdk

## 1.1.1

### Patch Changes

- 062e1ec: Flows-as-Code Phase 0 — foundational, fully backward-compatible platform changes.

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

- Updated dependencies [062e1ec]
- Updated dependencies [ba438df]
- Updated dependencies [062e1ec]
  - @allma/core-types@1.7.0

## 1.1.0

### Minor Changes

- 0606e82: Fix `Runtime.OutOfMemory` when returning from a sub-flow whose output mixes inline fields with
  S3-offloaded (`_s3_output_pointer`) values.

  The template renderer used to hydrate the **entire** context on every `render()` call
  (`hydrateInputFromS3Pointers`), so rendering even a one-token template (an ARN, a URL, a flow id)
  pulled every offloaded blob in the context back into Lambda memory at once — undoing the offloading
  the sub-flow performed to stay small. `renderNestedTemplates` amplified this by rendering each field
  of a step's config in parallel, each re-hydrating the whole context concurrently, which is what
  exhausted memory even when the returned `steps_output` looked small.

  `TemplateService.render()` now statically inspects the Handlebars template and hydrates only the S3
  pointers the template actually references, leaving unreferenced offloaded branches as pointers. It
  falls back to full hydration only for constructs whose data dependencies can't be resolved
  statically (block helpers, `../`, `@root`, bare `this`) — so behavior is unchanged for those.

  `@allma/core-sdk` adds an optional `S3HydrationCache` (and `resolveS3PointerCached`) that
  `hydrateInputFromS3Pointers` accepts; a single cache is now shared across all fields of a config so a
  pointer referenced by many fields is downloaded once instead of once per field.

## 1.0.11

### Patch Changes

- 0ce23e0: Integration tests fixes, build fixes
- Updated dependencies [0ce23e0]
  - @allma/core-types@1.1.3

## 1.0.10

### Patch Changes

- 1951c6d: Concurency and logging improvements
- 9e3d6ee: Context hydration fixes, S3 preview tool
- 4c8ae3f: fix: S3 extraction fix for system calls
- 6ee1569: Sub-Flow execution fixes
- Updated dependencies [1951c6d]
- Updated dependencies [cd2218e]
- Updated dependencies [9e3d6ee]
- Updated dependencies [6ee1569]
- Updated dependencies [6ee1569]
  - @allma/core-types@1.1.2

## 1.0.9

### Patch Changes

- 4706c67: Email send has CC and fromName parameters now
- Updated dependencies [4d6f2f4]
- Updated dependencies [4706c67]
  - @allma/core-types@1.1.1

## 1.0.8

### Patch Changes

- f7b285f: Config validation in SDK implemented

## 1.0.7

### Patch Changes

- 690adc2: Templating fixes

## 1.0.6

### Patch Changes

- 131aa94: Small fixes here and there
- 7e155b6: fix: update execution logic to offload big payloads to S3
- Updated dependencies [131aa94]
  - @allma/core-types@1.0.17

## 1.0.5

### Patch Changes

- 77d9180: S3 resolver improvements

## 1.0.4

### Patch Changes

- 664bf52: Email ingress attachment support is added
- Updated dependencies [664bf52]
  - @allma/core-types@1.0.9

## 1.0.3

### Patch Changes

- 33b6f11: Dependencies and paths updated to fix deployment issues
- Updated dependencies [33b6f11]
  - @allma/core-types@1.0.4

## 1.0.2

### Patch Changes

- 921cdc7: packages configuration fixed for public use
- Updated dependencies [921cdc7]
  - @allma/core-types@1.0.3

## 1.0.1

### Patch Changes

- 4659536: Initial change
- Updated dependencies [4659536]
  - @allma/core-types@1.0.1
