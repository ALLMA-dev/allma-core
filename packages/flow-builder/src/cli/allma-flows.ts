#!/usr/bin/env node
/**
 * `allma-flows` CLI.
 *
 *   allma-flows build "<glob>" --out <dir> [--exported-at <iso>]
 *       Compile TS flow modules to deterministic *.flow.json.
 *   allma-flows check "<glob>" [--out <dir>] [--known <glob>] [--remote <baseUrl>]
 *       Validate (strict gate + deploy parity + cross-artifact resolution); when
 *       --out is given, fail on drift between the TS source and committed JSON; when
 *       --remote is given, fail if a code-owned flow's deployed copy was last
 *       modified in the editor (bearer token from ALLMA_ADMIN_TOKEN).
 *   allma-flows eject <flowId> --from "<glob>" [--out <dir>]
 *       Generate a `.flow.ts` builder source from a committed/deployed flow JSON
 *       (adoption / one-way ownership transfer). Writes to --out or stdout.
 *
 * Flow modules must `export default defineFlow(...).<wired builder>`. Run under a
 * TypeScript loader (e.g. `tsx`) when pointing at `.flow.ts` sources.
 */
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FlowBuilder } from '../define-flow.js';
import { buildArtifacts, checkArtifacts, harvestCatalogIds } from './commands.js';
import type { Catalog } from '../catalog.js';
import { ejectFlow } from '../eject.js';
import { detectDrift, type DeployedFlow, type LocalCodeFlow } from '../drift.js';
import { ALLMA_ADMIN_API_VERSION, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';
import type { FlowAuthoringFormat } from '@allma/core-types';

/**
 * Builds a `fetchDeployed` adapter that reads a flow version from the admin API.
 * Auth is a bearer token from `ALLMA_ADMIN_TOKEN` (no service-account auth exists
 * yet; a human admin token is used for CI). Returns `null` on 404 (not deployed).
 */
function makeRemoteFetcher(baseUrl: string, token: string | undefined) {
  const root = baseUrl.replace(/\/$/, '');
  return async (flowId: string, version: number): Promise<DeployedFlow | null> => {
    const url = `${root}/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.FLOW_VERSION_DETAIL(flowId, version)}`;
    const res = await fetch(url, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`admin API ${res.status} fetching ${flowId} v${version} from ${url}`);
    const body = (await res.json()) as { success?: boolean; data?: DeployedFlow } | DeployedFlow;
    // Unwrap the AdminApiResponse envelope when present.
    if (body && typeof body === 'object' && 'data' in body && (body as { data?: DeployedFlow }).data) {
      return (body as { data: DeployedFlow }).data;
    }
    return body as DeployedFlow;
  };
}

interface ParsedArgs {
  command: string | undefined;
  pattern: string | undefined;
  flags: Record<string, string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, pattern, ...rest] = argv;
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = 'true';
      }
    }
  }
  return { command, pattern, flags };
}

/** Minimal glob: resolves the non-wildcard base dir and matches by trailing suffix. */
async function findFiles(pattern: string): Promise<string[]> {
  const starIndex = pattern.indexOf('*');
  const base = starIndex === -1 ? dirname(pattern) : dirname(pattern.slice(0, starIndex) || '.');
  const suffix = starIndex === -1 ? pattern : pattern.slice(pattern.lastIndexOf('*') + 1);
  const baseDir = resolve(base || '.');

  const out: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        await walk(full);
      } else if (full.endsWith(suffix)) {
        out.push(full);
      }
    }
  };
  await walk(baseDir);
  return out.sort();
}

async function loadBuilders(files: string[]): Promise<FlowBuilder[]> {
  const builders: FlowBuilder[] = [];
  for (const file of files) {
    const mod = (await import(pathToFileURL(file).href)) as { default?: FlowBuilder };
    if (!mod.default || typeof mod.default.toExport !== 'function') {
      throw new Error(`${file} does not 'export default' a flow builder (defineFlow(...)).`);
    }
    builders.push(mod.default);
  }
  return builders;
}

async function loadKnownCatalog(pattern: string | undefined): Promise<Partial<Catalog>> {
  const catalog: Catalog = { flowIds: new Set(), promptTemplateIds: new Set(), stepDefinitionIds: new Set() };
  if (!pattern) return catalog;
  for (const file of await findFiles(pattern)) {
    if (!file.endsWith('.json')) continue;
    try {
      harvestCatalogIds(JSON.parse(await readFile(file, 'utf8')), catalog);
    } catch {
      // Ignore unreadable/non-JSON files.
    }
  }
  return catalog;
}

async function runBuild(args: ParsedArgs): Promise<number> {
  if (!args.pattern || !args.flags.out) {
    console.error('Usage: allma-flows build "<glob>" --out <dir> [--exported-at <iso>]');
    return 2;
  }
  const files = await findFiles(args.pattern);
  if (files.length === 0) {
    console.error(`No flow files matched '${args.pattern}'.`);
    return 1;
  }
  const builders = await loadBuilders(files);
  const artifacts = buildArtifacts(builders, args.flags['exported-at']);
  const outDir = resolve(args.flags.out);
  await mkdir(outDir, { recursive: true });
  for (const artifact of artifacts) {
    await writeFile(join(outDir, artifact.fileName), artifact.json, 'utf8');
    console.log(`✓ ${artifact.fileName}`);
  }
  console.log(`Built ${artifacts.length} flow(s) to ${outDir}.`);
  return 0;
}

