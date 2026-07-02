---
"@allma/core-cdk": minor
---

Give the InitializeFlow and FinalizeFlow lambdas dedicated, larger memory allocations to prevent
`Runtime.OutOfMemory`.

Both lambdas materialize the entire flow context in memory — Finalize hydrates the (often
S3-offloaded) context, `JSON.stringify`s it, and re-offloads it; Initialize resolves the initial
context pointer — yet they ran at the 256 MB `default`, while the `IterativeStepProcessor` that
builds the very same context runs at 2048 MB. For flows with large contexts (e.g. sub-flows that
accumulate sizeable `steps_output`), Finalize would OOM at 256 MB when returning.

Adds `lambdaMemorySizes.initializeFlow` (default 1024 MB) and `lambdaMemorySizes.finalizeFlow`
(default 2048 MB, matching the step processor) to the stage config, and wires them into the two
lambdas. Both are overridable per stage. Existing stage configs are unaffected — the new keys are
deep-merged from the defaults.
