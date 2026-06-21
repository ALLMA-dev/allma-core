import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Root config for `@allma/admin-shell`. Holds shared options and the (root-level) coverage
 * config; the project split (unit/node vs dom/jsdom) lives in vitest.workspace.ts.
 *
 * Coverage is configured here because Vitest does not honour per-project coverage options.
 * Thresholds start deliberately low and are ratcheted up as modules gain tests
 * (see TEST_PLAN.md, Phase 6).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/types/**',
        'src/harness/**',
      ],
      // Measure the whole src tree (not just imported files) so coverage reflects real
      // progress across the codebase. Thresholds start low and ratchet up (TEST_PLAN Phase 6).
      all: true,
      // Floors sit just under the current actuals — raise them as each phase lands
      // (TEST_PLAN Phase 6). Whole-src denominator, so absolutes are low while individual
      // covered modules sit at ~96-100%.
      thresholds: {
        lines: 12,
        functions: 30,
        statements: 12,
        branches: 62,
      },
    },
  },
});
