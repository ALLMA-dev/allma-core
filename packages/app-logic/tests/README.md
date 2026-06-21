# `allma-app-logic` test conventions & guardrails

This is the working guide for writing and maintaining tests in this package. The full rationale
and phase history live in [`../TEST_PLAN.md`](../TEST_PLAN.md); the live-AWS layer is documented in
[`integration/README.md`](./integration/README.md).

## Layout

```
tests/
├── unit/                     # hermetic — the CI gate. Mirrors src/ one file per module.
│   ├── _helpers/             # fixtures, aws-mock reset helpers, fake logger, vitest setup
│   ├── allma-core/           # pure logic, step handlers, data loaders/savers, adapters
│   └── allma-flows/          # entrypoints + the orchestration engine (hermetic)
└── integration/              # opt-in live-AWS smoke layer (RUN_LIVE_AWS=1)
```

Two Vitest projects ([`../vitest.workspace.ts`](../vitest.workspace.ts)):
- **`unit`** — hermetic, runs on every PR. `npm test` / `npm run test:unit`.
- **`integration`** — collected only when `RUN_LIVE_AWS=1`; otherwise a clean no-op. Never in PR CI.

## Conventions (enforced as tests are written)

- **One test file per source module**, mirroring the `src/` path under `tests/unit/`.
- **ES Modules**, `.js` extension on relative imports (matches source and Node ESM).
- **kebab-case** file names.
- **AWS is stubbed only via [`aws-sdk-client-mock`](https://github.com/m-radzikowski/aws-sdk-client-mock)** —
  never bespoke `vi.mock` factories for AWS clients. AWS clients are module-scope singletons, so
  intercept at the client `send` layer with `mockClient(SomeClient)` and reset in `beforeEach` via
  the helpers in `_helpers/aws-mock.ts`. `vi.mock` is reserved for **non-AWS** collaborators
  (e.g. `config-loader`, the handler registry, the execution-logger client).
  - `lib-dynamodb` calls are intercepted by `mockClient(DynamoDBDocumentClient)`, **not**
    `mockClient(DynamoDBClient)`.
- **Module-scope env vars are read at import** — set them with `vi.hoisted(...)` **before** the SUT
  import.
- **Table-driven cases** where a function has many input/operator permutations.
- **Test behavior and the error taxonomy, not implementation details:**
  - `RetryableStepError` / `TransientStepError` → retryable
  - `PermanentStepError` / plain `Error` → permanent
  - `ContentBasedRetryableError` → malformed LLM JSON
- The transient retry loop uses real `setTimeout` backoff — drive it with `vi.useFakeTimers()` +
  `vi.runAllTimersAsync()`.
- **No source changes to make a test pass.** If a test reveals a real platform bug, stop and report
  it; do not "fix" the platform under cover of a test.

## Coverage ratchet (Phase 5 guardrail)

Coverage is configured once at the root ([`../vitest.config.ts`](../vitest.config.ts)) with
`all: true`, so the **whole `src/` tree** is the denominator — not just imported files. `index.ts`
files and `src/types/**` are excluded.

Current global floors (must never regress):

| Metric | Floor | Achieved |
| --- | --- | --- |
| Lines | 55 | ~55.8 |
| Statements | 55 | ~55.8 |
| Functions | 69 | ~69.2 |
| Branches | 74 | ~74.7 |

Rules for moving the floors:

1. **One module = one commit.** Add the spec for a module, then ratchet floors in the *same* commit
   that crosses the new global.
2. **Ratchet up to just-under the new achieved global** — leave a small margin so unrelated churn
   doesn't trip CI.
3. **Branch % can legitimately drop** when a large, branch-heavy file enters the `all: true`
   denominator before it is fully covered. Set the branch floor just under the new global and say so
   in the commit message — it is not a regression as long as each newly-added file's own lines clear
   ~80%.
4. Run `npm run lint` and `npm test` before **every** commit. Never commit red.

Check per-file gaps with:

```bash
npm -w allma-app-logic run test:coverage
```

## Scope

Phases 1–4 covered the **flow-execution engine** (`allma-core/**` step logic + `allma-flows/**`
entrypoints and orchestration loop). The remaining large uncovered area is **`allma-admin/**`**
(admin services + handlers), currently at 0%. Per `TEST_PLAN.md` this is a **separate initiative**
and is out of scope for the engine coverage work — do not expand into it without agreeing scope
first.
