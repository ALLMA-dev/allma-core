# Allma Core (`allma-app-logic`) — Test Coverage Plan

> Scope: this plan covers **only `packages/app-logic`** (the Allma Core flow-execution
> engine and step logic). Other packages (`core-types`, `core-sdk`, `core-cdk`,
> `admin-shell`, `ui-components`) are a deliberate follow-up and are out of scope here.

## 1. Current state (why this plan exists)

- ~85 source files under `src/`; **7 test files**, all under `tests/integration/`.
- The existing suite is **not hermetic**. Although labelled "integration" and using
  `vi.mock` for some AWS clients/handlers, it loads flow definitions from a **live AWS
  `dev` DynamoDB table** via `tests/integration/orchestration/_test-helpers.ts`
  (`setupFlowInDB`). It therefore **requires deployed infra + AWS credentials** and
  cannot run as a clean PR check.
- Mocking is **ad-hoc and inconsistent** across files; there is no shared convention.
- **Zero unit tests.** The purest, highest-value core logic has no coverage.
- `tests/integration/README.md` is **stale** (references a non-existent Jest config; the
  project actually runs Vitest `^1.2.0`).

### Key architectural constraint
AWS clients are **module-scope singletons** (`const x = new S3Client({})` evaluated at
import time). This rules out dependency-injection-style testing and makes
[`aws-sdk-client-mock`](https://github.com/m-radzikowski/aws-sdk-client-mock) the correct,
uniform tool — it intercepts at the client `send` layer regardless of how the client was
constructed.

## 2. Strategy — a three-layer pyramid, hermetic by default

| Layer | What | AWS | Runs on |
| --- | --- | --- | --- |
| **Unit** (bulk) | Pure logic + handlers/services | `aws-sdk-client-mock` | Every PR |
| **Component / orchestration** | Step processor end-to-end | config-loader + handler registry mocked; AWS stubbed | Every PR |
| **Integration** (thin, opt-in) | Real DynamoDB/S3/SFN round-trips | Live `dev` | Nightly / on demand (`RUN_LIVE_AWS=1`) |

**Decision (agreed):** the orchestration tests are made **hermetic** — flow definitions are
loaded from **in-memory fixtures** by mocking `config-loader`, replacing the live
`setupFlowInDB` dependency. A thin live smoke layer is retained but gated and excluded from
PR CI.

Use **Vitest projects/workspaces** to separate `unit` from `integration` so PR CI runs only
the hermetic layers.

## 3. Tooling & scaffolding (Phase 0)

- Add dev deps: `aws-sdk-client-mock`, `aws-sdk-client-mock-vitest` (matchers),
  `@vitest/coverage-v8`.
- Restructure into `tests/unit/**` and `tests/integration/**`.
- `vitest.config.ts` → two projects:
  - `unit`: `include: ['tests/unit/**/*.test.ts']`, no `globalSetup`, coverage enabled
    with thresholds (start low, ratchet up).
  - `integration`: existing `setup.mjs`, gated behind `RUN_LIVE_AWS=1`.
- npm scripts:
  - `test` → unit project only (the CI gate / default).
  - `test:integration` → integration project (requires `RUN_LIVE_AWS=1`).
  - `test:coverage`, `test:watch`.
- Shared `tests/unit/_helpers/`:
  - `aws-mock.ts` — per-test mock reset helpers.
  - fixture builders for `currentContextData` and `FlowDefinition`.
  - a fake structured logger.
- `turbo.json` already declares `coverage/**` as a `test` output — keep.
- CI: PRs run `npm test` (hermetic only); live integration runs nightly.

## 4. Phased coverage targets

### Phase 1 — Pure core logic (highest ROI; do this first)
Unit tests, little or no mocking:
- `data-mapper.ts` (`getSmartValueByJsonPath`) — path resolution, smart getter,
  S3-pointer hydration (toggle on/off), missing/edge paths, mapping events.
- `utils/condition-evaluator.ts` — every operator, JSONPath-vs-literal RHS, coercion,
  `null`/`undefined`, truthiness, compound `if/else-if/else`, malformed expressions.
- `utils/template-renderer.ts` + `template-service.ts` — Handlebars pass, JSONPath pass,
  nested/recursive rendering, non-string passthrough, missing variables.
- `data-transformers/*` (7 files) — table-driven cases per transformer
  (array-aggregator, compose-object, date-time-calculator, flatten-array, generate-array,
  generate-uuid, join-data).
- `iterative-step-processor/{transition-resolver,transition-limits,error-handler}.ts` —
  transition resolution, transition caps, retry/fallback + content-based-retry
  classification.
- `security-validator.ts`.

**Exit:** ~80%+ line coverage on these files.

### Phase 2 — Step handlers, data-loaders/savers, adapters (`aws-sdk-client-mock`)
One spec per file under `tests/unit/step-handlers/` (and `data-loaders/`, `data-savers/`,
`llm-adapters/`):
- `llm-invocation-handler` (mock adapter registry): JSON output mode, parse success,
  malformed JSON → `ContentBasedRetryableError`, output validators.
- `api-call-handler` (mock `api-executor`), `data-load-handler`, `data-save-handler`,
  `custom-lambda-invoke-handler`, `file-download-handler`, `poll-external-api-handler`,
  `wait-for-external-event-handler`, `mcp-call-handler`, `email/send-email-handler`,
  `noop-handler`, `handler-registry`.
- data-loaders (`dynamodb-loader`, `s3-loader`, `s3-list-files`, `sqs-*`,
  `ddb-query-to-s3-manifest`) and data-savers (`s3-saver`, `sns-publisher`, `sqs-sender`,
  `dynamodb-update-item`, `dynamodb-query-and-update`, `start-flow-execution`).
- Assert the error taxonomy throughout:
  `RetryableStepError`/`TransientStepError` vs `PermanentStepError`/`Error`.

### Phase 3 — Orchestration engine, hermetic
Convert existing integration tests to load flow definitions from in-memory fixtures (mock
`config-loader` instead of `setupFlowInDB`). Preserve current scenario coverage and extend:
- `iterative-step-processor/{index,step-executor,sync-flow-handler,async-handler,parallel-handler,external-step-invoker}.ts`.
- `allma-flows/{finalize-flow,initialize-flow,resume-flow,flow-start-request-listener,api-polling,email-ingress}.ts`.
- Payload offload (`offloadIfLarge` / `hydrateInputFromS3Pointers`) and 256KB-boundary
  behavior.

**Exit:** the full orchestration suite runs hermetically in PR CI — no AWS account needed.

### Phase 4 — Thin live-AWS smoke layer
- Retain 3–5 high-value live round-trip tests under `tests/integration/`, gated by
  `RUN_LIVE_AWS=1`, run nightly.
- Rewrite the stale `tests/integration/README.md` to document the new three-layer model.

### Phase 5 — Ratchet & guardrails (ongoing)
- Raise coverage thresholds incrementally; fail CI on regression.
- Document conventions in `tests/README.md`; add a coverage summary to CI output.

## 5. Existing scenarios to preserve (already covered, keep when converting)
Finalize flow (completion actions, system resume); async steps (wait/poll/resume payload);
parallel processing (in-memory fork, aggregation, `failOnBranchError`, S3-pointer items);
error/retry (fallback, no-fallback failure, content-retry exhaustion, output-validation
failure, security-validation failure, logging bootstrap); linear + conditional transitions;
data handling (S3-pointer input resolution, runtime overrides, `disableS3Offload`); LLM
invocation (string response, JSON mode, malformed-JSON retry).

## 6. Effort & sequencing
- Phase 0: ~½ day. Phase 1: ~2–3 days. Phase 2: ~3–4 days. Phase 3: ~3–4 days.
  Phase 4: ~1 day. Total ≈ 2–2.5 weeks for Core.
- **Start with Phase 1** — most value per hour and it unblocks the rest.

## 7. Conventions (to enforce as tests are written)
- ES Modules, `.js` extensions on relative imports (matches source).
- One test file per source module, mirroring `src/` layout under `tests/unit/`.
- AWS mocked only via `aws-sdk-client-mock` (no bespoke `vi.mock` AWS factories).
- Reset all mocks between tests (`clearMocks` is already on).
- Test behavior and error taxonomy, not implementation details.