async function runCheck(args: ParsedArgs): Promise<number> {
  if (!args.pattern) {
    console.error('Usage: allma-flows check "<glob>" [--out <dir>] [--known <glob>] [--remote <baseUrl>]');
    return 2;
  }
  const files = await findFiles(args.pattern);
  if (files.length === 0) {
    console.error(`No flow files matched '${args.pattern}'.`);
    return 1;
  }
  const builders = await loadBuilders(files);
  const known = await loadKnownCatalog(args.flags.known);
  const { validationIssues, resolutionIssues } = checkArtifacts(builders, known);

  let failed = false;
  for (const issue of validationIssues) {
    console.error(`✗ validation: ${issue}`);
    failed = true;
  }
  for (const issue of resolutionIssues) {
    console.error(`✗ unresolved: [${issue.flowId}] ${issue.message}`);
    failed = true;
  }

  // Out-of-band drift guard: compare each code-owned flow against the deployed copy.
  if (args.flags.remote) {
    const local: LocalCodeFlow[] = builders.map((builder) => {
      const flow = (builder.toExport().flows ?? [])[0] as FlowAuthoringFormat;
      return { flowId: flow.id, version: flow.version, flow };
    });
    const fetchDeployed = makeRemoteFetcher(args.flags.remote, process.env.ALLMA_ADMIN_TOKEN);
    try {
      for (const issue of await detectDrift(local, fetchDeployed)) {
        console.error(`✗ drift (${issue.reason}): [${issue.flowId}] ${issue.message}`);
        failed = true;
      }
    } catch (error) {
      console.error(`✗ drift: ${error instanceof Error ? error.message : String(error)}`);
      failed = true;
    }
  }

  // Drift check: when --out is given, regenerated JSON must equal committed JSON.
  if (args.flags.out) {
    const outDir = resolve(args.flags.out);
    for (const artifact of buildArtifacts(builders, args.flags['exported-at'])) {
      const target = join(outDir, artifact.fileName);
      let committed: string | undefined;
      try {
        if ((await stat(target)).isFile()) committed = await readFile(target, 'utf8');
      } catch {
        committed = undefined;
      }
      if (committed === undefined) {
        console.error(`✗ drift: ${artifact.fileName} has no committed JSON in ${outDir} (run build).`);
        failed = true;
      } else if (committed !== artifact.json) {
        console.error(`✗ drift: ${artifact.fileName} is out of date (run build and commit).`);
        failed = true;
      }
    }
  }

  if (failed) return 1;
  console.log(`✓ ${builders.length} flow(s) valid.`);
  return 0;
}

/** Loads every flow object found in the JSON files matching `pattern`. */
async function loadFlowsFromJson(pattern: string): Promise<FlowAuthoringFormat[]> {
  const flows: FlowAuthoringFormat[] = [];
  for (const file of await findFiles(pattern)) {
    if (!file.endsWith('.json')) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(file, 'utf8'));
    } catch {
      continue; // skip unreadable/non-JSON files
    }
    const data = parsed as { flows?: FlowAuthoringFormat[] } & Partial<FlowAuthoringFormat>;
    if (Array.isArray(data.flows)) {
      flows.push(...data.flows);
    } else if (typeof data.id === 'string' && data.steps) {
      flows.push(data as FlowAuthoringFormat);
    }
  }
  return flows;
}

async function runEject(args: ParsedArgs): Promise<number> {
  // For eject, the positional `pattern` slot is the flowId; the source glob is --from.
  const flowId = args.pattern;
  const from = args.flags.from;
  if (!flowId || !from) {
    console.error('Usage: allma-flows eject <flowId> --from "<glob>" [--out <dir>]');
    return 2;
  }
  const flows = await loadFlowsFromJson(from);
  const flow = flows.find((f) => f.id === flowId);
  if (!flow) {
    console.error(`No flow with id '${flowId}' found in JSON matching '${from}'.`);
    return 1;
  }
  const source = ejectFlow(flow);
  if (args.flags.out) {
    const outDir = resolve(args.flags.out);
    await mkdir(outDir, { recursive: true });
    const target = join(outDir, `${flowId}.flow.ts`);
    await writeFile(target, source, 'utf8');
    console.log(`✓ ${flowId}.flow.ts`);
    console.log(`Ejected '${flowId}' to ${target}.`);
  } else {
    process.stdout.write(source);
  }
  return 0;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case 'build':
      return runBuild(args);
    case 'check':
      return runCheck(args);
    case 'eject':
      return runEject(args);
    default:
      console.error('Usage: allma-flows <build|check|eject> "<glob>" [options]');
      return 2;
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
