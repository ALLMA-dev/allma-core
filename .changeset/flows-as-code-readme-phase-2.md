---
"@allma/flow-builder": patch
---

Document Phase 2 in the README: `jp()` / `class Flow` ergonomics, `allma-flows eject` and `check
--remote`, the Visual-Editor coexistence model (read-only enforcement + one-way ownership transfer),
and the author-time `customConfig` enforcement decision (the builder enforces strictly at build time
while the shared wire-contract schema stays advisory, because `customConfig` fields may be supplied
at runtime via `inputMappings`).
