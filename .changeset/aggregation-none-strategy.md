---
"@allma/core-types": minor
"@allma/core-cdk": patch
---

Add a `NONE` parallel-aggregation strategy — a barrier that does not collect branch results.

`PARALLEL_FORK_MANAGER` always runs an aggregation step after the branches, and the existing
strategies (`COLLECT_ARRAY`/`MERGE_OBJECTS`/`SUM`) all resolve every branch's full context from S3
before combining — which exhausts the aggregator lambda on large fan-outs even when the combined
result isn't needed.

`strategy: "NONE"` skips resolving and collecting branch contexts entirely (the memory-heavy work),
writing a small summary to the step output instead of a large array. It still honors
`failOnBranchError` by reading only each branch's small inline status (no context is hydrated); with
`failOnBranchError: false` it is pure fire-and-forget and skips fetching branch results altogether.
Use it for side-effecting branches whose combined output you don't consume downstream.

Adds `AggregationStrategy.NONE` to `@allma/core-types` and its handling in the aggregator; documented
under the parallel-fork-manager reference. Existing strategies are unchanged.
