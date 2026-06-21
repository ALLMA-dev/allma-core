# `@allma/admin-shell` test conventions & guardrails

Working guide for writing tests in this package. The full rationale and phase plan live in
[`../TEST_PLAN.md`](../TEST_PLAN.md).

## Layout

```
tests/
├── _setup/                   # jsdom setup (matchMedia / ResizeObserver stubs, jest-dom matchers)
├── _helpers/                 # fixtures + (later) render wrapper, axios mock
│   └── fixtures/             # flow-editor node/edge/flow builders, API envelope builders
├── unit/                     # hermetic, `node` env. Pure logic — mirrors src/ one file per module.
└── dom/                      # `jsdom` env. React hooks + component tests.
```

Two Vitest projects ([`../vitest.workspace.ts`](../vitest.workspace.ts)):
- **`unit`** — `node` environment, no DOM. The bulk of the suite (store, mappers, utils).
  `npm run test:unit`.
- **`dom`** — `jsdom` environment with the shared setup file. API hooks + components.
  `npm run test:dom`.
- `npm test` runs both; `npm run test:coverage` runs the gate.

## Conventions

- **One test file per source module**, mirroring the `src/` path under `tests/unit/` or
  `tests/dom/`.
- **ES Modules**, `.js` extension on relative imports (matches source and Node ESM);
  **kebab-case**/source-matching file names.
- **Put pure logic in the `unit` (node) project.** Only pull jsdom in (`dom` project) when a
  test actually renders React or uses the DOM. reactflow's pure helpers (`addEdge`,
  `applyNodeChanges`) import fine under `node`, so the flow-editor store is a `unit` test.
- **Zustand store** (`useFlowEditorStore`): drive it through `getState().<action>(…)` and
  assert the next state. Reset the data slice in `beforeEach` with
  `store.setState({ flowDefinition: null, nodes: [], edges: [], isDirty: false })` — the
  action functions are stable singletons, so never re-create the store.
- **API layer**: mock the single `axiosInstance` module (or MSW for page tests) — never real
  network. Assert the route constants from `@allma/core-types`, not hardcoded strings, and
  the `AdminApiResponse` envelope unwrapping (`success` → `data`; `error` → thrown).
- **Components**: render through the shared `renderWithProviders` (Mantine + QueryClient +
  MemoryRouter); query by role/label and drive interaction with `@testing-library/user-event`.
- **Test behavior and contracts, not implementation** — state out / rendered output /
  emitted requests, not internal call counts.
- **No source changes to make a test pass.** If a test reveals a real bug, stop and report it.

## Coverage ratchet (Phase 6 guardrail)

Coverage is configured once at the root ([`../vitest.config.ts`](../vitest.config.ts)) with
`all: true`, so the **whole `src/` tree** is the denominator. `index.ts` files, `src/types/**`,
and `src/harness/**` are excluded. Floors sit just under the current actuals and are raised as
each phase lands — they must never regress.
