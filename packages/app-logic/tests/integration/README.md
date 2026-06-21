# Testing strategy for `allma-app-logic`

This package uses a **three-layer test pyramid** (see [`../../TEST_PLAN.md`](../../TEST_PLAN.md)).
Everything runs on **Vitest** — there is no Jest config. The two Vitest projects are declared in
[`../../vitest.workspace.ts`](../../vitest.workspace.ts); coverage is configured once at the root
in [`../../vitest.config.ts`](../../vitest.config.ts).

| Layer | Location | AWS | When it runs |
| --- | --- | --- | --- |
| **1. Unit (hermetic)** | `tests/unit/**` | Stubbed with [`aws-sdk-client-mock`](https://github.com/m-radzikowski/aws-sdk-client-mock) | Every PR (the CI gate) |
| **2. Orchestration (hermetic)** | `tests/unit/allma-flows/iterative-step-processor/**` | Stubbed; flow definitions come from in-memory fixtures (`config-loader` mocked) | Every PR (the CI gate) |
| **3. Live smoke (opt-in)** | `tests/integration/**` | **Real** DynamoDB + S3 in the `dev` stage | On demand / nightly, only when `RUN_LIVE_AWS=1` |

The first two layers are the same Vitest project (`unit`) and **never touch live AWS** — AWS
clients are module-scope singletons, so they are intercepted at the client `send` layer with
`aws-sdk-client-mock`. The orchestration loop is exercised end-to-end by loading flow definitions
from in-memory fixtures (`config-loader` is mocked) instead of reading DynamoDB. This is where the
bulk of behavior (transitions, retries/fallbacks, parallel fork/aggregate, async wait/poll/resume,
S3 offload/hydrate, finalization) is verified — hermetically.

## Layer 3 — the live smoke layer

`tests/integration/orchestration/live-smoke.test.ts` keeps a **thin set of high-value
round-trips** that the hermetic layers cannot prove: that the real AWS SDK calls actually work
against deployed infrastructure. It deliberately stays small because every scenario is already
covered hermetically in layer 1/2.

Current smoke tests:

1. **Linear flow** — loads a flow definition from the live config table and runs it to
   `COMPLETED` with the real system step handlers.
2. **S3 offload + hydrate round-trip** — a step with `forceS3Offload` writes its output to S3
   (`PutObject`); a downstream step reads the pointer path, forcing the loop to hydrate it from S3
   (`GetObject`). Proves the real offload/hydrate path.
3. **Parallel fork preparation** — loads a real flow definition and has the in-memory fork manager
   emit one branch payload per item.

The only thing stubbed in this layer is the **execution-logger client**, which writes traces by
invoking a *separate* Lambda that is not part of the round-trip under test. DynamoDB, S3, and the
system step handlers all run for real.

### How to run each layer

```bash
# Layers 1 + 2 — hermetic, no AWS. The default CI gate.
npm -w allma-app-logic test            # alias: test:unit
npm -w allma-app-logic run test:coverage

# Layer 3 — live smoke. Requires AWS credentials for the dev account.
RUN_LIVE_AWS=1 npm -w allma-app-logic run test:integration
```

When `RUN_LIVE_AWS` is unset the `integration` project collects **zero** files, and
`test:integration` passes via `--passWithNoTests`. This is why the live layer can never break PR
CI: it is simply not collected unless you opt in.

### Prerequisites for the live layer

- The `dev` stage of the platform stack must be deployed (the resource names are read from the CDK
  default config by [`setup.mjs`](./setup.mjs) and injected as env vars).
- Your shell must have AWS credentials with access to the `dev` account and an `AWS_REGION` set.

### Test data lifecycle

Each smoke test creates its own flow definition via `setupFlowInDB` (see
[`orchestration/_test-helpers.ts`](./orchestration/_test-helpers.ts)), tracks it, and deletes it in
an `afterAll` hook (`cleanupAllTestFlows`). Tests are independent and rerunnable.

## Adding tests

- **Default to a hermetic test** under `tests/unit/**`, mirroring the `src/` layout. Stub AWS with
  `aws-sdk-client-mock` only — no bespoke `vi.mock` factories for AWS clients. Assert behavior and
  the error taxonomy (`RetryableStepError`/`TransientStepError` vs `PermanentStepError`/`Error`,
  `ContentBasedRetryableError` for malformed LLM JSON), not implementation details.
- **Add a live smoke test only** when a scenario genuinely needs to prove a real AWS round-trip
  that the hermetic layers cannot. Keep this layer thin and gate it behind `RUN_LIVE_AWS=1`.
