import type { StepType, DelayOptions, StepErrorHandler } from '@allma/core-types';

/** A progress-milestone tag attached to a step (mirrors `StepInstance.checkpoint`). */
export interface Checkpoint {
  id: string;
  label: string;
  order?: number;
}

/** A 2D canvas position override. Omitted by default so the editor auto-lays-out via Dagre. */
export interface Position {
  x: number;
  y: number;
}

/** The `onError` policy for a step, with `fallback` as a typed ref instead of a string id. */
export interface OnErrorInput {
  retries?: StepErrorHandler['retries'];
  retryOnContentError?: StepErrorHandler['retryOnContentError'];
  fallback?: StepRef;
  continueOnFailure?: boolean;
}

/**
 * The configuration surface available while declaring a step (Phase 1). Every
 * method mutates and returns the same step for chaining. These cover the full
 * instance surface that is independent of graph wiring.
 */
export interface StepDraft {
  /** Human-friendly label shown in the editor. */
  displayName(name: string): this;
  /** `inputMappings`: dot-path on the step input -> JSONPath into the context. */
  inputs(mappings: Record<string, string>): this;
  /** `outputMappings`: JSONPath target in the context -> JSONPath into the step output. */
  outputs(mappings: Record<string, string>): this;
  /** A pre/post execution delay. */
  delay(options: DelayOptions): this;
  /** Tag this step as a progress checkpoint. */
  checkpoint(checkpoint: Checkpoint): this;
  /** Override canvas position. Omit to let the editor auto-layout. */
  position(position: Position): this;
  /** Reference a reusable, stored step definition to merge from. */
  fromDefinition(stepDefinitionId: string): this;
  /** Cap how many times the default (`next`) transition may be taken (0 = infinite). */
  defaultNextMaxTransitions(max: number): this;
  /** Disable S3 payload offload for this step. */
  disableS3Offload(value?: boolean): this;
  /** Force S3 payload offload for this step. */
  forceS3Offload(value?: boolean): this;
  /** Static literal values merged into the step input. */
  literals(values: Record<string, unknown>): this;
}

/**
 * The wiring surface available after declaration (Phase 2). A `StepRef` is the
 * same object as the {@link StepDraft}, now carrying a stable `id`, so forward
 * and backward edges (including self-loops/cycles) are wired with object refs —
 * never string ids.
 */
export interface StepRef extends StepDraft {
  /** The step's `stepInstanceId` (the key it was declared under). */
  readonly id: string;
  /** Set the default (unconditional) next step. */
  next(target: StepRef, options?: { maxTransitions?: number }): this;
  /** Add a conditional transition. `condition` is a JSONPath expression (`$. ...`). */
  when(condition: string, target: StepRef, options?: { maxTransitions?: number }): this;
  /** Configure the error-handling policy, with a typed `fallback` ref. */
  onError(handler: OnErrorInput): this;
}

interface Transition {
  condition: string;
  target: Step;
  maxTransitions?: number;
}

/**
 * Concrete implementation backing both {@link StepDraft} and {@link StepRef}. A
 * factory returns it typed as `StepDraft`; `flow.steps({...})` assigns each one
 * its `stepInstanceId` and re-types it as `StepRef`.
 */
export class Step implements StepRef {
  /** Assigned by `flow.steps({...})` from the declaration key. */
  private _id: string | undefined;
  private readonly stepType: StepType;
  private readonly payload: Record<string, unknown>;

  private _displayName: string | undefined;
  private _stepDefinitionId: string | undefined;
  private _checkpoint: Checkpoint | undefined;
  private _position: Position | undefined;
  private _inputMappings: Record<string, string> | undefined;
  private _outputMappings: Record<string, string> | undefined;
  private _delay: DelayOptions | undefined;
  private _literals: Record<string, unknown> | undefined;
  private _disableS3Offload: boolean | undefined;
  private _forceS3Offload: boolean | undefined;
  private _defaultNext: Step | undefined;
  private _defaultNextMaxTransitions: number | undefined;
  private readonly _transitions: Transition[] = [];
  private _onError: OnErrorInput | undefined;

  constructor(stepType: StepType, payload: Record<string, unknown>) {
    this.stepType = stepType;
    this.payload = payload;
  }

  /** @internal Assigns the stable instance id (called once by `flow.steps`). */
  _assignId(id: string): void {
    this._id = id;
  }

  get id(): string {
    if (this._id === undefined) {
      throw new Error(
        'Step has no id yet — declare it via flow.steps({ ... }) before wiring or referencing it.',
      );
    }
    return this._id;
  }

