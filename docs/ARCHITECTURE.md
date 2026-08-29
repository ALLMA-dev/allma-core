# Architecture

The architectural rules of `allma-core` as they are today, derived from the code, the commit history
and the design docs under `docs/design/`, `design/` and `documents/wip/`. Where the code is
inconsistent, the inconsistency is written down rather than tidied away.

[`../AGENTS.md`](../AGENTS.md) carries repository boundaries, task routing, coding style and
changeset policy; `docs.allma.dev/docs/` is the behavioural reference for every step type and admin
API.

---

## Vision

`allma-core` is a serverless agent framework other people adopt and build on: message intake,
Lambda event workflows, LLM tool integration and stateful multi-agent execution. It is a product in
its own right, not internal scaffolding.

**Winning is someone else shipping on it without ever talking to its authors.** That test makes
developer experience, documentation and versioning discipline the product rather than overhead
around it.

**It serves the external developer building their first agent on it, holding only the
documentation** — not the maintainers, not any one consumer. Where a consumer's needs and the
framework's coherence conflict, **the general case wins**; no single consumer is privileged.

---

## Non-goals

A plan proposing any of these fails outright.

- **Never name a consuming project** — not in this document, not in the public API, not as an
  example or a special case. A rule only understandable by knowing who uses it is written wrong.
- **Never consumer-specific behaviour in core.**
- **Never a feature that only makes sense with knowledge of a particular consumer.**
- **Never a breaking change to an exported surface without a major version and a migration note.**
- **Never an undocumented public API** — if an external developer cannot discover it, it does not
  ship.

---

## Direction of travel

A change that adds more of a FROM side is a direction violation, however clean and well-layered.
Cite the line.

- FROM internal convenience → TOWARD an adoptable published surface.
- FROM behaviour dispatched by a `switch` in a caller → TOWARD a registry.
- FROM implicit contracts → TOWARD type-safe schema validation at every boundary.

---

## Trade-off ranking

What wins when two goods conflict. Highest first.

1. **Public API stability.** A breaking change needs a migration path or it does not happen.
2. **Documentation.** Undocumented is unshipped.
3. **Generality**, and only where a second real consumer needs it.
4. **Internal convenience**, last.

---

## Layers

Two one-way layer systems: **package layers** across the monorepo, **module layers** inside
`packages/app-logic/src/`.

### Package layers

A package may import from any package below it and never from one above it.

| Tier | Package (source root) | Contains | May import from |
| --- | --- | --- | --- |
| 0 | `packages/core-types/src/` | Types, enums, constants, Zod schemas | Nothing in this repo (`zod` is a peer dependency) |
| 1 | `packages/core-sdk/src/` | Runtime Lambda utilities (logger, S3, auth, JSON) | `@allma/core-types` |
| 2 | `packages/app-logic/src/` | All Lambda business logic (private, unpublished) | `@allma/core-sdk`, `@allma/core-types` |
| 2 | `packages/core-cdk/lib/` | The `AllmaStack` CDK construct tree | `@allma/core-sdk`, `@allma/core-types` |
| 2 | `packages/flow-builder/src/` | Build-time flows-as-code DSL + `allma-flows` CLI | `@allma/core-sdk`, `@allma/core-types` |
| 2 | `packages/cdk-integration-utils/src/` | CDK helper for consumers registering external steps | `@allma/core-types` |
| 1 | `packages/ui-components/src/` | Generic Mantine primitives, no Allma concepts | Nothing in this repo |
| 2 | `packages/admin-shell/src/` | React Admin Panel shell and features | `@allma/ui-components`, `@allma/core-types`, `@allma/core-sdk` (constants only) |

- **Nothing imports `allma-app-logic`.** It is `private: true` with no `main`/`types`; its only
  outbound path is build output — `tsc`, then `postbuild` copies `dist/**` into
  `packages/core-cdk/dist-logic`, which CDK references by path string
  (e.g. `'allma-flows/initialize-flow.js'`).
- **`packages/core-types` is a leaf.** No `dependencies` block; anything it would need from
  `app-logic` cannot be imported — stated in-code at
  `packages/core-types/src/steps/system/module-config-registry.ts:43-44`.
- **`packages/ui-components` must stay Allma-agnostic** — React/Mantine peer deps only. A component
  that knows what a Flow is belongs in `packages/admin-shell/src/features/`.

### Module layers inside `packages/app-logic/src/`

There is no `handlers/` directory. Lambda entry points are the **top-level files** of three
directories; anything in a subdirectory is a lower layer.

