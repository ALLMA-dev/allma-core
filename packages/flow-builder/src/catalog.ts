import type { FlowAuthoringFormat } from '@allma/core-types';
import { isExternal } from './external.js';

/**
 * Project-level cross-artifact resolution (RFC §5.7). Intra-flow ref-safety
 * (the two-phase wiring) cannot catch a typo in a *cross-artifact* id — a
 * sub-flow's `subFlowDefinitionId`, a `flowDefinitionId`, a `promptTemplateId`,
 * or a reusable `stepDefinitionId`. This pass loads every artifact in a config
 * dir into a catalog and asserts each such reference resolves to a known
 * artifact or is explicitly wrapped in `external(...)`.
 */

export type ReferenceKind = 'flow' | 'prompt' | 'stepDefinition';

/** A single cross-artifact reference found in a flow. */
export interface ArtifactReference {
  stepInstanceId: string;
  kind: ReferenceKind;
  field: string;
  id: string;
}

/** Known ids present in the config dir, used to resolve references. */
export interface Catalog {
  flowIds: Set<string>;
  promptTemplateIds: Set<string>;
  stepDefinitionIds: Set<string>;
}

/** A reference that resolved to neither a known artifact nor an `external(...)` marker. */
export interface ResolutionIssue extends ArtifactReference {
  flowId: string;
  message: string;
}

/** Extracts every cross-artifact reference from a built flow's steps. */
export function collectFlowReferences(flow: FlowAuthoringFormat): ArtifactReference[] {
  const refs: ArtifactReference[] = [];
  const steps = (flow.steps ?? {}) as Record<string, Record<string, unknown>>;

  for (const [stepInstanceId, step] of Object.entries(steps)) {
    const push = (kind: ReferenceKind, field: string): void => {
      const value = step[field];
      if (typeof value === 'string' && value.length > 0 && !value.includes('{{')) {
        refs.push({ stepInstanceId, kind, field, id: value });
      }
    };
    push('flow', 'subFlowDefinitionId');
    push('flow', 'flowDefinitionId');
    push('prompt', 'promptTemplateId');
    push('stepDefinition', 'stepDefinitionId');
  }
  return refs;
}

function emptyCatalog(): Catalog {
  return { flowIds: new Set(), promptTemplateIds: new Set(), stepDefinitionIds: new Set() };
}

/**
 * Resolves every cross-artifact reference across `flows`. Every flow's own id is
 * added to the catalog automatically; `known` supplies ids discovered from other
 * artifacts in the config dir (prompts, step defs, externally-deployed flows).
 * References wrapped in `external(...)` are always considered resolved.
 */
export function resolveReferences(
  flows: FlowAuthoringFormat[],
  known: Partial<Catalog> = {},
): ResolutionIssue[] {
  const catalog = emptyCatalog();
  for (const id of known.flowIds ?? []) catalog.flowIds.add(id);
  for (const id of known.promptTemplateIds ?? []) catalog.promptTemplateIds.add(id);
  for (const id of known.stepDefinitionIds ?? []) catalog.stepDefinitionIds.add(id);
  for (const flow of flows) catalog.flowIds.add(flow.id);

  const setFor: Record<ReferenceKind, Set<string>> = {
    flow: catalog.flowIds,
    prompt: catalog.promptTemplateIds,
    stepDefinition: catalog.stepDefinitionIds,
  };

  const issues: ResolutionIssue[] = [];
  for (const flow of flows) {
    for (const ref of collectFlowReferences(flow)) {
      if (isExternal(ref.id) || setFor[ref.kind].has(ref.id)) continue;
      issues.push({
        ...ref,
        flowId: flow.id,
        message: `${ref.kind} reference '${ref.id}' (step '${ref.stepInstanceId}'.${ref.field}) does not resolve to any artifact in the config dir. Add the artifact or wrap the id in external('${ref.id}').`,
      });
    }
  }
  return issues;
}
