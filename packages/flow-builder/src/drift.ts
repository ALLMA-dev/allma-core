import type { FlowAuthoringFormat } from '@allma/core-types';
import { stableStringify } from './serialize.js';

/**
 * Out-of-band drift guard (RFC §6). A code-owned flow must be the single source of
 * truth: if the deployed copy was taken over and last modified in the Visual
 * Editor, CI should fail so the divergence is caught before it is silently
 * overwritten on the next deploy.
 *
 * The pure {@link detectDrift} compares each local code-owned flow against the
 * deployed version supplied by an injected `fetchDeployed` callback (the network/
 * auth adapter lives in the CLI, keeping this testable with no I/O).
 *
 * Two signals:
 *  - `editor-owned` — the deployed flow's `authoringSource` is no longer `'code'`.
 *    The editor can only persist a code-owned flow after an explicit "unlock for
 *    visual editing" (which flips the marker to `'visual'`), so this is the precise
 *    "taken over by the editor" signal.
 *  - `content-mismatch` — the deployed flow is still marked `'code'` but the fields
 *    the source authored differ from what is deployed (a stale deploy, or a direct
 *    edit). Only the keys the local artifact emits are compared, so server-stamped
 *    defaults/bookkeeping never cause a false positive.
 */

/** Server-owned bookkeeping fields the importer stamps; never authored in code. */
const SERVER_FIELDS = new Set(['createdAt', 'updatedAt', 'publishedAt', 'isPublished']);

/** A locally-built, code-owned flow (the committed artifact). */
export interface LocalCodeFlow {
  flowId: string;
  version: number;
  flow: FlowAuthoringFormat;
}

/** The deployed flow definition as returned by the admin API (with server fields). */
export type DeployedFlow = Record<string, unknown> & { authoringSource?: 'code' | 'visual' };

/** Fetches the deployed flow for `(flowId, version)`, or `null` if not deployed yet. */
export type FetchDeployed = (flowId: string, version: number) => Promise<DeployedFlow | null>;

/** A single drift finding. */
export interface DriftIssue {
  flowId: string;
  version: number;
  reason: 'editor-owned' | 'content-mismatch';
  message: string;
}

/** Compares the authored keys (minus server bookkeeping) of two flow objects. */
function authoredFieldsDiffer(local: Record<string, unknown>, deployed: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(local)) {
    if (SERVER_FIELDS.has(key)) continue;
    if (stableStringify(value) !== stableStringify(deployed[key])) return true;
  }
  return false;
}

/**
 * Detects drift for every local code-owned flow against its deployed counterpart.
 * Flows whose local `authoringSource` is not `'code'` are ignored (the guard only
 * protects code-owned flows). Flows not yet deployed (`fetchDeployed` → `null`) are
 * not drift.
 */
export async function detectDrift(
  local: LocalCodeFlow[],
  fetchDeployed: FetchDeployed,
): Promise<DriftIssue[]> {
  const issues: DriftIssue[] = [];
  for (const { flowId, version, flow } of local) {
    if (flow.authoringSource !== 'code') continue;
    const deployed = await fetchDeployed(flowId, version);
    if (!deployed) continue; // not deployed yet — nothing to drift from

    if (deployed.authoringSource !== 'code') {
      issues.push({
        flowId,
        version,
        reason: 'editor-owned',
        message: `Deployed flow '${flowId}' v${version} is marked authoringSource='${deployed.authoringSource ?? 'visual'}' — it was unlocked and last modified in the Visual Editor. Re-eject it or unlock the source's ownership before redeploying.`,
      });
      continue;
    }
    if (authoredFieldsDiffer(flow as Record<string, unknown>, deployed)) {
      issues.push({
        flowId,
        version,
        reason: 'content-mismatch',
        message: `Deployed flow '${flowId}' v${version} differs from the committed code source. Rebuild and redeploy so the live copy matches the source of truth.`,
      });
    }
  }
  return issues;
}
