import { defineWorkspace } from 'vitest/config';

/**
 * Two-project layout (see TEST_PLAN.md):
 *  - `unit` — pure logic, `node` environment. No DOM, no React render. The bulk of the
 *             suite (store actions, graph utils, mappers, formatters). Fast; the CI gate.
 *  - `dom`  — anything touching React/DOM: API hooks and component tests. `jsdom`
 *             environment with a shared setup file.
 *
 * Coverage is configured at the root (vitest.config.ts) because Vitest does not honour
 * per-project coverage options.
 */
export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      environment: 'node',
      include: ['tests/unit/**/*.test.{ts,tsx}'],
      clearMocks: true,
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'dom',
      environment: 'jsdom',
      include: ['tests/dom/**/*.test.{ts,tsx}'],
      setupFiles: ['./tests/_setup/jsdom.setup.ts'],
      clearMocks: true,
    },
  },
]);
