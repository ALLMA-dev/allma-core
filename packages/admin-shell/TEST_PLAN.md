# `@allma/admin-shell` — Test Coverage Plan

> Scope: this plan covers **only `packages/admin-shell`** (the React Admin Panel
> shell/framework). It mirrors the proven approach already shipped in
> [`packages/app-logic/TEST_PLAN.md`](../app-logic/TEST_PLAN.md): a hermetic Vitest suite,
> a unit/integration project split, and a coverage ratchet. Other packages
> (`ui-components`, `core-sdk`, `core-cdk`, …) are a deliberate follow-up and out of scope.

## 1. Current state (why this plan exists)

- **~110 source files** under `src/` (~3.4k lines `.ts`, ~7.8k lines `.tsx`); **zero test
  files**.
- **No test runner is configured for this package**: `package.json` has no `test` script,
  no `vitest`, no DOM environment (`jsdom`/`happy-dom`), and no `@testing-library/react`.
  The monorepo root already has `vitest`, `@testing-library/jest-dom`, and
  `@testing-library/user-event` available, so tooling is a small delta — not a greenfield.
- The package is a **React 19 + Mantine 8 + React Query 5 + reactflow + Zustand** app. It is
  a published library (`@allma/admin-shell`), so its public surface
  (`createAllmaAdminApp`, the `AllmaPlugin` contract, exported services/hooks) is a real
  contract worth protecting.
- Consequently the **highest-value logic is completely uncovered**: the flow-editor Zustand
  store, the graph/layout utilities, the Zod↔form mappers, and the API service layer.

### Key architectural constraints (these shape the strategy)

1. **A large fraction of the logic is framework-free** and can be tested with little or no
   DOM. The Zustand store (`useFlowEditorStore.ts`, 599 lines) is driven entirely through
   `store.getState().<action>(…)` — no React render needed. The graph utils, mappers, and
   formatters are pure functions.
2. **Components depend on heavy providers**: Mantine (`MantineProvider`), React Query
   (`QueryClientProvider`), React Router (`<MemoryRouter>`), and Amplify auth. Component
   tests need a shared `renderWithProviders` wrapper or they drown in setup.
3. **The API layer is `axios` + React Query**. Services wrap an `AdminApiResponse<T>`
   envelope (`{ success, data, error }`) and fire Mantine notifications. The right seam is
   to mock the shared `axiosInstance` (one module) — not the network — and assert request
   shape, envelope unwrapping, and error mapping.
4. **reactflow / Dagre visual layout** (canvas geometry, node rendering) is the lowest-ROI,
   highest-cost surface and is deliberately deferred.

## 2. Strategy — a testing pyramid, hermetic by default

| Layer | What | Environment | Runs on |
| --- | --- | --- | --- |
| **Unit — pure logic** (bulk) | Store actions, graph/layout utils, mappers, formatters, form-utils | `node` (no DOM) | Every PR |
| **Unit — API/hooks** | Service fns + React Query hooks; `axiosInstance` mocked | `jsdom` + `renderHook` | Every PR |
| **Component** (selective) | Forms, tables, modals, `ErrorBoundary`, shell composition | `jsdom` + `renderWithProviders` | Every PR |
| **Integration** (thin, opt-in) | Full pages against a mock API server (MSW) | `jsdom` + MSW | On demand / nightly |

**Decisions:**
- PR CI runs **only the hermetic layers** (unit + component). No live API, no AWS, no auth.
- Use **Vitest projects** to split `unit` (node env) from `dom` (jsdom env) so pure-logic
  tests stay fast and don't pay the jsdom tax.
- Prefer **Mock Service Worker (MSW)** for any page-level integration test; mock the single
  `axiosInstance` module for the cheaper service/hook unit tests.
- **No source changes to make a test pass.** If a test reveals a real bug, stop and report
  it — do not "fix" the product under cover of a test. (Same rule as `app-logic`.)

## 3. Tooling & scaffolding (Phase 0)

Add to `packages/admin-shell`:

- **Dev deps:** `vitest`, `@vitest/coverage-v8`, `jsdom` (or `happy-dom`),
  `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`,
  `@testing-library/dom`. For Phase 4 only: `msw`.
