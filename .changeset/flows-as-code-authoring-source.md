---
"@allma/core-types": minor
"@allma/flow-builder": minor
---

Add the `authoringSource` flow-ownership marker (Flows-as-Code Phase 2, RFC §6).

`FlowDefinition`, `FlowAuthoringFormat`, and `FlowDefinitionObjectSchema` gain an optional
`authoringSource?: 'code' | 'visual'` field that defaults to `'visual'`, so every existing flow is
unchanged. `@allma/flow-builder`'s `build()` now stamps `'code'` on the flows it emits, marking them
as managed in code. This is the persisted signal the Visual Editor uses to open code-owned flows
read-only. The change is additive and backward compatible.
