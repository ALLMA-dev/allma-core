import type { FlowAuthoringFormat, FlowDefinition } from '@allma/core-types';
import { StepType } from '@allma/core-types';
import { TYPED_STEP_FACTORIES, MODULE_WRAPPERS, MODULE_ESCAPE_HATCHES } from './factories.js';
import { MODULE_STEP_TYPE } from './registry.js';

/**
 * `allma-flows eject` — JSON → TS codegen (RFC §6). Turns a deployed/committed
 * flow definition back into a `.flow.ts` source that uses the builder API, so a
 * visual flow can be adopted into code (a one-way ownership transfer) or the
 * existing flow set can be migrated. The emitted source is intentionally
 * round-trippable: `build()`-ing it reproduces the original artifact (modulo the
 * `authoringSource:'code'` stamp the builder always applies).
 */

/** A flow as it lives in storage / the committed artifact (either format works). */
type EjectableFlow = FlowDefinition | FlowAuthoringFormat;

/** Options for {@link ejectFlow}. */
export interface EjectOptions {
  /** Import specifier for the builder package in the emitted source. Defaults to `@allma/flow-builder`. */
  importSpecifier?: string;
}

/** The module step types that carry `moduleIdentifier` + `customConfig`. */
const MODULE_STEP_TYPES = new Set<StepType>([
  StepType.DATA_LOAD,
  StepType.DATA_SAVE,
  StepType.DATA_TRANSFORMATION,
  StepType.CUSTOM_LOGIC,
]);

/**
 * Instance/wiring fields that `Step._toInstance()` emits from dedicated setters
 * rather than from the leaf payload. They must be stripped from a step before the
 * remainder is treated as the factory's leaf config, and are re-emitted as
 * chained setter / wiring calls.
 */
const INSTANCE_FIELDS = new Set<string>([
  'stepInstanceId',
  'stepType',
  'displayName',
  'stepDefinitionId',
  'checkpoint',
  'position',
  'inputMappings',
  'outputMappings',
  'delay',
  'literals',
  'disableS3Offload',
  'forceS3Offload',
  'defaultNextStepInstanceId',
  'defaultNextMaxTransitions',
  'transitions',
  'onError',
]);

interface StepSpec {
  /** The declaration key (the `stepInstanceId`). */
  id: string;
  /** Factory function name to call (e.g. `llmInvocation`, `s3DataLoad`, `dataLoad`). */
  factory: string;
  /** Source text of the single argument passed to the factory. */
  argSource: string;
  /** Chained `.method(...)` setter calls (config, not wiring). */
  setters: string[];
}

interface WiringSpec {
  /** `s.<id>.next(s.<target>, opts?)` */
  defaultNext?: { target: string; maxTransitions?: number };
  /** `s.<id>.when(condition, s.<target>, opts?)` */
  transitions: { condition: string; target: string; maxTransitions?: number }[];
  /** `s.<id>.onError({ ... })` */
  onError?: Record<string, unknown> & { fallbackStepInstanceId?: string };
}

/** The structured intermediate the renderer consumes. */
export interface BuilderSpec {
  meta: Record<string, unknown>;
  steps: StepSpec[];
  wiring: Record<string, WiringSpec>;
  start: string;
  /** Distinct factory names used, for the import statement. */
  factories: string[];
}

function factoryNameFor(stepType: StepType, moduleIdentifier: string | undefined): string {
  if (MODULE_STEP_TYPES.has(stepType)) {
    if (moduleIdentifier) {
      const wrapper = MODULE_WRAPPERS[moduleIdentifier];
      // Use a registry-typed wrapper only when this module is the one it targets.
      if (wrapper && MODULE_STEP_TYPE[moduleIdentifier] === stepType) return wrapper.name;
    }
    const hatch = MODULE_ESCAPE_HATCHES[stepType];
    if (hatch) return hatch.name;
  }
  const factory = TYPED_STEP_FACTORIES[stepType];
  if (!factory) throw new Error(`Cannot eject step of unknown stepType '${stepType}'.`);
  return factory.name;
}

