import { validateAllmaConfig } from '@allma/core-sdk';
import type { FlowAuthoringFormat } from '@allma/core-types';
import type { FlowBuilder } from '../define-flow.js';
import { FlowBuildError } from '../validate.js';
import { stableStringify } from '../serialize.js';
import { resolveReferences, type Catalog, type ResolutionIssue } from '../catalog.js';

/** One built flow ready to be written to disk. */
export interface BuiltArtifact {
  flowId: string;
  fileName: string;
  /** Deterministic, byte-stable JSON (AllmaExportFormat envelope). */
  json: string;
}

/** Builds every flow to its deterministic `*.flow.json` content. Throws on invalid flows. */
export function buildArtifacts(builders: FlowBuilder[], exportedAt?: string): BuiltArtifact[] {
  return builders.map((builder) => {
    const exported = builder.toExport(exportedAt);
    const flow = (exported.flows ?? [])[0] as { id: string };
    return { flowId: flow.id, fileName: `${flow.id}.flow.json`, json: stableStringify(exported) };
  });
}

/** Aggregated result of `check`: build/validation issues and unresolved references. */
export interface CheckResult {
  validationIssues: string[];
  resolutionIssues: ResolutionIssue[];
}

/**
 * Validates every flow with both the builder's strict gate (via `build()`) and
 * the exact deploy validator (`validateAllmaConfig` from `@allma/core-sdk`), then
 * runs the project-level cross-artifact resolution pass.
 */
export function checkArtifacts(builders: FlowBuilder[], known: Partial<Catalog> = {}): CheckResult {
  const validationIssues: string[] = [];
  const flows: FlowAuthoringFormat[] = [];

  for (const builder of builders) {
    try {
      const exported = builder.toExport();
      const flow = (exported.flows ?? [])[0] as FlowAuthoringFormat;
      flows.push(flow);

      // Deploy-parity gate: exactly what the importer runs.
      const result = validateAllmaConfig(exported, `${flow.id}.flow.json`);
      if (!result.success) {
        for (const err of result.error.formErrors) validationIssues.push(err);
        for (const [field, errs] of Object.entries(result.error.fieldErrors)) {
          for (const err of errs) validationIssues.push(`${field}: ${err}`);
        }
      }
    } catch (error) {
      if (error instanceof FlowBuildError) {
        validationIssues.push(...error.issues.map((i) => `[${builder.constructor.name}] ${i}`));
      } else {
        throw error;
      }
    }
  }

  return { validationIssues, resolutionIssues: resolveReferences(flows, known) };
}

/** Harvests known artifact ids from a parsed `AllmaExportFormat`-shaped JSON object. */
export function harvestCatalogIds(parsed: unknown, into: Catalog): void {
  const data = parsed as {
    flows?: { id?: string }[];
    promptTemplates?: { id?: string }[];
    stepDefinitions?: { id?: string }[];
  };
  for (const f of data.flows ?? []) if (f.id) into.flowIds.add(f.id);
  for (const p of data.promptTemplates ?? []) if (p.id) into.promptTemplateIds.add(p.id);
  for (const s of data.stepDefinitions ?? []) if (s.id) into.stepDefinitionIds.add(s.id);
}