- **`vitest.config.ts`** with two projects:
  - `unit` — `environment: 'node'`, `include: ['tests/unit/**/*.test.ts']`. Pure logic.
  - `dom` — `environment: 'jsdom'`, `include: ['tests/dom/**/*.test.{ts,tsx}']`,
    `setupFiles: ['tests/_setup/jsdom.setup.ts']`.
  - Root-level coverage with `all: true`, `include: ['src/**/*.{ts,tsx}']`,
    `exclude: ['src/**/*.d.ts', 'src/**/index.ts', 'src/types/**', 'src/harness/**']`.
    Thresholds start low and ratchet up (Phase 6).
- **`tests/_setup/jsdom.setup.ts`** — `import '@testing-library/jest-dom/vitest'`; stub
  `window.matchMedia` and `ResizeObserver` (Mantine/reactflow need them).
- **`tests/_helpers/`**:
  - `render.tsx` — `renderWithProviders` wrapping `MantineProvider` + fresh
    `QueryClientProvider` (retries off) + `<MemoryRouter>`.
  - `axios-mock.ts` — helper to `vi.mock('../src/api/axiosInstance.js')` and queue
    responses; reset in `beforeEach`.
  - `fixtures/` — builders for `FlowDefinition`, `StepInstance`, execution records, the
    `AllmaStepNode`/`AllmaTransitionEdge` graph shapes, and `AdminApiResponse<T>` envelopes
    (success + error).
- **npm scripts:**
  - `test` → both projects (the CI gate / default).
  - `test:unit`, `test:dom`, `test:coverage`, `test:watch`.
- **ESLint:** ensure the flat config lints `tests/**` (or carves out test globals); keep
  ES-module `.js` extensions on relative imports, matching the rest of the repo.
- **`turbo.json`** already declares `coverage/**` as a `test` output — no change needed.
- **CI:** add `admin-shell` to the PR test matrix (it currently runs no tests).

## 4. Phased coverage targets

### Phase 1 — Pure logic, no DOM (highest ROI; do this first)
Unit tests under `tests/unit/`, `node` env, little/no mocking:

- **`utils/formatters.ts`** — `formatPreciseDuration` boundary table (`null`/negative/`<1s`/
  seconds/minutes/hours), plus any relative-time/byte formatters.
- **`features/executions/utils.tsx`** — `getStatusColor` / `getStatusIcon` for every status
  + the unknown-status fallback.
- **`features/shared/step-form/form-utils.ts`** — `getDefaultsFromShape` across every Zod
  type branch (`ZodDefault`, string/effects, object/record, array, enum/number/boolean →
  `null`).
- **`features/flows/editor/zod-schema-mappers.ts`** — schema selection per `StepType`,
  round-trip mapping, and the unknown/unmapped fallback (153 lines, table-driven).
- **`features/shared/step-form/moduleOptions.ts`** and feature `constants.ts` — option/label
  derivation where it carries logic.

**Exit:** ~85%+ line coverage on these files.

### Phase 2 — The flow-editor Zustand store (high ROI, still no DOM)
`useFlowEditorStore.ts` is 599 lines of the most important client logic and is testable
**without React** — call actions on `useFlowEditorStore.getState()` and assert the next
state. Reset the store in `beforeEach`. Cover:
- `onNodesChange` / `onEdgesChange` (selection, position, removal) and dirty-state flips.
- `onConnect` — valid connection creates an edge; invalid/self/duplicate is rejected.
- `addNode`, `deleteNodes`, `onNodesDelete` — and cascade deletion of attached edges.
- `updateNodeConfig`, `updateEdgeCondition`, `updateEdgeHandles`, `setStartNode`,
  `updateFlowProperties`, `deselectAll`, `clearDirtyState`.
- Parallel-branch invariants where the store enforces them.

**Exit:** ~80%+ line coverage on the store.

### Phase 3 — Graph / layout utilities
`features/flows/editor/flow-utils.ts` (219 lines): `findBranchSteps`, node/edge
construction from a `FlowDefinition`, and the Dagre layout pass. Assert **structure**
(nodes/edges produced, branch grouping, parent/child wiring), not pixel geometry. Feed it
fixture flow definitions (linear, conditional, parallel-fork). Also cover
`step-configs.ts` / `step-documentation.ts` where they map types → config.

