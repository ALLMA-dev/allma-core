import { describe, it, expect } from 'vitest';
import { resolveEditorReadOnly } from '../../../../../src/features/flows/editor/read-only.js';

describe('resolveEditorReadOnly', () => {
  it('is editable for a draft, editor-owned flow', () => {
    expect(resolveEditorReadOnly({ isPublished: false, authoringSource: 'visual' })).toEqual({
      readOnly: false,
      reason: null,
      isCodeOwned: false,
    });
  });

  it('treats a missing flow as not read-only (still loading)', () => {
    expect(resolveEditorReadOnly(undefined)).toEqual({ readOnly: false, reason: null, isCodeOwned: false });
    expect(resolveEditorReadOnly(null)).toEqual({ readOnly: false, reason: null, isCodeOwned: false });
  });

  it('is read-only with reason "published" for a published flow', () => {
    expect(resolveEditorReadOnly({ isPublished: true })).toEqual({
      readOnly: true,
      reason: 'published',
      isCodeOwned: false,
    });
  });

  it('is read-only with reason "code" for a code-owned draft', () => {
    expect(resolveEditorReadOnly({ isPublished: false, authoringSource: 'code' })).toEqual({
      readOnly: true,
      reason: 'code',
      isCodeOwned: true,
    });
  });

  it('gives published precedence for the primary reason but still reports code ownership', () => {
    // A published, code-owned version: the unpublish affordance must keep working
    // (reason='published'), yet the "Managed in code" banner must still show.
    expect(resolveEditorReadOnly({ isPublished: true, authoringSource: 'code' })).toEqual({
      readOnly: true,
      reason: 'published',
      isCodeOwned: true,
    });
  });
});
