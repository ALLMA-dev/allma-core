import type {
  FlowAuthoringFormat,
  AllmaExportFormat,
  OnCompletionAction,
  LlmParameters,
  StepErrorHandler,
} from '@allma/core-types';
import { Step, type StepDraft, type StepRef } from './step.js';
import {
  FlowBuildError,
  checkAuthoringSchema,
  checkDeployTokens,
  checkModuleCustomConfig,
  checkStepPayload,
} from './validate.js';

/**
 * A fixed, deterministic `exportedAt` so the committed `*.flow.json` is
 * byte-stable for the CI drift check. The real import timestamp is stamped
 * server-side by the importer, so this placeholder never reaches storage.
 */
export const STABLE_EXPORTED_AT = '1970-01-01T00:00:00.000Z';

/** Default-step configuration shared by every step in the flow. */
interface DefaultStepConfig {
  defaultInferenceParameters?: LlmParameters;
  defaultCustomConfig?: Record<string, unknown>;
  defaultErrorHandler?: StepErrorHandler;
}

/**
 * Shared build core used by both {@link defineFlow}'s builder and the `class Flow`
 * facade: assembles the flow object, runs the full strict authoring gate, and
 * either throws an aggregated {@link FlowBuildError} or returns the deterministic
 * {@link FlowAuthoringFormat}. Kept here (not duplicated) so the two authoring
 * surfaces validate identically.
 */
export function buildFlowArtifact(
  options: DefineFlowOptions,
  stepMap: Map<string, Step>,
  startStep: Step | undefined,
): FlowAuthoringFormat {
  const issues: string[] = [];

  if (stepMap.size === 0) {
    issues.push('flow has no steps; declare them via flow.steps({ ... }).');
  }
  if (!startStep) {
    issues.push('no start step set; call flow.start(ref).');
  }

  const steps: Record<string, unknown> = {};
  for (const [id, step] of stepMap) {
    steps[id] = step._toInstance();
  }

  const flow: Record<string, unknown> = {
    id: options.id,
    version: options.version ?? 1,
    startStepInstanceId: startStep ? startStep.id : '',
    steps,
    // Self-mark as code-owned (RFC §6): the Visual Editor opens these read-only.
    authoringSource: 'code',
  };
  if (options.name !== undefined) flow.name = options.name;
  if (options.description !== undefined) flow.description = options.description;
  if (options.enableExecutionLogs !== undefined) flow.enableExecutionLogs = options.enableExecutionLogs;
  if (options.variables !== undefined) flow.flowVariables = options.variables;
  if (options.defaultStepConfig !== undefined) flow.defaultStepConfig = options.defaultStepConfig;
  if (options.onCompletionActions !== undefined) flow.onCompletionActions = options.onCompletionActions;

  // 1. Deploy-placeholder placement scan (Gap 2).
  issues.push(...checkDeployTokens(flow));

  // 2. Per-step strict leaf clone + registry customConfig parse.
  for (const [id, step] of stepMap) {
    const payload = step._getPayload();
    issues.push(...checkStepPayload(id, step._getStepType(), payload));
    issues.push(
      ...checkModuleCustomConfig(id, payload.moduleIdentifier as string | undefined, payload.customConfig),
    );
  }

  // 3. Shared authoring schema: cross-references + JSONPath well-formedness.
  issues.push(...checkAuthoringSchema(flow));

  if (issues.length > 0) {
    throw new FlowBuildError(options.id, issues);
  }
  return flow as FlowAuthoringFormat;
}

/** Wraps a built flow in the deterministic deploy-file envelope. */
export function toExportEnvelope(flow: FlowAuthoringFormat, exportedAt: string = STABLE_EXPORTED_AT): AllmaExportFormat {
  return {
    formatVersion: '1.0',
    exportedAt,
    flows: [flow],
  } as unknown as AllmaExportFormat;
}

/** Options accepted by {@link defineFlow}. */
export interface DefineFlowOptions {
  /** Stable flow id (the `flowDefinitionId`). */
  id: string;
  /** Optional display name. */
  name?: string;
  /** Optional description. */
  description?: string | null;
  /** Target version slot for the importer. Defaults to `1`. */
  version?: number;
  /** Enable per-step execution logs. */
  enableExecutionLogs?: boolean;
  /** Flow variables — the only place deploy placeholders (`deployVar`) are rendered. */
  variables?: Record<string, unknown>;
  /** Flow-wide default step configuration. */
  defaultStepConfig?: DefaultStepConfig;
  /** Actions to run when the flow completes. */
  onCompletionActions?: OnCompletionAction[];
}

/** The fluent builder returned by {@link defineFlow}. */
export interface FlowBuilder {
  /** Phase 1: declare steps; returns a typed record of refs keyed by the same keys. */
  steps<M extends Record<string, StepDraft>>(map: M): { [K in keyof M]: StepRef };
  /** Set the flow's start step. */
  start(step: StepRef): this;
  /** Strict authoring gate → the deterministic `FlowAuthoringFormat`. Throws {@link FlowBuildError}. */
  build(): FlowAuthoringFormat;
  /** Wrap `build()` in the deploy file envelope (`AllmaExportFormat`). */
  toExport(exportedAt?: string): AllmaExportFormat;
}

class FlowBuilderImpl implements FlowBuilder {
  private readonly options: DefineFlowOptions;
  private readonly stepMap = new Map<string, Step>();
  private startStep: Step | undefined;
  private stepsDeclared = false;

  constructor(options: DefineFlowOptions) {
    this.options = options;
  }

  steps<M extends Record<string, StepDraft>>(map: M): { [K in keyof M]: StepRef } {
    if (this.stepsDeclared) {
      throw new Error(`defineFlow('${this.options.id}').steps(...) may only be called once.`);
    }
    this.stepsDeclared = true;
    for (const [id, draft] of Object.entries(map)) {
      const step = draft as Step;
      step._assignId(id);
      this.stepMap.set(id, step);
    }
    return map as unknown as { [K in keyof M]: StepRef };
  }

  start(step: StepRef): this {
    this.startStep = step as Step;
    return this;
  }

  build(): FlowAuthoringFormat {
    return buildFlowArtifact(this.options, this.stepMap, this.startStep);
  }

  toExport(exportedAt: string = STABLE_EXPORTED_AT): AllmaExportFormat {
    return toExportEnvelope(this.build(), exportedAt);
  }
}

/**
 * Entry point for authoring a flow in code. Returns a {@link FlowBuilder} whose
 * two-phase API (`steps(...)` then ref-based wiring) gives compile-time type
 * safety and refactor-safe references.
 */
export function defineFlow(options: DefineFlowOptions): FlowBuilder {
  return new FlowBuilderImpl(options);
}
