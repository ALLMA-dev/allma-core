/**
 * Deterministic JSON serialization. Object keys are emitted in sorted order at
 * every depth so the same flow always produces byte-identical output regardless
 * of authoring/insertion order — a precondition for the CI drift check (RFC §8).
 * Array order is preserved (it is semantically meaningful).
 */

/** Recursively returns a copy of `value` with every object's keys sorted. */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/** Serializes `value` to deterministic, pretty-printed JSON with a trailing newline. */
export function stableStringify(value: unknown): string {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}