| Layer | Paths | Rule |
| --- | --- | --- |
| L1 — Lambda entry points | `src/allma-admin/*.ts` (11), `src/allma-flows/*.ts` (7), `src/allma-cdk/config-importer.ts`, `src/allma-flows/iterative-step-processor/index.ts`, `src/allma-core/execution-logger.ts` | Each exports `handler`. **Nothing may import an entry point**. |
| L2 — Services | `src/allma-admin/services/`, `src/services/` | Persistence and business logic for admin CRUD and flow/prompt versioning. Admin handlers reach DynamoDB only through these classes. |
| L3 — Execution engine | `src/allma-flows/iterative-step-processor/` | The step-processing loop. Entered only through its own `index.ts`. |
| L4 — Step handlers & transport adapters | `src/allma-core/step-handlers/`, `.../data-loaders/`, `.../data-savers/`, `.../data-transformers/`, `.../llm-adapters/`, `.../notifications/` | One file per step type or external system. Dispatched by registry, never by a `switch` in a caller. |
| L5 — Utilities | `src/allma-core/utils/`, `src/allma-admin/utils/` | Stateless helpers. May not import L1–L4. |

Allowed direction: **L1 → L2 → L3 → L4 → L5**, and any layer → `@allma/core-sdk` →
`@allma/core-types`. Sideways imports within a layer are allowed.

- Files in `src/allma-core/step-handlers/` export `handleXxx: StepHandler`, not `handler`. They are
  in-process strategies, not Lambda entry points — do not wire one into a CDK construct.
- New step handlers register in `src/allma-core/step-handlers/handler-registry.ts`; new system
  modules in `src/allma-core/module-registry.ts`.
- Domain logic also sits in unsuffixed top-level `allma-core` files (`config-loader.ts`,
  `data-mapper.ts`, `template-service.ts`, `security-validator.ts`, `execution-logger-client.ts`).
  Treat these as L4; new shared runtime logic follows that pattern rather than growing `utils/`.

### Boundary validation

Every structure crossing a process boundary has a Zod schema, and the schema belongs in
`packages/core-types/src/` — not beside the code that validates it. Convention there:
`XxxSchema = z.object(...)` followed by `export type Xxx = z.infer<typeof XxxSchema>`. Eleven
`z.object(...)` definitions still sit in seven `packages/app-logic/src/` files (e.g.
`allma-flows/resume-flow.ts:26`) — debt, not a second home.

Validation happens at three depths: **Lambda entry** (`src/allma-admin/flow-trigger.ts:52`,
`src/allma-admin/utils/create-crud-handler.ts:37` shared by every admin CRUD Lambda), **service before
persisting** (`src/allma-admin/services/flow-definition.service.ts:109`), and **step handler on the
runtime payload** (`src/allma-core/step-handlers/poll-external-api-handler.ts:14`). New code validates
at the entry point at minimum; the deeper two do not substitute for it.

---

## Canonical homes

Check here before writing a helper.

| Thing | Home | Rule |
| --- | --- | --- |
| Shared types & interfaces | `packages/core-types/src/` — 12 domain subdirectories (`common/`, `flow/`, `steps/`, `llm/`, `logging/`, `runtime/`, `storage/`, `prompt/`, `mcp/`, `agent/`, `notifications/`, `admin/`); 10 have an `index.ts`, `mcp/` and `agent/` are re-exported file-by-file | A type used by more than one package goes here, never in the consuming package. |
| Zod schemas | Colocated with the type they describe, in the same `packages/core-types/src/` files | There is **no** `schemas/` directory anywhere in the repo. Do not create one. |
| Enums | `packages/core-types/src/common/enums.ts` (`StepType`, `HttpMethod`, `SfnActionType`, `AggregationStrategy`) | Each native enum is paired with a `z.nativeEnum` schema in the same file. |
| Environment variable names | `packages/core-types/src/common/shared.ts` — `ENV_VAR_NAMES` | Never write a raw `process.env['...']` string. |
| Admin API routes & version | `packages/core-types/src/admin/endpoints.ts` — `ALLMA_ADMIN_API_ROUTES`, `ARS`, `ALLMA_ADMIN_API_VERSION` | Consumed by CDK, Lambdas and the Admin Panel alike. |
| Other core-types constants | `Stage` in `common/shared.ts`; `ITEM_TYPE_ALLMA_*` in `common/core.ts`; `AdminPermission` in `admin/permissions.ts`; module ids in `steps/system-module-identifiers.ts` | — |
| Per-module config schemas | `packages/core-types/src/steps/system/` (one file per module), registered in `SYSTEM_MODULE_CONFIG_SCHEMAS` in `module-config-registry.ts` | `SYSTEM_MODULES_WITHOUT_CONFIG_SCHEMA` is **empty and must stay that way** — adding a module there is a deliberate temporary exception, not the migration path (`module-config-registry.ts:67-78`). A module in neither fails CI by design. |
| Structured logger | `packages/core-sdk/src/logger.ts` — `log_debug/info/warn/error/critical` | Mandatory. `console.log` is banned by `AGENTS.md`. Always pass a `correlationId` (usually `flowExecutionId`). |
| S3 payload offload / hydration | `packages/core-sdk/src/s3Utils.ts` (`offloadIfLarge`, `resolveS3Pointer`), `hydrationUtils.ts` (`hydrateInputFromS3Pointers`, `S3HydrationCache`) | — |
| Admin auth middleware | `packages/core-sdk/src/authUtils.ts` — `withAdminAuth`, `getAuthContext` | Every admin Lambda wraps its handler in `withAdminAuth`, directly or via `create-crud-handler.ts:254`. The one exception is `allma-admin/flow-trigger.ts`, the public trigger endpoint, which gates on `FlowActivationService.isFlowActive` instead. |
| Other shared Lambda helpers | all in `packages/core-sdk/src/`: API Gateway responses `apiResponseBuilder.ts`; LLM JSON repair `jsonUtils.ts` (`extractAndParseJson`); object helpers `objectUtils.ts` (`isObject`, `deepMerge`); DynamoDB item mapping `storageUtils.ts`; token estimation `tokenEstimator.ts`; deploy-time config validation `config-validator.ts` (`validateAllmaConfig`); CloudFormation custom-resource replies `cloudformation-utils.ts` | — |
| Generic React primitives | `packages/ui-components/src/components/` | Must not reference Allma domain concepts. |
| Admin Panel feature UI | `packages/admin-shell/src/features/<domain>/` (11 domains) | Cross-feature UI goes in `packages/admin-shell/src/features/shared/`; app-wide in `packages/admin-shell/src/components/`. |
| Admin Panel API clients | `packages/admin-shell/src/api/` — all through `axiosInstance.ts`, wrapped in React Query hooks | No direct `fetch`/`axios` in a component. |
| Versioned DynamoDB entity access | `packages/app-logic/src/allma-admin/services/versioned-entity.service.ts`, `generic-entity.service.ts` | Extend these before writing new DynamoDB access. `AGENTS.md` makes this explicit. |
| Test helpers | `packages/app-logic/tests/unit/_helpers/` (`aws-mock.ts`, `fixtures.ts`, `logger.ts`, `vitest.setup.ts`); `packages/admin-shell/tests/_helpers/` and `tests/_setup/` | — |

