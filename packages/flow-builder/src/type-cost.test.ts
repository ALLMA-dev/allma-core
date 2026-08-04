import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(here, '..', 'scripts', 'type-cost-guard.mjs');

/**
 * Ensures the CI type-cost guard runs and passes at the current type complexity —
 * the regression alarm for the TS7056-class inference blow-up (RFC §9).
 */
describe('type-cost guard', () => {
  it('passes within the instantiation/type budget', () => {
    const result = spawnSync('node', [scriptPath], { encoding: 'utf8' });
    expect(result.stdout + result.stderr).toMatch(/Instantiations=\d+/);
    expect(result.status).toBe(0);
  }, 60_000);
});
