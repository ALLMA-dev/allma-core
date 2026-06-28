---
"@allma/flow-builder": minor
---

Add `allma-flows eject` — JSON → TypeScript codegen for adopting a flow into code (Flows-as-Code
Phase 2, RFC §6).

`ejectFlow(flow)` (and the new `eject` CLI command) turn a committed/deployed flow definition back
into a `.flow.ts` builder source: typed-payload steps map to their factories, known system modules
to their registry-typed wrappers and consumer modules to the generic escape hatches, and
instance/wiring fields are re-emitted as chained `.displayName()`/`.inputs()`/`.next()`/`.when()`/
`.onError({ fallback })` calls. The output is round-trippable — `build()`-ing the generated source
reproduces the original artifact (modulo the `authoringSource:'code'` stamp). This is the adoption /
one-way ownership-transfer path from the Visual Editor into code.