**Known duplication, do not extend it.**

- `packages/core-sdk/src/cdk-utils.ts` and `packages/cdk-integration-utils/src/cdk-utils.ts` are
  identical but for a trailing newline. Only the latter is exported; the `core-sdk` copy is dead.
- `packages/app-logic/src/allma-core/step-handlers/custom-lambda-invoke-handler.ts:23` declares a
  local `CustomLambdaInvokeStepSchema` shadowing the exported one at
  `packages/core-types/src/steps/definitions.ts:55` — same name, different schema.
- `packages/core-types/src/admin/utils.ts` exports stub `withAdminAuth`, `AuthContext`,
  `offloadIfLarge` and response builders shadowing the real ones. Import those names from
  `@allma/core-sdk`, never from `@allma/core-types`.
- `packages/core-types/src/logging/console.ts` exports `log_info`/`log_warn`/`log_error`/`log_debug`
  as plain `console.*` wrappers, colliding with the structured logger. Import log functions from
  `@allma/core-sdk` only.

**Frontend route paths are the one uncentralized set** — inline string literals in
`packages/admin-shell/src/AuthenticatedApp.tsx`, duplicated between the nav-item array and the
`useRoutes` array. New routes follow that pattern; centralizing them is an improvement, not a
violation.

---

## Change surfaces

### Public API surface

For each published package, **only what the barrel re-exports is public.** Everything else is
internal — free to move, rename or delete without a major bump.

| Package | Public surface (the barrel) | Internal — free to move |
| --- | --- | --- |
| `@allma/core-types` | `packages/core-types/src/index.ts` → 13 sub-barrels | — |
| `@allma/core-sdk` | `packages/core-sdk/src/index.ts` → 11 named modules | `packages/core-sdk/src/cdk-utils.ts` (not in the barrel) |
| `@allma/admin-shell` | `packages/admin-shell/src/index.ts` — **only** `createAllmaAdminApp` and `./types/plugin` | All of `src/features/`, `src/api/`, `src/components/`, `src/hooks/`, `src/utils/` |
| `@allma/ui-components` | `packages/ui-components/src/index.ts` — `PageContainer`, `EditableJsonView`, `CopyableText` | — |
| `@allma/cdk-integration-utils` | `packages/cdk-integration-utils/src/index.ts` → `cdk-utils.ts` | — |
| `@allma/core-cdk` | `packages/core-cdk/lib/allma-stack.ts` — `AllmaStack`, `AllmaStackProps`, plus `lib/config/stack-config.ts` and `lib/config/default-config.ts` | All 11 files in `lib/constructs/` |
| `@allma/flow-builder` | `packages/flow-builder/src/index.ts` (explicit named exports) plus the `allma-flows` bin → `src/cli/allma-flows.ts` | Anything not named in `index.ts` |

- **Changing a symbol exported from a barrel is breaking** even when every in-repo caller moves in
  the same commit (§Standing decisions, 2026-06-22).
