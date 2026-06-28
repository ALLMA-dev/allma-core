/**
 * Decides whether the Flow Editor must open read-only, and why.
 *
 * Two independent reasons make a flow non-editable in the canvas:
 *  - `'published'` — the loaded version is published (existing behaviour); unpublish
 *    or create a new version to edit.
 *  - `'code'` — the flow is managed in code (`authoringSource === 'code'`,
 *    Flows-as-Code RFC §6). Edit the source and redeploy, or explicitly unlock it
 *    for visual editing.
 *
 * Published takes precedence for the primary `reason` (so the existing
 * unpublish affordance keeps working), but `isCodeOwned` is reported
 * independently so the "Managed in code" banner can render even for a published
 * code-owned version. Viewing and the Sandbox stay enabled in all cases — only
 * structural edits and Save are gated by `readOnly`.
 */
export interface EditorReadOnlyState {
  readOnly: boolean;
  reason: 'published' | 'code' | null;
  isCodeOwned: boolean;
}

/** The minimal slice of a flow this decision needs. */
export interface ReadOnlyFlowInput {
  isPublished?: boolean;
  authoringSource?: 'code' | 'visual';
}

export function resolveEditorReadOnly(
  flow: ReadOnlyFlowInput | null | undefined,
): EditorReadOnlyState {
  const isPublished = flow?.isPublished === true;
  const isCodeOwned = flow?.authoringSource === 'code';
  const reason = isPublished ? 'published' : isCodeOwned ? 'code' : null;
  return { readOnly: isPublished || isCodeOwned, reason, isCodeOwned };
}