/** Builds the structured {@link BuilderSpec} from a flow definition. */
export function flowToBuilderSpec(flow: EjectableFlow): BuilderSpec {
  const factories = new Set<string>();
  const stepEntries = Object.entries((flow.steps ?? {}) as Record<string, Record<string, unknown>>);

  const steps: StepSpec[] = stepEntries.map(([id, step]) => {
    const stepType = step.stepType as StepType;
    const moduleIdentifier = step.moduleIdentifier as string | undefined;
    const isModule = MODULE_STEP_TYPES.has(stepType);
    const factory = factoryNameFor(stepType, moduleIdentifier);
    factories.add(factory);

    const usesWrapper =
      isModule && moduleIdentifier !== undefined && factory === MODULE_WRAPPERS[moduleIdentifier]?.name;

    let argSource: string;
    if (usesWrapper) {
      // Registry-typed wrapper: argument is the customConfig.
      argSource = literal(step.customConfig ?? {});
    } else if (isModule) {
      // Generic escape hatch: { moduleIdentifier, customConfig }.
      const arg: Record<string, unknown> = { moduleIdentifier };
      if (step.customConfig !== undefined) arg.customConfig = step.customConfig;
      argSource = literal(arg);
    } else {
      // Typed-payload step: every non-instance field is the leaf config.
      const config: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(step)) {
        if (!INSTANCE_FIELDS.has(k) && k !== 'moduleIdentifier' && k !== 'customConfig') config[k] = v;
      }
      argSource = Object.keys(config).length > 0 ? literal(config) : '';
    }

    const setters = configSetters(step);
    return { id, factory, argSource, setters };
  });

  const wiring: Record<string, WiringSpec> = {};
  for (const [id, step] of stepEntries) {
    const spec: WiringSpec = { transitions: [] };
    if (typeof step.defaultNextStepInstanceId === 'string') {
      spec.defaultNext = {
        target: step.defaultNextStepInstanceId,
        maxTransitions: typeof step.defaultNextMaxTransitions === 'number' ? step.defaultNextMaxTransitions : undefined,
      };
    } else if (typeof step.defaultNextMaxTransitions === 'number') {
      // Cap without a default-next target — re-emit via the dedicated setter (handled below).
    }
    const transitions = step.transitions as { condition: string; nextStepInstanceId: string; maxTransitions?: number }[] | undefined;
    for (const t of transitions ?? []) {
      spec.transitions.push({ condition: t.condition, target: t.nextStepInstanceId, maxTransitions: t.maxTransitions });
    }
    if (step.onError && typeof step.onError === 'object') {
      spec.onError = step.onError as WiringSpec['onError'];
    }
    if (spec.defaultNext || spec.transitions.length > 0 || spec.onError) wiring[id] = spec;
  }

  const meta = buildMeta(flow);
  factories.add('defineFlow');

  return { meta, steps, wiring, start: flow.startStepInstanceId, factories: [...factories].sort() };
}

/** Re-emits a step's config (non-wiring) instance fields as chained setter calls. */
function configSetters(step: Record<string, unknown>): string[] {
  const setters: string[] = [];
  if (typeof step.displayName === 'string') setters.push(`.displayName(${literal(step.displayName)})`);
  if (typeof step.stepDefinitionId === 'string') setters.push(`.fromDefinition(${literal(step.stepDefinitionId)})`);
  if (step.inputMappings) setters.push(`.inputs(${literal(step.inputMappings)})`);
  if (step.outputMappings) setters.push(`.outputs(${literal(step.outputMappings)})`);
  if (step.literals) setters.push(`.literals(${literal(step.literals)})`);
  if (step.delay) setters.push(`.delay(${literal(step.delay)})`);
  if (step.checkpoint) setters.push(`.checkpoint(${literal(step.checkpoint)})`);
  if (step.position) setters.push(`.position(${literal(step.position)})`);
  if (typeof step.disableS3Offload === 'boolean') setters.push(`.disableS3Offload(${step.disableS3Offload})`);
  if (typeof step.forceS3Offload === 'boolean') setters.push(`.forceS3Offload(${step.forceS3Offload})`);
  // A default-next cap with NO default-next target is re-emitted via its own setter;
  // when a target exists it is folded into `.next(target, { maxTransitions })` in wiring.
  if (
    typeof step.defaultNextMaxTransitions === 'number' &&
    typeof step.defaultNextStepInstanceId !== 'string'
  ) {
    setters.push(`.defaultNextMaxTransitions(${step.defaultNextMaxTransitions})`);
  }
  return setters;
}

