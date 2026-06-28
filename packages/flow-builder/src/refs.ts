/**
 * Typed cross-artifact object references (RFC §5.7 endgame / Phase 3).
 *
 * Phase 1/2 turned *intra*-flow wiring into object refs (no string step ids).
 * The remaining stringly-typed surface is *cross*-artifact: a step's
 * `promptTemplateId`, `subFlowDefinitionId`, `flowDefinitionId`, and
 * `mcpConnectionId` were bare strings. Phase 3 lets the factories accept the
 * authored artifact object (or its typed handle) directly, so a renamed prompt
 * or a typo is a compile/build error instead of a dangling id.
 *
 * Each ref carries a discriminating `kind`, so a `PromptRef` cannot be passed
 * where a `FlowRef` is expected. `external('id')` still returns a plain string,
 * which remains assignable to the `string` side of every ref-accepting field.
 */

/** A handle to a prompt template authored by {@link definePrompt}. */
export interface PromptRef {
  readonly id: string;
  readonly kind: 'prompt';
}

/** A handle to a flow authored by `defineFlow` / `class Flow`. */
export interface FlowRef {
  readonly id: string;
  readonly kind: 'flow';
}

/** A handle to a reusable step definition authored by {@link defineStep}. */
export interface StepDefRef {
  readonly id: string;
  readonly kind: 'stepDefinition';
}

/** A handle to an MCP connection authored by {@link defineMcpConnection}. */
export interface McpConnectionRef {
  readonly id: string;
  readonly kind: 'mcpConnection';
}

/** Any typed cross-artifact handle. */
export type AnyArtifactRef = PromptRef | FlowRef | StepDefRef | McpConnectionRef;

/**
 * Resolves a cross-artifact reference to its bare string id. Accepts either an
 * `external('id')` / hand-written string, or any object carrying an `id` (a
 * typed ref/handle). Used by the factories to normalize a ref into the wire
 * field the artifact stores.
 */
export function refId(value: string | { readonly id: string }): string {
  return typeof value === 'string' ? value : value.id;
}

/**
 * Returns a shallow copy of `config` with each listed key normalized from a
 * possible object ref to its string id. Keys that are absent are left untouched.
 * Accepts any object shape (the typed factory configs) and returns the plain
 * record the `Step` payload stores.
 */
export function normalizeRefs(config: object, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(config as Record<string, unknown>) };
  for (const key of keys) {
    const value = out[key];
    if (value !== undefined && value !== null && typeof value === 'object' && 'id' in (value as object)) {
      out[key] = (value as { id: string }).id;
    }
  }
  return out;
}
