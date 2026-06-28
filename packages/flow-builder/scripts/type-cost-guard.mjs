#!/usr/bin/env node
/**
 * CI type-cost guard (RFC §9). Runs `tsc --extendedDiagnostics` over the package
 * and fails if the type-instantiation or type count blows past a budget — the
 * early-warning signal that a schema change reintroduced the TS7056-class
 * inference explosion this package is designed to avoid (per-leaf derivation,
 * hand-written heavy types).
 *
 * Budgets are intentionally generous (several × the healthy baseline of ~105k
 * instantiations / ~30k types) so they only trip on a genuine regression, not
 * normal growth. Override via env for local experimentation.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const MAX_INSTANTIATIONS = Number(process.env.TYPE_COST_MAX_INSTANTIATIONS ?? 400_000);
const MAX_TYPES = Number(process.env.TYPE_COST_MAX_TYPES ?? 120_000);

const here = dirname(fileURLToPath(import.meta.url));
const projectDir = join(here, '..');

const result = spawnSync(
  'npx',
  ['tsc', '-p', join(projectDir, 'tsconfig.typecheck.json'), '--extendedDiagnostics'],
  { cwd: projectDir, encoding: 'utf8' },
);

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

if (result.status !== 0) {
  console.error('type-cost-guard: tsc reported errors:\n' + output);
  process.exit(1);
}

const read = (label) => {
  const match = output.match(new RegExp(`${label}:\\s*(\\d+)`));
  return match ? Number(match[1]) : NaN;
};

const instantiations = read('Instantiations');
const types = read('Types');

if (Number.isNaN(instantiations) || Number.isNaN(types)) {
  console.error('type-cost-guard: could not parse tsc diagnostics:\n' + output);
  process.exit(1);
}

console.log(`type-cost-guard: Instantiations=${instantiations} (max ${MAX_INSTANTIATIONS}), Types=${types} (max ${MAX_TYPES})`);

let failed = false;
if (instantiations > MAX_INSTANTIATIONS) {
  console.error(`type-cost-guard: FAIL — Instantiations ${instantiations} exceeds budget ${MAX_INSTANTIATIONS}. A schema/type change likely reintroduced the union-wide inference blow-up (TS7056). Derive factory types per-leaf and hand-write heavy public types.`);
  failed = true;
}
if (types > MAX_TYPES) {
  console.error(`type-cost-guard: FAIL — Types ${types} exceeds budget ${MAX_TYPES}.`);
  failed = true;
}

process.exit(failed ? 1 : 0);