- **Adding a construct under `packages/core-cdk/lib/constructs/` is not a public API change. Adding
  a field to `StageConfig` is** — `lib/config/stack-config.ts` is exported from the package main.
- **`@allma/admin-shell` has a deliberately tiny surface**: refactoring under `src/features/` is a
  patch. `packages/admin-shell/src/types/plugin.ts` is the load-bearing part.
- `packages/flow-builder` is `0.x`, the only pre-1.0 package, and is **absent from `AGENTS.md`'s
  package table**; `packages/flow-builder/README.md` is its reference.

### Persisted and wire contracts — breaking even when no type changes

- **DynamoDB item shapes.** Single-table, `PK`/`SK` composite keys, schemas in
  `packages/core-types/src/storage/index.ts`. Four tables, ten GSIs, in
  `packages/core-cdk/lib/constructs/data-stores.ts`; a new query pattern may need a new GSI — a table
  update, not a code change.
- **Step Functions payloads** between the orchestrator and
  `packages/app-logic/src/allma-flows/iterative-step-processor/`.
- **The flow-definition JSON contract** (`AllmaExportFormat`) — written by the Visual Editor and
  `packages/flow-builder`, imported by `packages/app-logic/src/allma-cdk/config-importer.ts`, read by
  the engine.
- **The SNS execution-status event payload** from
  `packages/app-logic/src/allma-core/notifications/execution-notifier.ts`.

### What a change drags with it

| Change | Also requires |
| --- | --- |
| New Lambda entry point in `packages/app-logic/src/` | A construct edit in `packages/core-cdk/lib/constructs/` (`compute.ts` or `api.construct.ts`), an IAM role, and the entry path string. |
| Any `packages/app-logic` change | It ships as build output copied into `packages/core-cdk/dist-logic`, so `@allma/core-cdk` must be republished and consumers redeploy. **`allma-app-logic` is in the changeset `ignore` list** (`.changeset/config.json`), so the changeset must name `@allma/core-cdk`. |
| New step type | `StepType` in `packages/core-types/src/common/enums.ts`, a config schema under `packages/core-types/src/steps/system/`, a handler in `packages/app-logic/src/allma-core/step-handlers/` + registration in `handler-registry.ts`, a form in `packages/admin-shell/src/features/flows/`, a factory in `packages/flow-builder/src/factories.ts`, a page under `docs.allma.dev/docs/reference/step-types/`. |
| New admin API endpoint | `packages/core-types/src/admin/endpoints.ts`, a handler in `packages/app-logic/src/allma-admin/`, a route + role in `packages/core-cdk/lib/constructs/admin-api.ts`, a client in `packages/admin-shell/src/api/`, a page under `docs.allma.dev/docs/reference/admin-api/`. |
| New environment variable | `ENV_VAR_NAMES` in `packages/core-types/src/common/shared.ts` **and** the Lambda definition in `packages/core-cdk/lib/constructs/compute.ts`. |
| New `StageConfig` field | `packages/core-cdk/lib/config/stack-config.ts` (the interface) **and** `packages/core-cdk/lib/config/default-config.ts` (a sensible default). |
| Any platform behaviour change | The matching page under `docs.allma.dev/docs/` in the same PR — `AGENTS.md` requires it, and `onBrokenLinks: 'throw'` makes a stale internal link fail the docs build. |

### Contention files

What two parallel subtasks collide on. A plan that splits work should give each to exactly one
subtask. `package-lock.json` is the same hazard for any two subtasks adding dependencies.

- `packages/core-types/src/index.ts` and the 10 sub-barrels under `packages/core-types/src/*/index.ts`
- `packages/core-types/src/common/enums.ts` (every new step type), `common/shared.ts`
  (`ENV_VAR_NAMES`), `admin/endpoints.ts` (every new endpoint)
- `packages/core-sdk/src/index.ts`
- `packages/core-cdk/lib/allma-stack.ts` — the stack composition root
- `packages/core-cdk/lib/constructs/compute.ts` and `api.construct.ts` — every new Lambda
- `packages/core-cdk/lib/config/stack-config.ts` + `default-config.ts` — always edited as a pair
- `packages/app-logic/src/allma-core/step-handlers/handler-registry.ts` and `module-registry.ts`
- `packages/flow-builder/src/index.ts` and `packages/flow-builder/src/factories.ts`
- `packages/admin-shell/src/AuthenticatedApp.tsx` — nav items and routes, both arrays
- `AGENTS.md`, this file, `README.md`

---

## Infrastructure boundaries

### What code here may do

**At deploy time (CDK synth/deploy, run by the consumer):**

