---
"@allma/core-types": minor
"@allma/core-cdk": patch
"@allma/admin-shell": patch
---

feat(executions): execution tree across sub-flows & lag-free progress stamping (phase 2)

Builds on the Phase 1 single-execution progress view (Pillars B and the authoritative half of A
from the real-time execution status design).

- **Orchestrator stamping (Pillar A).** The iterative step processor now stamps the execution's
  `METADATA` record at each step boundary with the current step, completed/total step counts, the
  reached checkpoint, and a percentage — giving the UI/clients a single, lag-free item to poll. A
  new `UPDATE_PROGRESS` logger action performs a guarded, monotonic `UpdateItem`. The Phase 1
  read-time derivation remains as a fallback for executions stamped before this change.
- **Structured execution-tree linkage (Pillar B).** Sub-flows now record `parentFlowExecutionId`,
  `parentStepInstanceId`, `rootFlowExecutionId`, `depth`, and `executionKind` on their own metadata
  record (sync and async sub-flows; a top-level execution is `ROOT`/depth 0). A new
  `GSI_ByRoot` index returns a whole tree in one query.
- **Bubble-up roll-up.** On a checkpoint change a sync sub-flow writes a one-line `liveStatus` onto
  the root record so a single GET of the root reflects the deepest active work even while the parent
  is suspended. Async sub-flows are linked but not bubbled into the root headline.
- **Tree read API.** `GET /flow-executions/{id}/progress?mode=tree|single` — `single` (stamped
  preferred) returns one node; `tree` assembles the nested sub-flow tree with a headline pointing
  at the deepest active leaf.
- **Admin UI.** The execution progress bar renders the nested sub-flow tree, each node with its own
  bar, current-step line, and waiting state.

All new fields are optional and backward-compatible: flows adopting nothing keep working, and
pre-existing executions return a single-node tree. In-memory parallel branches share the parent's
`flowExecutionId` and remain surfaced via the existing branch-steps view rather than as tree nodes.
