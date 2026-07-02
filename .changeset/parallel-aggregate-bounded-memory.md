---
"@allma/core-cdk": patch
---

Bound the memory of Distributed-Map / parallel aggregation to prevent `Runtime.OutOfMemory` in the
IterativeStepProcessor during `PARALLEL_AGGREGATE`.

The aggregator resolved every branch's output with an unbounded `Promise.all`, hydrating all N
branches' full contexts into memory simultaneously, and only applied the configured
`aggregationConfig.dataPath` afterwards — so even a `dataPath` couldn't reduce peak memory, because
the full contexts were already all retained. For a large fan-out (e.g. classifying many items) this
exhausted the lambda.

Branch resolution is now concurrency-bounded (`min(maxConcurrency, 20)`, default 10), and the
`dataPath` extraction is applied *during* resolution so each branch's full context is released as
soon as its (small) result is extracted — only the extracted values are retained. Setting a
`dataPath` on the aggregation now genuinely bounds aggregator memory. Aggregation semantics
(COLLECT_ARRAY/MERGE_OBJECTS/SUM, `failOnBranchError`, branch-error preservation, S3-pointer
resolution, output order) are unchanged.

Note: `COLLECT_ARRAY` with no `dataPath` still collects each branch's whole output — set a `dataPath`
to collect only the field you need when branch contexts are large.
