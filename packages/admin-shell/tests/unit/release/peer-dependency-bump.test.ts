import { fileURLToPath } from 'node:url';
import assembleReleasePlan from '@changesets/assemble-release-plan';
import { read } from '@changesets/config';
import { getPackages } from '@manypkg/get-packages';
import semver from 'semver';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../../../', import.meta.url));

async function planCoreTypesBump(type: 'minor' | 'major') {
  const packages = await getPackages(repoRoot);
  const config = await read(repoRoot, packages);
  const plan = assembleReleasePlan(
    [{ id: 'peer-test', summary: '', releases: [{ name: '@allma/core-types', type }] }],
    packages,
    config,
    undefined,
    undefined,
  );
  const find = (name: string) => plan.releases.find((r) => r.name === name);
  const adminShell = packages.packages.find((p) => p.packageJson.name === '@allma/admin-shell')!;
  return { coreTypes: find('@allma/core-types')!, adminShell: find('@allma/admin-shell'), adminShellPkg: adminShell.packageJson };
}

describe('@allma/admin-shell peer dependency on @allma/core-types', () => {
  it('does not bump admin-shell major on a core-types minor', async () => {
    const { adminShell, adminShellPkg } = await planCoreTypesBump('minor');
    expect(adminShell?.type).not.toBe('major');
    if (adminShell) expect(semver.major(adminShell.newVersion)).toBe(semver.major(adminShellPkg.version));
  });

  it('bumps admin-shell major on a core-types major', async () => {
    const { adminShell } = await planCoreTypesBump('major');
    expect(adminShell?.type).toBe('major');
  });

  it('declares a peer range that accepts the next core-types minor', async () => {
    const { coreTypes, adminShellPkg } = await planCoreTypesBump('minor');
    expect(semver.satisfies(coreTypes.newVersion, adminShellPkg.peerDependencies!['@allma/core-types'])).toBe(true);
  });
});
