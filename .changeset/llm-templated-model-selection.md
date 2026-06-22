---
"@allma/core-types": minor
---

`LLM_INVOCATION` model selection now supports Handlebars templating. The `llmProvider`, `modelId`,
and every `fallbacks[]` entry are rendered against the flow context at runtime (the same context as
`templateContextMappings`), so flows can centralize/parameterize model choice, e.g.
`"modelId": "{{config.llmModels.bedrockSonnet}}"`. Plain values without `{{ }}` are unchanged, so
existing flows are unaffected. Resolved values are validated after rendering: an empty `modelId` or
an `llmProvider` that does not resolve to a valid provider fails the step with a clear error.
