import { defineWorkspace } from 'vitest/config';

/**
 * Two-project layout (see TEST_PLAN.md):
 *  - `unit`        — hermetic. Runs on every PR. No globalSetup; AWS is stubbed via
 *                    aws-sdk-client-mock. This is the default CI gate.
 *  - `integration` — thin, opt-in live-AWS layer. Collected only when RUN_LIVE_AWS=1,
 *                    otherwise it contributes zero tests so it can never break PR CI.
 *
 * Coverage is configured at the root (vitest.config.ts) because Vitest does not honour
 * per-project coverage options.
 */
const runLiveAws = process.env.RUN_LIVE_AWS === '1';

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['tests/unit/**/*.test.ts'],
      setupFiles: ['./tests/unit/_helpers/vitest.setup.ts'],
      clearMocks: true,
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'integration',
      // When RUN_LIVE_AWS is unset the project collects nothing; the `test:integration` script
      // passes `--passWithNoTests` so it exits cleanly and can never break PR CI. Set
      // RUN_LIVE_AWS=1 to run the live round-trip layer.
      include: runLiveAws ? ['tests/integration/**/*.test.ts'] : [],
      globalSetup: ['./tests/integration/setup.mjs'],
      testTimeout: 30000,
      clearMocks: true,
    },
  },
]);
