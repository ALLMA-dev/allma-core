import { JsonPathStringSchema } from '@allma/core-types';

/**
 * `jp()` — a typed JSONPath helper with build-time typo detection (RFC §5.2/§11).
 *
 * `jp('$.steps_output.x')` validates the path eagerly (reusing the shared
 * `JsonPathStringSchema`) and returns it as a branded `JsonPath` string — so a
 * malformed path fails at author/build time instead of slipping through to deploy
 * or runtime. Because it returns a real string, it is usable everywhere a
 * JSONPath string is expected: `inputMappings`/`outputMappings` keys and values,
 * transition conditions, and right-hand comparison operands. (It must stay a
 * primitive string so it serializes correctly inside mapping records — hence the
 * comparison builders below are attached to `jp` itself rather than chained off
 * its result, which an object would require.)
 *
 * Comparison builders produce transition-condition strings in the grammar the
 * runtime `evaluateCondition` understands (`<jsonpath> <op> <literal|jsonpath>`):
 *
 * ```ts
 * s.poll.when(jp.eq('$.poll.status', 'DONE'), s.done);
 * s.poll.when(jp.gt('$.poll.attempts', 5), s.giveUp);
 * ```
 */

/** A JSONPath string validated by {@link jp}. */
export type JsonPath = string & { readonly __allmaJsonPath: unique symbol };

/** A value comparable in a condition: a literal, or a (right-side) JSONPath. */
export type Comparable = string | number | boolean | null | JsonPath;

function validatePath(path: string): JsonPath {
  const result = JsonPathStringSchema.safeParse(path);
  if (!result.success) {
    throw new Error(
      `jp(${JSON.stringify(path)}) is not a valid JSONPath: ${result.error.issues[0]?.message ?? 'invalid'}`,
    );
  }
  return path as JsonPath;
}

/** Renders the right-hand side of a comparison: a JSONPath raw, other strings quoted. */
function renderOperand(value: Comparable): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  // A right-side JSONPath is emitted raw (the evaluator resolves it from context).
  if (value.startsWith('$.')) return value;
  if (value.includes("'") && value.includes('"')) {
    throw new Error(`jp comparison literal cannot contain both quote types: ${JSON.stringify(value)}`);
  }
  return value.includes("'") ? `"${value}"` : `'${value}'`;
}

function compare(path: string, op: string, value: Comparable): string {
  return `${validatePath(path)} ${op} ${renderOperand(value)}`;
}

/** The callable `jp` plus its comparison builders. */
export interface Jp {
  /** Validate a JSONPath and return it (branded). Throws on a malformed path. */
  (path: string): JsonPath;
  /** `path === value` */
  eq(path: string, value: Comparable): string;
  /** `path !== value` */
  ne(path: string, value: Comparable): string;
  /** `path > value` */
  gt(path: string, value: Comparable): string;
  /** `path >= value` */
  gte(path: string, value: Comparable): string;
  /** `path < value` */
  lt(path: string, value: Comparable): string;
  /** `path <= value` */
  lte(path: string, value: Comparable): string;
}

export const jp: Jp = Object.assign((path: string): JsonPath => validatePath(path), {
  eq: (path: string, value: Comparable): string => compare(path, '===', value),
  ne: (path: string, value: Comparable): string => compare(path, '!==', value),
  gt: (path: string, value: Comparable): string => compare(path, '>', value),
  gte: (path: string, value: Comparable): string => compare(path, '>=', value),
  lt: (path: string, value: Comparable): string => compare(path, '<', value),
  lte: (path: string, value: Comparable): string => compare(path, '<=', value),
});
