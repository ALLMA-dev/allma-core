import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const projectDir = join(here, '..');

/**
 * Type-level test for the opt-in typed-context generic: compiles the
 * `*.typetest.ts` fixtures under a dedicated tsconfig. The fixtures use
 * `@ts-expect-error` on every bad context path, so `tsc` passes only when each
 * typo is still caught — a regression in {@link flowContext}'s path typing turns
 * an unused directive into an error and fails this test.
 */
describe('typed-context type-test', () => {
  it('catches context-path typos at compile time', () => {
    const result = spawnSync(
      'npx',
      ['tsc', '-p', join(projectDir, 'tsconfig.typetest.json')],
      { cwd: projectDir, encoding: 'utf8' },
    );
    expect(`${result.stdout ?? ''}${result.stderr ?? ''}`).toBe('');
    expect(result.status).toBe(0);
  }, 60_000);
});