- Define and update every resource declared in `packages/core-cdk/lib/constructs/` and in the stack
  root: DynamoDB tables and the traces bucket (`data-stores.ts`), the flow-start queue and its DLQ
  (`lib/allma-stack.ts:90,95`), SNS topics (`notifications.ts`, `monitoring.ts`), Step Functions
  state machines (`orchestration.ts`, `polling-orchestrator.ts`),
  Cognito (`admin-authentication.ts`), the HTTP API and Lambdas (`admin-api.ts`, `api.construct.ts`,
  `compute.ts`), SES receipt rules (`email-integration.ts`), EventBridge rules (`monitoring.ts`) and
  the CloudFront/S3 web deployment (`web-app-deployment.ts`).
- Create IAM roles **inside the construct that uses them** and grant them least privilege.
- Read pre-existing Secrets Manager secrets by ARN supplied through `StageConfig`.
- Write flow, step, prompt, MCP-connection and agent definitions into the config table through the
  `Custom::AllmaConfigImporter` custom resource
  (`packages/app-logic/src/allma-cdk/config-importer.ts`), and `index.html` into the web-assets
  bucket via `packages/core-cdk/lib/lambda-handlers/config-injector.ts`.

**At runtime (inside a Lambda):**

- Read and write the four DynamoDB tables. All L1 entry points delegate table access to service
  classes (under `packages/app-logic/src/allma-admin/services/` and `src/allma-core/`), holding no
  `ddbDocClient` instances directly. The `DATA_LOAD`/`DATA_SAVE` step family
  (`allma-core/data-loaders/`, `data-savers/`) talks to DynamoDB directly by design.
- Read and write objects in the execution-traces bucket, through `packages/core-sdk/src/s3Utils.ts`
  and `packages/app-logic/src/allma-core/data-loaders/` / `data-savers/`.
- Send and receive SQS messages, publish to SNS, start and resume Step Functions executions, invoke
  consumer-owned Lambdas (`custom-lambda-invoke-handler.ts`), send SES email, call LLM providers
  (Bedrock, Gemini/Vertex) and arbitrary external HTTP APIs, `GetSecretValue` on granted secrets.
- **Create, update and delete EventBridge Scheduler schedules** —
  `packages/app-logic/src/allma-admin/services/schedule.service.ts`. This is the one place runtime
  code mutates AWS infrastructure outside CloudFormation. Extend it there rather than adding a
  second such surface.

### What code here may never do

- **Create or delete tables, buckets, queues, topics, functions, roles or policies at runtime.**
  Infrastructure changes go through CDK.
- **Create secrets.** The stack receives secret ARNs (`aiApiKeySecretArn` and the GCP service-account
  key ARN in `packages/core-cdk/lib/config/stack-config.ts`) and grants read. It never writes
  Secrets Manager, and never reads or writes SSM — `@aws-sdk/client-ssm` is a declared dependency of
  `@allma/core-sdk` but is imported nowhere.
- **Hardcode account IDs, ARNs, domains, regions or capacities in a construct.** They belong in
  `StageConfig`. `packages/core-cdk/lib/allma-stack.ts` throws if `awsAccountId` or
  `aiApiKeySecretArn` are still their placeholder values.
- **Weaken a removal policy on a stateful resource.** All four DynamoDB tables and the traces bucket
  are `isProd ? RETAIN : DESTROY` (`packages/core-cdk/lib/constructs/data-stores.ts`); the Cognito
  user pool (`admin-authentication.ts`), the SFN log group (`orchestration.ts`) and the inbound-email
  bucket (`email-integration.ts`) match, and new stateful resources must too. `pointInTimeRecovery: isProd`
  covers three of the four tables — `AllmaFlowContinuationStateTable` (`data-stores.ts:189`) has none,
  a gap rather than the pattern. The `web-app-deployment.ts` bucket is unconditionally `DESTROY` and
  holds only rebuildable assets.
- **Deploy the platform stack from this repository's CI.** `.github/workflows/ci.yml` never deploys.
  `.github/workflows/ci-websites.yml` deploys exactly one thing on push to `main`: the documentation
  site, via `allma.cdk/bin/allma-websites.ts`. `AllmaStack` is deployed by consumers from their own
  app, into their own account.
- **Add a product-specific resource, name or business rule** — `AGENTS.md` §Repository Boundaries.

### Naming and IAM conventions

- Every resource name is suffixed with the stage, e.g. `AllmaFlowStartRequestQueue-${stage}`.
- Prefer `grant*` over hand-written `PolicyStatement` in `packages/core-cdk/lib/`. The
  `PolicyStatement`s there are the services with no L2 grant — Bedrock, Secrets Manager, EventBridge
  Scheduler, `states:*` on a predictive ARN.
- Where a wildcard resource is unavoidable, condition it — the pattern is a resource-tag
  condition (`secretsmanager:ResourceTag/allma-mcp-secret`) in
  `packages/core-cdk/lib/constructs/compute.ts` and `api.construct.ts`.
- Lambda runtime is `NODEJS_22_X` for every platform Lambda; the one exception is the
  config-injector custom resource at `packages/core-cdk/lib/constructs/web-app-deployment.ts:155`,
  still on `NODEJS_20_X`. Tooling targets Node >= 24 (root `package.json` `engines`).