  /** @internal The step's `StepType` (for the build-time strict gate). */
  _getStepType(): StepType {
    return this.stepType;
  }

  /** @internal The leaf payload as authored (incl. `moduleIdentifier`/`customConfig`). */
  _getPayload(): Record<string, unknown> {
    return this.payload;
  }

  // --- Config setters (Phase 1) ---
  displayName(name: string): this {
    this._displayName = name;
    return this;
  }
  inputs(mappings: Record<string, string>): this {
    this._inputMappings = { ...(this._inputMappings ?? {}), ...mappings };
    return this;
  }
  outputs(mappings: Record<string, string>): this {
    this._outputMappings = { ...(this._outputMappings ?? {}), ...mappings };
    return this;
  }
  delay(options: DelayOptions): this {
    this._delay = options;
    return this;
  }
  checkpoint(checkpoint: Checkpoint): this {
    this._checkpoint = checkpoint;
    return this;
  }
  position(position: Position): this {
    this._position = position;
    return this;
  }
  fromDefinition(stepDefinitionId: string): this {
    this._stepDefinitionId = stepDefinitionId;
    return this;
  }
  defaultNextMaxTransitions(max: number): this {
    this._defaultNextMaxTransitions = max;
    return this;
  }
  disableS3Offload(value = true): this {
    this._disableS3Offload = value;
    return this;
  }
  forceS3Offload(value = true): this {
    this._forceS3Offload = value;
    return this;
  }
  literals(values: Record<string, unknown>): this {
    this._literals = { ...(this._literals ?? {}), ...values };
    return this;
  }

  // --- Wiring setters (Phase 2) ---
  next(target: StepRef, options?: { maxTransitions?: number }): this {
    this._defaultNext = target as Step;
    if (options?.maxTransitions !== undefined) {
      this._defaultNextMaxTransitions = options.maxTransitions;
    }
    return this;
  }
  when(condition: string, target: StepRef, options?: { maxTransitions?: number }): this {
    this._transitions.push({ condition, target: target as Step, maxTransitions: options?.maxTransitions });
    return this;
  }
  onError(handler: OnErrorInput): this {
    this._onError = handler;
    return this;
  }

  /**
   * @internal Resolves all refs to ids and emits the plain `StepInstance`-shaped
   * object. Only fields the author actually set are included, keeping the
   * artifact minimal and deterministic. The payload (leaf config, incl.
   * `moduleIdentifier`/`customConfig` for module steps) is spread in as-is.
   */
  _toInstance(): Record<string, unknown> {
    const instance: Record<string, unknown> = {
      stepInstanceId: this.id,
      stepType: this.stepType,
      ...this.payload,
    };

    if (this._displayName !== undefined) instance.displayName = this._displayName;
    if (this._stepDefinitionId !== undefined) instance.stepDefinitionId = this._stepDefinitionId;
    if (this._checkpoint !== undefined) instance.checkpoint = this._checkpoint;
    if (this._position !== undefined) instance.position = this._position;
    if (this._inputMappings !== undefined) instance.inputMappings = this._inputMappings;
    if (this._outputMappings !== undefined) instance.outputMappings = this._outputMappings;
    if (this._delay !== undefined) instance.delay = this._delay;
    if (this._literals !== undefined) instance.literals = this._literals;
    if (this._disableS3Offload !== undefined) instance.disableS3Offload = this._disableS3Offload;
    if (this._forceS3Offload !== undefined) instance.forceS3Offload = this._forceS3Offload;

    if (this._defaultNext !== undefined) instance.defaultNextStepInstanceId = this._defaultNext.id;
    if (this._defaultNextMaxTransitions !== undefined) {
      instance.defaultNextMaxTransitions = this._defaultNextMaxTransitions;
    }
    if (this._transitions.length > 0) {
      instance.transitions = this._transitions.map((t) => {
        const transition: Record<string, unknown> = {
          condition: t.condition,
          nextStepInstanceId: t.target.id,
        };
        if (t.maxTransitions !== undefined) transition.maxTransitions = t.maxTransitions;
        return transition;
      });
    }
    if (this._onError !== undefined) {
      const { fallback, ...rest } = this._onError;
      const onError: Record<string, unknown> = { ...rest };
      if (fallback !== undefined) onError.fallbackStepInstanceId = (fallback as Step).id;
      instance.onError = onError;
    }

    return instance;
  }
}
