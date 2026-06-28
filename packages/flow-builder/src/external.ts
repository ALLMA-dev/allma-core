/**
 * Marks a cross-artifact id (a `flowDefinitionId`, `promptTemplateId`, or
 * `stepDefinitionId`) as intentionally living outside the current config dir, so
 * the project-level resolution pass (RFC §5.7) does not flag it as dangling.
 *
 * It returns the id verbatim — the marker is recorded out-of-band via the
 * {@link EXTERNAL_IDS} set so it is invisible to serialization — and documents
 * intent at the call site.
 *
 * @example startSubFlow({ flowDefinitionId: external('some-platform-flow') })
 */
const EXTERNAL_IDS = new Set<string>();

export function external(id: string): string {
  EXTERNAL_IDS.add(id);
  return id;
}

/** Whether `id` was wrapped in {@link external} at least once this process. */
export function isExternal(id: string): boolean {
  return EXTERNAL_IDS.has(id);
}
