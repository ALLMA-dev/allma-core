import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');

describe('deployment invariants', () => {
  it('packages/core-cdk has no dead cdk.json', () => {
    expect(fs.existsSync(path.resolve(repoRoot, 'packages/core-cdk/package.json'))).toBe(true);
    expect(fs.existsSync(path.resolve(repoRoot, 'packages/core-cdk/cdk.json'))).toBe(false);
  });

  it('root package.json has no deploy:dev script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(repoRoot, 'package.json'), 'utf8'));
    expect(pkg.scripts?.['deploy:dev']).toBeUndefined();
  });
});
