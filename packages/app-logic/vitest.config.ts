import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./tests/integration/setup.mjs'],
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    clearMocks: true,
    alias: {
    },
  },
});