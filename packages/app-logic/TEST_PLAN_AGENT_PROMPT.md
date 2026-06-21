# SDE Agent Kickoff — Allma Core test coverage

You are implementing the test-coverage initiative for **Allma Core** (`packages/app-logic`).

## Read first (required)
1. `/AGENTS.md` — repository boundaries and the mandatory coding-style guide. You work
   **only** in `packages/app-logic`. Do not touch `examples/*`, and do not change platform
   behavior to make a test pass — fix the test or report the bug.
2. `packages/app-logic/TEST_PLAN.md` — the authoritative plan. Follow its phases, layering
   (hermetic-by-default), tooling choices, and conventions exactly.

## Ground rules
- **Branch:** create `test/app-logic-coverage` off the latest `main` before starting.
- **Hermetic only:** unit + orchestration tests must not touch live AWS. Mock AWS via
  `aws-sdk-client-mock` (clients are module-scope singletons — no DI). Never add bespoke
  `vi.mock` AWS factories.
- **One step = one commit.** Keep each commit small, green, and self-contained. Run
  `npm run lint` and the unit tests for `app-logic` before every commit; do not commit red.
- **Conventional commits**, `test(app-logic): ...` scope (matches repo history). Commit the
  test files plus only the config/deps that step needs.
- **No source changes** unless a test reveals a genuine bug — if so, stop and report it
  rather than silently editing platform code.
- ES Modules, `.js` extensions on relative imports, kebab-case files, mirror `src/` layout
  under `tests/unit/`.

## Progress tracking
- Use the task tool to create one task per step below; mark `in_progress` when you start a
  step and `completed` when its commit lands.
- After each commit, post a one-line status: step name, commit sha, files added, current
  `app-logic` coverage %.

## Steps (each is its own commit)

**Step 1 — Phase 0 foundation.**
- Add dev deps to `packages/app-logic`: `aws-sdk-client-mock`, `aws-sdk-client-mock-vitest`,
  `@vitest/coverage-v8`.
- Restructure tests into `tests/unit/**` and `tests/integration/**` (move existing
  integration tests under `tests/integration/`, unchanged for now).
- Update `vitest.config.ts` to two projects: `unit` (include `tests/unit/**`, no
  globalSetup, coverage on with low initial thresholds) and `integration` (existing
  `setup.mjs`, gated by `RUN_LIVE_AWS=1`).
- npm scripts: `test` → unit only; `test:integration`; `test:coverage`; `test:watch`.
- Add `tests/unit/_helpers/` (aws-mock reset helper, context + FlowDefinition fixture
  builders, fake structured logger).
- Verify `npm test` runs the (currently empty) unit project green and
  `RUN_LIVE_AWS` correctly excludes integration. Commit.

**Step 2 onward — Phase 1, one module per commit, in this order:**
`data-mapper.ts` → `utils/condition-evaluator.ts` →
`utils/template-renderer.ts` + `template-service.ts` →
`data-transformers/*` (may group as one commit) →
`iterative-step-processor/{transition-resolver,transition-limits,error-handler}.ts` →
`security-validator.ts`.

Aim for ~80%+ line coverage on each Phase 1 file before moving on. Stop after Phase 1 and
report a coverage summary; do not start Phase 2 (handlers) until the Phase 1 work is
reviewed.

## Definition of done for this run
Phase 0 committed and green; all Phase 1 modules covered with passing hermetic unit tests,
each in its own commit on `test/app-logic-coverage`, with a final coverage summary.
