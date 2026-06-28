import { jp, type JsonPath, type Comparable } from './jp.js';

/**
 * Opt-in typed-context generics for JSONPath authoring (RFC §11).
 *
 * `jp(...)` validates a path's *grammar* at build time, but cannot know whether
 * `$.steps_output.summarize.text` actually exists in a given flow's context — a
 * renamed context field stays a silent runtime miss. `flowContext<Ctx>()` closes
 * that gap **opt-in**: it returns a `jp`-shaped helper whose path argument is
 * constrained to the dotted key paths of a caller-supplied context type `Ctx`, so
 * a typo or a stale path is a **compile error**.
 *
 * ```ts
 * interface Ctx { steps_output: { summarize: { text: string } }; flow_variables: { bucket: string } }
 * const $ = flowContext<Ctx>();
 * s.store.inputs({ 'body': $('$.steps_output.summarize.text') });   // ok
 * s.store.inputs({ 'body': $('$.steps_output.summarize.txet') });   // compile error
 * ```
 *
 * ### Why opt-in, and why bounded depth (the TS7056 guard)
 * Threading `Ctx` through `Step`/`StepRef`/`StepDraft` would re-instantiate types
 * across the 21-member step union — exactly the inference blow-up this package is
 * built to avoid (RFC §9). Instead the generic lives **only** on this helper, and
 * the path-enumeration type {@link ContextPaths} is bounded to a recursion depth
 * of 3. Default `jp`/`inputs`/`outputs` are untouched (plain `string`). The CI
 * type-cost guard measures the cost of this file; if a deeper context is needed,
 * raise the depth deliberately and re-measure rather than letting it grow
 * implicitly. Arrays are treated as leaves (index into them with runtime `jp`).
 */

/** Decrements the depth counter for bounded recursion. */
type PrevDepth = [never, 0, 1, 2, 3];

/** Joins a key with a nested sub-path, omitting the dot when the tail is empty. */
type Join<K extends string, R extends string> = R extends '' ? K : `${K}.${R}`;

/** Enumerates dotted key paths of `T` up to `Depth` levels (arrays are leaves). */
type DottedPaths<T, Depth extends number> = [Depth] extends [never]
  ? never
  : Depth extends 0
    ? never
    : T extends readonly unknown[]
      ? never
      : T extends object
        ? {
            [K in keyof T & string]: NonNullable<T[K]> extends readonly unknown[]
              ? K
              : NonNullable<T[K]> extends object
                ? K | Join<K, DottedPaths<NonNullable<T[K]>, PrevDepth[Depth]>>
                : K;
          }[keyof T & string]
        : never;

/** Every `$.`-rooted JSONPath valid for a context shaped like `Ctx` (plus bare `$`). */
export type ContextPaths<Ctx> = '$' | `$.${DottedPaths<Ctx, 3>}`;

/** A `jp`-shaped helper whose path argument is constrained to `ContextPaths<Ctx>`. */
export interface TypedJp<Ctx> {
  /** Validate a context path (typo-checked against `Ctx`) and return it branded. */
  (path: ContextPaths<Ctx>): JsonPath;
  /** `path === value` */
  eq(path: ContextPaths<Ctx>, value: Comparable): string;
  /** `path !== value` */
  ne(path: ContextPaths<Ctx>, value: Comparable): string;
  /** `path > value` */
  gt(path: ContextPaths<Ctx>, value: Comparable): string;
  /** `path >= value` */
  gte(path: ContextPaths<Ctx>, value: Comparable): string;
  /** `path < value` */
  lt(path: ContextPaths<Ctx>, value: Comparable): string;
  /** `path <= value` */
  lte(path: ContextPaths<Ctx>, value: Comparable): string;
}

/**
 * Returns a {@link TypedJp} bound to a caller-supplied context type `Ctx`. The
 * runtime behavior is identical to {@link jp} (the same grammar validation runs);
 * the only difference is the compile-time path constraint.
 */
export function flowContext<Ctx>(): TypedJp<Ctx> {
  return jp as unknown as TypedJp<Ctx>;
}
