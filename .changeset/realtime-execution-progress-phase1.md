---
"@allma/core-types": minor
"@allma/core-cdk": patch
"@allma/admin-shell": patch
---

feat(executions): live execution progress (current step, checkpoints, % complete)

Phase 1 of real-time execution status. Adds a read-time progress view for a single flow
execution and an optional per-step **checkpoint** so flows can report meaningful milestones
instead of every micro-step.

- `core-types`: optional `checkpoint` (`{ id, label, order? }`) on `StepInstance`; new
  `FLOW_EXECUTION_PROGRESS` admin route; new `ExecutionProgressResponse` / `ExecutionProgressNode`
  schemas.
- `core-cdk` (bundles `allma-app-logic`): new `GET /flow-executions/{id}/progress` endpoint that
  computes current step, stage (checkpoint), completed/total steps, a percentage, and a
  waiting-state flag from the execution's step records + flow definition. No new IAM/env — the
  existing execution-monitoring Lambda already reads the config table.
- `admin-shell`: `useGetExecutionProgress` hook (polls while running, stops on terminal status)
  and an `ExecutionProgressBar` on the execution detail page.

Backward-compatible: all additions are optional; flows that declare no checkpoints get a
step-count progress bar. Progress is derived from step records, so it requires execution logging
to be enabled for the flow. Orchestrator stamping, the sub-flow/branch tree, and client
notifications follow in later phases.
