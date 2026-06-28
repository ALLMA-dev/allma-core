import { defineConfig } from 'vitest/config';

/**
 * Hermetic unit tests for the shared types/schemas. No AWS, no globalSetup —
 * these exercise pure Zod schemas and registries.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    clearMocks: true,
  },
});
