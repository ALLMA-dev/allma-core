import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../');

describe('deployment invariants', () => {
  it('ensures packages/core-cdk does not contain a dead cdk.json', () => {
    const cdkJsonPath = path.resolve(repoRoot, 'packages/core-cdk/cdk.json');
    expect(fs.existsSync(cdkJsonPath)).toBe(false);
  });

  it('ensures root package.json does not contain deploy:dev script', () => {
    const packageJsonPath = path.resolve(repoRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(packageJson.scripts?.['deploy:dev']).toBeUndefined();
  });

  it('ensures README.md and AGENTS.md document that AllmaStack deployments are consumer-driven', () => {
    const readmeContent = fs.readFileSync(path.resolve(repoRoot, 'README.md'), 'utf8');
    const agentsContent = fs.readFileSync(path.resolve(repoRoot, 'AGENTS.md'), 'utf8');

    expect(readmeContent).toMatch(/consumer/i);
    expect(agentsContent).toMatch(/consumer/i);
    expect(agentsContent).toMatch(/AllmaStack/);
  });
});
