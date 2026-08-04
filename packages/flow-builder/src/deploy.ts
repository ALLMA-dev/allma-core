import type { AllmaExportFormat } from '@allma/core-types';
import { STABLE_EXPORTED_AT } from './define-flow.js';

/**
 * `allma-flows deploy` core (RFC §8 "Optional Phase 3" / §11). Promotes
 * code-authored artifacts to a running Allma environment via the flow-management
 * admin API — **no CDK redeploy** — so CI can ship a flow/prompt/step-def/MCP
 * change as a pure API call.
 *
 * ## Why the bulk import route (not the granular create-version flow)
 * The builder already emits an {@link AllmaExportFormat} envelope carrying every
 * artifact kind (flows, prompts, step definitions, MCP connections). The bulk
 * `POST /v1/allma/import` route accepts exactly that shape and is the same
 * importer the CDK deploy pipeline uses, so a `deploy` and a `cdk deploy` apply
 * identical semantics. The granular `FLOW_CREATE_VERSION` + `FLOW_VERSION_PUBLISH`
 * routes are flow-only and would need bespoke ordering for cross-artifact refs.
 *
 * ## Version-slot contract (honored, not worked around)
 * The importer (`allma-importer.service.ts`) **creates** a brand-new flow id at
 * the version in the envelope, but for an **existing** flow id it only *updates*
 * a version slot that already exists — "Creating new versions for existing flows
 * on import is not supported". `deploy` therefore matches `cdk deploy`: bumping an
 * existing flow to a not-yet-existing version must be done via the admin
 * version-management API first. `deploy` surfaces the importer's per-item errors
 * rather than masking them.
 *
 * The module is pure: all network/auth lives behind the injected
 * {@link DeployAdapter} (mirrors `detectDrift`'s `fetchDeployed`), so the planning
 * and orchestration are unit-testable with a stubbed adapter and zero I/O.
 */

/** Options controlling a deploy. */
export interface DeployOptions {
  /** Overwrite existing version slots (the importer's `options.overwrite`). Defaults to `true`. */
  overwrite?: boolean;
  /** After import, publish each flow version via the admin API. Defaults to `false`. */
  publish?: boolean;
}

/** A flow version targeted for publishing. */
export interface PublishTarget {
  flowId: string;
  version: number;
}

/** A planned deploy: one merged import payload plus optional per-flow publishes. */
export interface DeployPlan {
  /** The single, merged `AllmaExportFormat` to POST to the import route. */
  import: AllmaExportFormat;
  /** The importer options (`overwrite`). */
  importOptions: { overwrite: boolean };
  /** Flow versions to publish after a successful import (empty unless `publish`). */
  publish: PublishTarget[];
}

/** The importer's per-item error, surfaced verbatim. */
export interface ImportItemError {
  id: string;
  type: string;
  message: string;
}

/** A loose summary of the import endpoint's response (created/updated/skipped/errors). */
export interface ImportResultSummary {
  created?: Record<string, number>;
  updated?: Record<string, number>;
  skipped?: Record<string, number>;
  errors?: ImportItemError[];
}

/** The network/auth boundary `executeDeploy` calls. Implemented by the CLI with `fetch`. */
export interface DeployAdapter {
  /** POST the merged envelope to `/v1/allma/import` with the given options. */
  importConfig(payload: AllmaExportFormat, options: { overwrite: boolean }): Promise<ImportResultSummary>;
  /** POST `/v1/allma/flows/{flowId}/versions/{version}/publish`. */
  publishFlow(flowId: string, version: number): Promise<void>;
}

/** The outcome of an `executeDeploy` run. */
export interface DeployResult {
  import: ImportResultSummary;
  published: PublishTarget[];
}

const ARTIFACT_ARRAYS = ['flows', 'promptTemplates', 'stepDefinitions', 'mcpConnections', 'agents'] as const;

/**
 * Merges every artifact array across the given envelopes into a single
 * deterministic import payload, and (when `publish` is set) computes the flow
 * versions to publish afterwards.
 */
export function planDeploy(envelopes: AllmaExportFormat[], options: DeployOptions = {}): DeployPlan {
  const merged: Record<string, unknown[]> = {};
  for (const key of ARTIFACT_ARRAYS) {
    const items: unknown[] = [];
    for (const env of envelopes) {
      const arr = (env as unknown as Record<string, unknown[]>)[key];
      if (Array.isArray(arr)) items.push(...arr);
    }
    if (items.length > 0) merged[key] = items;
  }

  const importPayload = {
    formatVersion: '1.0',
    exportedAt: STABLE_EXPORTED_AT,
    ...merged,
  } as unknown as AllmaExportFormat;

  const publish: PublishTarget[] = [];
  if (options.publish) {
    for (const flow of (importPayload.flows ?? []) as { id: string; version?: number }[]) {
      publish.push({ flowId: flow.id, version: typeof flow.version === 'number' ? flow.version : 1 });
    }
  }

  return {
    import: importPayload,
    importOptions: { overwrite: options.overwrite ?? true },
    publish,
  };
}

/**
 * Executes a {@link DeployPlan} through the injected {@link DeployAdapter}: one
 * import call, then (if any) the publishes. Publishing only proceeds when the
 * import reported no per-item errors, so a half-applied import is not published.
 */
export async function executeDeploy(plan: DeployPlan, adapter: DeployAdapter): Promise<DeployResult> {
  const importResult = await adapter.importConfig(plan.import, plan.importOptions);

  const published: PublishTarget[] = [];
  if (plan.publish.length > 0) {
    if (importResult.errors && importResult.errors.length > 0) {
      return { import: importResult, published };
    }
    for (const target of plan.publish) {
      await adapter.publishFlow(target.flowId, target.version);
      published.push(target);
    }
  }

  return { import: importResult, published };
}
