---
"@allma/admin-shell": minor
---

Add the "Unlock for visual editing" action for code-owned flows (Flows-as-Code Phase 2, RFC §6).

The `useUnlockFlowForVisualEditing` mutation and an editor button (behind a confirmation modal) flip
a code-owned flow's `authoringSource` from `'code'` back to `'visual'`, handing ownership to the
Visual Editor. This is the explicit, one-way transfer counterpart to `allma-flows eject`; the marker
flip is the persisted record of the transfer, and the editor re-renders editable afterward.