/** Builds the `defineFlow({...})` options object from server/authoring fields. */
function buildMeta(flow: EjectableFlow): Record<string, unknown> {
  const meta: Record<string, unknown> = { id: flow.id };
  if (typeof flow.name === 'string') meta.name = flow.name;
  if (flow.description !== undefined && flow.description !== null) meta.description = flow.description;
  if (typeof flow.version === 'number') meta.version = flow.version;
  if (typeof flow.enableExecutionLogs === 'boolean') meta.enableExecutionLogs = flow.enableExecutionLogs;
  if (flow.flowVariables && Object.keys(flow.flowVariables).length > 0) meta.variables = flow.flowVariables;
  if (flow.defaultStepConfig) meta.defaultStepConfig = flow.defaultStepConfig;
  if (flow.onCompletionActions) meta.onCompletionActions = flow.onCompletionActions;
  return meta;
}

/** A value serialized as a JS/TS object literal. JSON is a valid subset for our data. */
function literal(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** Renders a {@link BuilderSpec} into `.flow.ts` source text. */
export function renderBuilderSource(spec: BuilderSpec, importSpecifier = '@allma/flow-builder'): string {
  const lines: string[] = [];
  lines.push(`import { ${spec.factories.join(', ')} } from '${importSpecifier}';`);
  lines.push('');
  lines.push(`const flow = defineFlow(${literal(spec.meta)});`);
  lines.push('');
  lines.push('const s = flow.steps({');
  for (const step of spec.steps) {
    const call = `${step.factory}(${step.argSource})`;
    if (step.setters.length === 0) {
      lines.push(`  ${step.id}: ${call},`);
    } else {
      lines.push(`  ${step.id}: ${call}`);
      step.setters.forEach((setter, i) => {
        const tail = i === step.setters.length - 1 ? ',' : '';
        lines.push(`    ${setter}${tail}`);
      });
    }
  }
  lines.push('});');
  lines.push('');

  for (const step of spec.steps) {
    const w = spec.wiring[step.id];
    if (!w) continue;
    if (w.defaultNext) {
      const opts = w.defaultNext.maxTransitions !== undefined ? `, { maxTransitions: ${w.defaultNext.maxTransitions} }` : '';
      lines.push(`s.${step.id}.next(s.${w.defaultNext.target}${opts});`);
    }
    for (const t of w.transitions) {
      const opts = t.maxTransitions !== undefined ? `, { maxTransitions: ${t.maxTransitions} }` : '';
      lines.push(`s.${step.id}.when(${literal(t.condition)}, s.${t.target}${opts});`);
    }
    if (w.onError) {
      lines.push(`s.${step.id}.onError(${onErrorLiteral(w.onError)});`);
    }
  }
  lines.push('');
  lines.push(`flow.start(s.${spec.start});`);
  lines.push('');
  lines.push('export default flow;');
  lines.push('');
  return lines.join('\n');
}

/** Renders an `onError` object, turning `fallbackStepInstanceId` back into a `s.<id>` ref. */
function onErrorLiteral(onError: Record<string, unknown> & { fallbackStepInstanceId?: string }): string {
  const { fallbackStepInstanceId, ...rest } = onError;
  const parts: string[] = [];
  if (fallbackStepInstanceId) parts.push(`fallback: s.${fallbackStepInstanceId}`);
  for (const [k, v] of Object.entries(rest)) parts.push(`${k}: ${literal(v)}`);
  return `{ ${parts.join(', ')} }`;
}

/** Convenience: flow definition → `.flow.ts` source in one call. */
export function ejectFlow(flow: EjectableFlow, opts: EjectOptions = {}): string {
  return renderBuilderSource(flowToBuilderSpec(flow), opts.importSpecifier);
}