### Phase 4 — API service layer + React Query hooks (`jsdom`)
One spec per service under `tests/dom/api/`. Mock the single `axiosInstance` module; for
hooks use `renderHook` with the `QueryClientProvider` wrapper. Per service assert:
- **Request shape** — correct method, the versioned route
  (`/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.*}`), query params, and body.
- **Envelope unwrapping** — `success:true` → `data`; `success:false`/`error` → thrown
  `Error` with the server message.
- **Side effects** — success/error Mantine `notifications`, and query invalidation /
  navigation on mutations.

Services: `flowService`, `flowControlService`, `executionService`, `promptTemplateService`,
`agentService`, `mcpConnectionService`, `stepDefinitionService`, `systemToolsService`,
`dashboardService`, `importExportService`, and `axiosInstance` (auth-header/interceptor
behavior). The shared envelope/notification logic should be covered once and reused.

### Phase 5 — Selective component tests (`jsdom` + `renderWithProviders`)
Render only **behavior-bearing** components; skip pure presentational shells. Priorities:
- **`components/ErrorBoundary.tsx`** — renders fallback on a thrown child; recovers on reset.
- **Forms** — `AgentForm`, `PromptForm`, `McpConnectionForm`, `FlowSettingsForm`,
  `shared/step-form/StepConfigurationForm`: validation errors, controlled values, submit
  payload shape (driven by `@mantine/form` + Zod).
- **Tables/modals with logic** — `ExecutionsTable`, `ContextDiffModal`,
  `StatefulRedriveModal`, `ImportModal`/`ExportModal`: filtering, row actions, diff
  rendering, file in/out.
- **Shell composition** — `createAllmaAdminApp` assembles routes/nav from a stub
  `AllmaPlugin`; assert the plugin contract (routes, nav items, app wrappers, header
  widgets) is honored. This protects the package's public API.

### Phase 6 — Ratchet & guardrails (ongoing)
- Raise coverage thresholds incrementally; fail CI on regression (mirrors `app-logic`
  Phase 5).
- Document conventions in `tests/README.md`.
- Optional thin **integration** layer: a few full-page flows behind MSW (load list → open
  detail → submit), gated/nightly — never blocking PRs on network shape.

## 5. Conventions (enforced as tests are written)

- **One test file per source module**, mirroring `src/` under `tests/unit/` or `tests/dom/`.
- **ES Modules**, `.js` extension on relative imports; **kebab-case** test file names.
- **Pure logic lives in the `unit` (node) project**; anything touching React/DOM lives in
  the `dom` (jsdom) project. Don't pull jsdom into pure-logic tests.
- **Zustand store**: test via `getState()` actions + `setState` reset in `beforeEach`; never
  render a component just to exercise store logic.
- **API**: mock the single `axiosInstance` module (or MSW for page tests) — never real
  network. Assert the route constants from `@allma/core-types`, not hardcoded strings.
- **Components**: always go through `renderWithProviders`; query by role/label
  (`@testing-library` user-centric queries), drive interaction with `user-event`.
- **Test behavior and contracts, not implementation** — props in / rendered output /
  emitted requests, not internal call counts.
- **No source changes to make a test pass.** Real bug → stop and report.

## 6. Effort & sequencing (suggested)

| Phase | Surface | Rel. effort | Why first/last |
| --- | --- | --- | --- |
| 0 | Tooling/scaffold | S | Unblocks everything; small delta on existing monorepo tooling. |
| 1 | Pure utils | S | Fast wins, no mocking, immediate coverage. |
| 2 | Zustand store | M | Highest-value client logic; still no DOM. |
| 3 | Graph utils | M | Pure-ish; needs flow fixtures. |
| 4 | API + hooks | M | Protects the service contract; one mock seam. |
| 5 | Components | L | Real value but slowest; do after the cheap layers land. |
| 6 | Ratchet/MSW | ongoing | Locks in gains; guards against regression. |

Phases 0–4 are achievable as a focused first push and deliver the bulk of the value
(client logic + API contract) before paying the component-render tax in Phase 5.
