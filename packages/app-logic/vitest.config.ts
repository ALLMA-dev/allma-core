import { defineConfig } from 'vitest/config';

/**
 * Root config. Holds shared options and the (root-level) coverage config; the actual
 * project split lives in vitest.workspace.ts. Coverage thresholds start deliberately low
 * and are ratcheted up as modules gain tests (see TEST_PLAN.md, Phase 5).
 */
export default defineConfig({
  test: {
    clearMocks: true,
    env: Object.fromEntries(
      Object.entries(process.env)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, v as string])
    ),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts', 'src/types/**'],
      // Measure the whole src tree (not just imported files) so coverage reflects real
      // progress across the codebase. Thresholds start low and ratchet up (TEST_PLAN Phase 5).
      all: true,
      // Global floors — ratcheted up as each module gains tests (TEST_PLAN Phase 5).
      thresholds: {
        lines: 14,
        functions: 36,
        statements: 14,
        branches: 72,
      },
    },
  },
});
