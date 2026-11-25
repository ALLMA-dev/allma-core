---
'@allma/core-cdk': patch
'@allma/core-types': minor
---

A step's `onError` now applies when a synchronous sub-flow fails, when a `PARALLEL_FORK_MANAGER` with `failOnBranchError` has a failed branch, and when a wait or polling step fails or times out. Before, these failures ended the flow FAILED without a FAILED step record and without the fallback. The FAILED record of a sync sub-flow step carries the child's error name, message and execution ARN. A step without `onError` still fails the flow. `ProcessorInput` has a new optional `asyncTaskFailure` field.
