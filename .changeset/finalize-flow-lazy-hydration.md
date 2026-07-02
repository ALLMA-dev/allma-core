---
"@allma/core-cdk": patch
---

Stop FinalizeFlow from materializing the whole flow context in memory when it isn't needed —
removing the root cause of `Runtime.OutOfMemory` on large (e.g. sub-flow) returns rather than only
raising the lambda's memory ceiling.

Previously FinalizeFlow always hydrated the (often S3-offloaded) context, `JSON.stringify`d it, and
re-offloaded it — even when it only needed to hand back a pointer. It now inspects the incoming
context without hydrating and takes a fast path: when the context is already offloaded and neither a
system-level resume nor `onCompletionActions` require it in memory, the existing S3 pointer is passed
straight through — no download, no re-serialize, no re-offload — so peak memory is independent of
context size. When resume or completion actions do need the data, it hydrates exactly as before.

To make that decision cheaply (the resume key lives inside the offloaded blob), context offloading is
centralized in a new `offloadFlowContextIfLarge` helper that preserves a small set of "sticky"
top-level markers (currently `_flow_resume_key`) alongside the pointer. This also de-duplicates the
offload-and-wrap pattern that was copy-pasted across the initializer, step processor, and parallel
handler. No public API or wire-contract changes.
