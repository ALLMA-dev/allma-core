---
"@allma/admin-shell": minor
---

Enforce read-only editing for code-owned flows in the Flow Editor (Flows-as-Code Phase 2, RFC §6).

When a flow's `authoringSource === 'code'`, the editor now opens read-only: structural edits
(drag, connect, delete, add step, step/edge config) and Save are disabled, and a "Managed in code"
banner explains that the source must be edited and redeployed. Viewing and the single-step Sandbox
stay fully available, and the existing Dagre auto-layout positions code-owned flows on open. The
read-only decision is centralized in a shared `resolveEditorReadOnly` helper used by the page, the
canvas, and the step/edge panels, so published-version and code-owned gating stay consistent.
