---
"@allma/flow-builder": minor
---

Add the `jp()` JSONPath helper and the `class Flow` OO facade (Flows-as-Code Phase 2, RFC §5.2/§5.6).

`jp('$.steps_output.x')` validates a JSONPath eagerly (reusing the shared `JsonPathStringSchema`) and
returns it as a branded string for use in mappings, conditions, and right-hand operands — a malformed
path throws at author time. Its comparison builders (`jp.eq/ne/gt/gte/lt/lte`) emit transition-condition
strings in the exact grammar the runtime evaluator understands.

`class Flow` (`new Flow(meta)`, `addStep(id, draft)`, `start(ref)`, `build()`/`toExport()`) is an
imperative authoring facade over the same internals as `defineFlow`; both share one build + strict
validation core and produce byte-identical artifacts.
