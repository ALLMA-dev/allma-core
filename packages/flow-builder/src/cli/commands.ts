import { validateAllmaConfig } from '@allma/core-sdk';
import type { AllmaExportFormat, FlowAuthoringFormat } from '@allma/core-types';
import { ArtifactBuildError, FlowBuildError } from '../validate.js';
import { stableStringify } from '../serialize.js';
import { resolveReferences, type Catalog, type ResolutionIssue } from '../catalog.js';

/**
 * Anything the CLI can compile to a deploy file: a `defineFlow` builder, the
 * `class Flow` facade, or a `define*` artifact handle (prompt / step / MCP). All
 * expose `toExport()` returning an {@link AllmaExportFormat} envelope.
 */
export interface ArtifactExporter {
  toExport(exportedAt?: string): AllmaExportFormat;
}

/** The artifact kinds the builder can emit, with their file-name suffix. */
const ENVELOPE_KINDS = [
  { array: 'flows', suffix: 'flow' },
  { array: 'promptTemplates', suffix: 'prompt' },
  { array: 'stepDefinitions', suffix: 'step' },
  { array: 'mcpConnections', suffix: 'mcp' },
  { array: 'agents', suffix: 'agent' },
] as const;

/** One built artifact ready to be written to disk. */
export interface BuiltArtifact {
  /** The artifact's id. */
  id: string;
  /** Deterministic file name, e.g. `my-flow.flow.json` / `my-prompt.prompt.json`. */
  fileName: string;
  /** Deterministic, byte-stable JSON (AllmaExportFormat envelope). */
  json: string;
}

/** Identifies which artifact array an envelope carries and the single item's id. */
function envelopeInfo(env: AllmaExportFormat): { suffix: string; id: string } {
  for (const { array, suffix } of ENVELOPE_KINDS) {
    const items = (env as unknown as Record<string, { id?: string }[]>)[array];
    if (Array.isArray(items) && items.length > 0) {
      return { suffix, id: items[0].id ?? 'unknown' };
    }
  }
  return { suffix: 'flow', id: 'unknown' };
}

/** Builds every exporter to its deterministic `*.<kind>.json` content. Throws on invalid artifacts. */
export function buildArtifacts(exporters: ArtifactExporter[], exportedAt?: string): BuiltArtifact[] {
  return exporters.map((exporter) => {
    const exported = exporter.toExport(exportedAt);
    const { suffix, id } = envelopeInfo(exported);
    return { id, fileName: `${id}.${suffix}.json`, json: stableStringify(exported) };
  });
}

/** Aggregated result of `check`: build/validation issues and unresolved references. */
export interface CheckResult {
  validationIssues: string[];
  resolutionIssues: ResolutionIssue[];
}

/**
 * Validates every artifact with the builder's strict gate (via `toExport()`) and
 * the exact deploy validator (`validateAllmaConfig` from `@allma/core-sdk`), then
 * runs the project-level cross-artifact resolution pass. Ids of every artifact in
 * the build set (flows, prompts, step-defs, MCP connections) seed the catalog, so
 * a flow that references a locally-authored prompt/step/connection resolves.
 */
export function checkArtifacts(exporters: ArtifactExporter[], known: Partial<Catalog> = {}): CheckResult {
  const validationIssues: string[] = [];
  const flows: FlowAuthoringFormat[] = [];
  const localCatalog: Catalog = {
    flowIds: new Set(known.flowIds ?? []),
    promptTemplateIds: new Set(known.promptTemplateIds ?? []),
    stepDefinitionIds: new Set(known.stepDefinitionIds ?? []),
    mcpConnectionIds: new Set(known.mcpConnectionIds ?? []),
  };

  for (const exporter of exporters) {
    try {
      const exported = exporter.toExport();

      for (const p of exported.promptTemplates ?? []) if (p.id) localCatalog.promptTemplateIds.add(p.id);
      for (const s of exported.stepDefinitions ?? []) if (s.id) localCatalog.stepDefinitionIds.add(s.id);
      for (const m of exported.mcpConnections ?? []) if (m.id) localCatalog.mcpConnectionIds.add(m.id);
      for (const f of exported.flows ?? []) {
        flows.push(f as FlowAuthoringFormat);
      }

      // Deploy-parity gate: exactly what the importer runs.
      const result = validateAllmaConfig(exported, fileNameFor(exported));
      if (!result.success) {
        for (const err of result.error.formErrors) validationIssues.push(err);
        for (const [field, errs] of Object.entries(result.error.fieldErrors)) {
          for (const err of errs) validationIssues.push(`${field}: ${err}`);
        }
      }
    } catch (error) {
      if (error instanceof FlowBuildError || error instanceof ArtifactBuildError) {
        validationIssues.push(...error.issues);
      } else {
        throw error;
      }
    }
  }

  return { validationIssues, resolutionIssues: resolveReferences(flows, localCatalog) };
}

/** A descriptive file name for validator error prefixes. */
function fileNameFor(env: AllmaExportFormat): string {
  const { suffix, id } = envelopeInfo(env);
  return `${id}.${suffix}.json`;
}

/** Harvests known artifact ids from a parsed `AllmaExportFormat`-shaped JSON object. */
export function harvestCatalogIds(parsed: unknown, into: Catalog): void {
  const data = parsed as {
    flows?: { id?: string }[];
    promptTemplates?: { id?: string }[];
    stepDefinitions?: { id?: string }[];
    mcpConnections?: { id?: string }[];
  };
  for (const f of data.flows ?? []) if (f.id) into.flowIds.add(f.id);
  for (const p of data.promptTemplates ?? []) if (p.id) into.promptTemplateIds.add(p.id);
  for (const s of data.stepDefinitions ?? []) if (s.id) into.stepDefinitionIds.add(s.id);
  for (const m of data.mcpConnections ?? []) if (m.id) into.mcpConnectionIds.add(m.id);
}