---

## Testing contract

**Vitest only.** No Jest config or Jest test exists here, despite an unbacked `"test": "jest"`
script in `allma.cdk/package.json`.

### Where tests live

| Package | Location | Files | Convention |
| --- | --- | --- | --- |
| `packages/app-logic` | `tests/unit/**` mirroring `src/`, plus `tests/integration/orchestration/` | 62 + 1 | sibling `tests/` dir |
| `packages/admin-shell` | `tests/unit/**` and `tests/dom/**` | 7 + 24 | sibling `tests/` dir |
| `packages/flow-builder` | co-located `src/*.test.ts` | 13 | co-located |
| `packages/core-types` | co-located `src/**/*.test.ts` | 4 | co-located |

Both are live. Match the package you are in; do not migrate one to the other as part of an unrelated
change. Naming is uniform `*.test.ts` / `*.test.tsx` — no `__tests__/` directories, no `*.spec.*`
files.

`packages/core-cdk`, `packages/core-sdk`, `packages/cdk-integration-utils`, `packages/ui-components`
and `allma.cdk` have **no tests at all**: the IaC layer is untested. A plan adding the first test to
one of these is adding a capability, not following a pattern.

### Commands

```
npm run test                      # root: turbo run test (depends on build)
npm run lint                      # root: turbo run lint
npm run build                     # root: turbo run build — this is the typecheck

npm -w allma-app-logic run test              # vitest run --project unit  (hermetic)
npm -w allma-app-logic run test:coverage
RUN_LIVE_AWS=1 npm -w allma-app-logic run test:integration   # real AWS, dev stage

npm -w @allma/admin-shell run test:unit      # node environment
npm -w @allma/admin-shell run test:dom       # jsdom environment
npm -w @allma/flow-builder run test
npm -w @allma/flow-builder run type-cost     # tsc --extendedDiagnostics budget guard
npm -w @allma/core-types run test
```

There is **no `typecheck` script** in any published package. Typechecking happens as a side effect
of `npm run build`: `tsc` for `app-logic`, `core-types`, `core-sdk`, `core-cdk`,
`cdk-integration-utils` and `flow-builder`; `tsup` with `dts: true` for `admin-shell` and
`ui-components`, which typechecks the public surface but not component internals. **Test files are
not typechecked by any command.** A plan claiming "zero type errors" means `npm run build` passes.

### How tests isolate

- **Hermetic by default.** AWS clients are intercepted at the client `send` layer with
  `aws-sdk-client-mock` + `aws-sdk-client-mock-vitest`, registered globally in
  `packages/app-logic/tests/unit/_helpers/vitest.setup.ts`; stubs in `_helpers/aws-mock.ts`.
  **No LocalStack, testcontainers or dynamodb-local.**
- **The live layer is opt-in by collection-gating, not by mocking.**
  `packages/app-logic/vitest.workspace.ts` sets the integration project's `include` to `[]` unless
  `RUN_LIVE_AWS=1`, and `test:integration` passes `--passWithNoTests`. It requires a deployed dev
  stage; `packages/app-logic/tests/integration/setup.mjs` reads resource names from
  `packages/core-cdk/dist/lib/config/default-config.js`, so **core-cdk must be built first**.
  Live tests clean up what they write (`cleanupAllTestFlows` in `afterAll`).
- **Frontend DOM tests** use `jsdom` + Testing Library with
  `packages/admin-shell/tests/_setup/jsdom.setup.ts`.

### The bar

- **Coverage thresholds are a floor that ratchets, not a target.** `packages/app-logic/vitest.config.ts`
  (lines 55 / functions 69 / statements 55 / branches 74) and
  `packages/admin-shell/vitest.config.ts` (35 / 63 / 35 / 73). A change may raise them; it may not
  lower them to go green (§Standing decisions, 2026-06-21).
- **A test earns its place by guarding a rule that, if broken, corrupts state or loses work** —
  orchestration transitions, payload offload/hydration, versioning and publishing, mapping and
  templating, error/retry policy. The 10 files under
  `packages/app-logic/tests/unit/allma-flows/iterative-step-processor/` are where the density belongs.
- **Not worth a test:** CDK wiring already asserted by synth, pure type declarations, barrels
  (`src/**/index.ts`, excluded from coverage in both configs) and the admin-shell harness
  (`src/harness/**`, excluded in `packages/admin-shell/vitest.config.ts`).
- **What CI actually gates is narrower than the above.** `.github/workflows/ci.yml` runs
  `npm run lint` and `npm run build`, then `npm run test` **only in `packages/app-logic`**, and only
  when `TEST_AWS_*` secrets are present. The `admin-shell`, `flow-builder` and `core-types` suites do
  not run in CI. Run them locally; a green PR is not proof they pass.

---

## Code style

`AGENTS.md` §Engineering Coding Style Guide is the full rule set.

### Volume

