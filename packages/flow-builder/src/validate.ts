import { z } from 'zod';
import { FlowAuthoringSchema, StepType } from '@allma/core-types';
import { LEAF_SCHEMA_BY_STEP_TYPE, moduleConfigSchema } from './registry.js';
import { scanForMisplacedTokens } from './deploy-var.js';

/** Thrown by `build()` when a flow fails the authoring gate, aggregating all issues. */
export class FlowBuildError extends Error {
  readonly issues: string[];
  constructor(flowId: string, issues: string[]) {
    super(
      `Flow '${flowId}' failed validation with ${issues.length} issue(s):\n` +
        issues.map((i) => `  - ${i}`).join('\n'),
    );
    this.name = 'FlowBuildError';
    this.issues = issues;
  }
}

/**
 * Thrown by a non-flow artifact's `build()` (prompt / step definition / MCP
 * connection) when it fails its authoring gate, aggregating all issues. The
 * flow-specific {@link FlowBuildError} stays separate for backward compatibility.
 */
export class ArtifactBuildError extends Error {
  readonly kind: string;
  readonly id: string;
  readonly issues: string[];
  constructor(kind: string, id: string, issues: string[]) {
    super(
      `${kind} '${id}' failed validation with ${issues.length} issue(s):\n` +
        issues.map((i) => `  - ${i}`).join('\n'),
    );
    this.name = 'ArtifactBuildError';
    this.kind = kind;
    this.id = id;
    this.issues = issues;
  }
}

/** Parses `value` against `schema`, returning prefixed issue strings (empty on success). */
export function collectSchemaIssues(schema: z.ZodTypeAny, value: unknown, prefix: string): string[] {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return formatZodIssues(result.error, prefix);
}

/** Renders Zod issues with a leading context prefix and a dotted field path. */
function formatZodIssues(error: z.ZodError, prefix: string): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${prefix} ${path}: ${issue.message}` : `${prefix}: ${issue.message}`;
  });
}

/**
 * Strict-payload check: parses a step's payload against a `.strict()` clone of
 * its leaf schema, catching unknown keys that the persisted `.passthrough()`
 * schema would silently allow (the "stricter than deploy" guarantee, RFC §9).
 *
 * @param payload The leaf payload as authored (incl. `moduleIdentifier`/
 *   `customConfig` for module steps), WITHOUT instance-level wiring fields.
 */
export function checkStepPayload(
  stepInstanceId: string,
  stepType: StepType,
  payload: Record<string, unknown>,
): string[] {
  const leaf = LEAF_SCHEMA_BY_STEP_TYPE[stepType];
  if (!leaf) return [`step '${stepInstanceId}': unknown stepType '${stepType}'.`];
  const result = leaf.strict().safeParse({ stepType, ...payload });
  if (result.success) return [];
  return formatZodIssues(result.error, `step '${stepInstanceId}'`);
}

/**
 * Registry check: validates a module step's `customConfig` against its
 * centralized schema. Opaque/consumer modules (no registered schema) are
 * skipped. This is the earliest point any `customConfig` is validated.
 */
export function checkModuleCustomConfig(
  stepInstanceId: string,
  moduleIdentifier: string | undefined,
  customConfig: unknown,
): string[] {
  if (!moduleIdentifier || customConfig === undefined || customConfig === null) return [];
  const schema = moduleConfigSchema(moduleIdentifier);
  if (!schema) return []; // opaque module — do not validate
  const result = schema.safeParse(customConfig);
  if (result.success) return [];
  return formatZodIssues(result.error, `step '${stepInstanceId}' customConfig`);
}

/**
 * Authoring-schema check: cross-references (start/transition/default/fallback
 * targets exist) and JSONPath well-formedness, inherited from the shared
 * `FlowAuthoringSchema`.
 */
export function checkAuthoringSchema(flow: Record<string, unknown>): string[] {
  const result = FlowAuthoringSchema.safeParse(flow);
  if (result.success) return [];
  return formatZodIssues(result.error, 'flow');
}

/** Deploy-placeholder check: `{{...}}` tokens outside `flowVariables` or unknown tokens. */
export function checkDeployTokens(flow: Record<string, unknown>): string[] {
  return scanForMisplacedTokens(flow).map((i) => `${i.path}: ${i.message}`);
}
