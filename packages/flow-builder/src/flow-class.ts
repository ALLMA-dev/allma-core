import type { FlowAuthoringFormat, AllmaExportFormat } from '@allma/core-types';
import { Step, type StepDraft, type StepRef } from './step.js';
import {
  buildFlowArtifact,
  toExportEnvelope,
  STABLE_EXPORTED_AT,
  type DefineFlowOptions,
} from './define-flow.js';

/**
 * `class Flow` — the OO authoring facade (RFC §5.6/§11) over the same internals
 * as {@link defineFlow}. Teams that prefer eager, imperative construction can
 * `new Flow(meta)`, `addStep(...)` incrementally (each returns a wired `StepRef`),
 * then `start(...)` and `build()`/`toExport()`. It shares the exact build + strict
 * validation core with the functional builder, so both produce identical artifacts.
 *
 * ```ts
 * const flow = new Flow({ id: 'order-intake' });
 * const load = flow.addStep('load', s3DataLoad({ sourceS3Uri: 's3://in/x' }));
 * const done = flow.addStep('done', endFlow());
 * load.next(done);
 * flow.start(load);
 * export default flow;
 * ```
 */
export class Flow {
  /** Discriminates this as a flow handle (a typed `FlowRef`). */
  readonly kind = 'flow' as const;
  private readonly options: DefineFlowOptions;
  private readonly stepMap = new Map<string, Step>();
  private startStep: Step | undefined;

  constructor(options: DefineFlowOptions) {
    this.options = options;
  }

  /** The flow's stable id — makes the instance usable as a typed `FlowRef`. */
  get id(): string {
    return this.options.id;
  }

  /**
   * Declares a step under `id` and returns its wired {@link StepRef}. Unlike the
   * functional builder's single `steps({...})` call, steps may be added one at a
   * time; the id is assigned immediately so the returned ref can be wired right away.
   */
  addStep(id: string, draft: StepDraft): StepRef {
    if (this.stepMap.has(id)) {
      throw new Error(`Flow('${this.options.id}').addStep('${id}') was called twice for the same id.`);
    }
    const step = draft as Step;
    step._assignId(id);
    this.stepMap.set(id, step);
    return step as StepRef;
  }

  /** Sets the flow's start step. */
  start(step: StepRef): this {
    this.startStep = step as Step;
    return this;
  }

  /** Strict authoring gate → the deterministic `FlowAuthoringFormat`. */
  build(): FlowAuthoringFormat {
    return buildFlowArtifact(this.options, this.stepMap, this.startStep);
  }

  /** Wrap `build()` in the deploy file envelope (`AllmaExportFormat`). */
  toExport(exportedAt: string = STABLE_EXPORTED_AT): AllmaExportFormat {
    return toExportEnvelope(this.build(), exportedAt);
  }
}