- **A change carries the files its acceptance criteria name, and no others.** A plan proposing files
  no criterion asks for is over-scoped: drop them, or add the criterion.
- Rough sizes: a bug fix is one or two files plus its test. A new step type is the seven-file set
  under Change surfaces — not more, not fewer. A refactor spanning more than one package is two changes
  unless a type change forces them together.
- **Split a file when it holds several logical parts** (`AGENTS.md`). The largest file here is 733
  lines (`packages/app-logic/src/allma-admin/services/execution-monitoring.service.ts`); treat ~700
  as where a reviewer asks for a split, not a hard limit.
- **Never duplicate logic** — check Canonical homes first.
- Do not restructure directories, rename exports, or migrate a package's test convention as a side
  effect of another change.

### Commentary

- **Comment the *why*, never the *what*.**
- Admit a comment for a contract another file depends on, an invariant the types cannot enforce, a
  "looks safe but does X" trap, or an approach tried and rejected. Model examples:
  `packages/app-logic/src/allma-flows/iterative-step-processor/step-executor.ts:242`,
  `packages/core-types/src/steps/system/module-config-registry.ts:126`,
  `packages/flow-builder/src/typed-context.ts:20`.
- **JSDoc public exported functions, classes and complex types**, especially in
  `packages/core-types/` and `packages/core-sdk/`.
  Do not JSDoc a declaration whose name and type already say it.
- No changelog notes in code (`// added for #123`).

---

## Standing decisions

Dated by the commit where the decision landed in code, or where the written design landed.

- 2025-10-01 Serverless-first on AWS CDK: Step Functions drives execution, Lambda holds business
  logic, DynamoDB and S3 hold state. No servers, no containers. (`8f57700`, the initial commit)
- 2025-10-01 Configuration and execution state live in a **single DynamoDB table** with composite
  `PK`/`SK` keys, so related items are fetched in one query. (`8f57700`)
- 2025-10-01 Large payloads are **offloaded to S3 and passed as pointers**, so flow authors never
  think about the Step Functions 256KB limit. (`8f57700`)
- 2025-10-26 The platform ships as published `@allma/*` npm packages; `allma-app-logic` stays private
  and is bundled into CDK assets rather than published. (`fc0eb9a`)
- 2025-10-26 Platform code stays **product-agnostic** — no consumer application's names, types or
  business rules in `packages/*` or `allma.cdk/`. (`AGENTS.md`)
- 2025-12-28 `examples/` is gitignored; example apps live in their own repositories and consume
  `@allma/*` as read-only published dependencies. (`96b1d0c`)
- 2026-03-22 The orchestrator keeps step output under a 100KB safety margin
  (`SFN_SAFE_PAYLOAD_LIMIT`), not the 256KB service limit. (`841d2b7`)
- 2026-04-19 A step's mapped output stays the **pure step output** — step input is deliberately not
  merged in, to stop context snowballing through the payload. (`158466b`)
- 2026-04-22 Flow transitions are bounded by explicit transition limits, so a mis-wired loop
  terminates instead of running forever. (`64d0c00`)
- 2026-06-21 Platform behaviour is documented under `docs.allma.dev/docs/`, and a behaviour change
  updates its page in the same PR. (`cf5bef3`)
- 2026-06-21 Tests are **hermetic by default with a thin live-AWS smoke layer** — AWS clients are
  intercepted at the `send` layer; the live layer is opt-in behind `RUN_LIVE_AWS=1`. (`205fce2`)
- 2026-06-21 Coverage thresholds start deliberately low and ratchet up as modules gain tests: a floor
  that may rise and may not be lowered. (`f6d2a30`, `6a156b2`)
- 2026-06-22 An agent never selects a `major` changeset bump — a breaking change is confirmed by a
  human maintainer or implemented backward-compatibly. Default to `patch`. (`f77e9d8`)
- 2026-06-24 Gemini supports two credential paths: a Secrets Manager service-account key for
  immediate use, falling back to ADC/Workload Identity Federation, the production target. (`f4b1483`)
- 2026-06-27 Execution progress is a **checkpoint on the step, not a flow-level list** — it travels
  with the step, so adding, removing, reordering or cloning steps keeps progress correct. (`be5a333`)
- 2026-06-27 Progress is **stamped onto the metadata item by the orchestrator**, not derived from
  step records on read: the step logger is fire-and-forget and may lag or reorder. (`ce1e482`)
- 2026-06-27 Terminal execution notifications are emitted **only** by the EventBridge lifecycle
  dispatcher, never by `finalize-flow`: it is the only crash-proof terminal signal, and a single
  emitter avoids double-send. (`009f92a`)
- 2026-06-27 Status propagation across sub-flows is **child-driven push-up or read-time tree
  assembly**, never parent pull, because a SYNC sub-flow suspends its parent. (`be5a333`)
- 2026-06-27 Execution status events are at-least-once and **unordered** — no consumer may assume
  `STARTED` arrives before `CHECKPOINT`. (`009f92a`)
- 2026-07-02 The engine never materializes the whole flow context; sub-flow finalization and
  parallel/Distributed-Map aggregation are bounded in memory. (`45caad0`, `011c520`) — and `NONE` is
  a supported aggregation strategy, a pure barrier collecting nothing, for fan-outs too large to
  aggregate. (`3209d7e`)
- 2026-08-04 `@allma/flow-builder` is a **build-time tool only** — no new runtime, orchestrator or
  DynamoDB schema; it emits the existing `AllmaExportFormat` JSON. (`062e1ec`)
- 2026-08-04 For a given flow, **either code or the Visual Editor owns authoring, never both**, and
  ownership transfer is deliberate, one-way and logged. (`ba438df`)
- 2026-08-04 The flow-builder wires steps by **typed refs from a two-phase API, with no
  `flow.ref('string')` escape hatch**. (`062e1ec`)
- 2026-08-04 The build-time authoring gate is **stricter than the deploy-time contract**: `.strict()`
  clones reject unknown keys the persisted `.passthrough()` schemas allow. (`062e1ec`)
- 2026-08-04 Types are derived **per leaf payload schema only**; heavy public types are hand-written,
  because inferring the whole `FlowDefinition` caused TS7056. (`062e1ec`)
- 2026-08-04 The module-config registry check is **warn-mode and decoupled from
  `FlowDefinitionSchema`**: a required `customConfig` field may legitimately arrive at runtime via
  `inputMappings`. (`062e1ec`)
- 2026-08-04 Consumer-defined `CUSTOM_LOGIC` modules stay opaque to validation, and tightening a
  persisted contract ships **warn-then-enforce**: a non-fatal importer lint pass first, clean up
  existing data, then promote to a hard error. (`062e1ec`)
- 2026-08-04 The toolchain is Node 24 and TypeScript 5.7. (`6c59a8b`)
- 2026-08-06 `@allma/ui-components` externalizes Mantine as a peer dependency, so a consumer's Mantine
  version is the only one in the bundle. (`1cff3a4`, `0d6ce95`)

**Not covered.** There is no ADR directory and only three written design docs. Nothing sources a
decision on: why the iterative Lambda loop was chosen over a hand-written Step Functions state
machine; which of the two test-location conventions is preferred; whether the IaC layer should be
tested; or a package dependency rule stated anywhere but in the code. Undecided, not omitted.

---

## Rejected alternatives

| Alternative | Why it lost | Source |
| --- | --- | --- |
| GraphQL/AppSync for execution status | A second API paradigm for one read path; the platform stays REST + SNS/EventBridge. WebSocket push is deferred, not rejected. | `docs/design/real-time-execution-status.md:39` |
| Deriving progress from step records at read time | The step logger is async and may lag or reorder. Kept only as a fallback for legacy un-stamped executions, without an S3 fetch so polling stays cheap. | `docs/design/real-time-execution-status.md`, `packages/app-logic/src/allma-admin/services/execution-monitoring.service.ts:421` |
| Typed factories over object literals (flows-as-code Option A) | Smallest surface, but graph wiring stays stringly-typed with no forward-ref checking until Zod runs. | `design/flows-as-code.md` §3 |
| A class/decorator `new Flow()` model as the primary API (Option C) | Eager construction makes forward refs awkward and weakens inference. An `addStep` facade sits over the chosen internals instead. | `design/flows-as-code.md` §3 |
| "JSON is the single source of truth" *and* code authors flows | They conflict. JSON is the wire/storage contract; per flow, either code or the editor owns authoring. | `design/flows-as-code.md` (self-reversal) |
| Hard-failing `customConfig` validation in `FlowDefinitionSchema` | A required field may legitimately be supplied at runtime via `inputMappings`, so a hard error rejects valid flows. | `packages/flow-builder/README.md` |
| Threading a context generic through `Step`/`StepRef`/`StepDraft` | Re-instantiates types across the 21-member step union — the inference blow-up the package exists to avoid. Typed context is opt-in, depth-bounded to 3. | `packages/flow-builder/src/typed-context.ts:20` |
| Gemini Developer API (AI Studio key) as the production LLM path | Low per-project rate limits throttle production flows; Vertex AI has far higher quota, no prompt-data-for-training clause, and unified GCP IAM. | `documents/wip/gemini-vertex-migration.md` |
| A long-lived GCP service-account JSON key as the production credential | Must be rotated, discouraged by Google. WIF is the production target; the SA-key path exists only to unblock. | `documents/wip/gemini-vertex-migration.md` |
| Raw Step Functions / ASL, Trigger.dev / Inngest, LangChain / LlamaIndex as the platform | Each costs a constraint Allma holds: hand-written ASL loses the visual editor and versioning; the hosted orchestrators put a third party in the data path, outside the user's account; the LLM frameworks are libraries, not a deployable serverless control plane. | `README.md:58` |
