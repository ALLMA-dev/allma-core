---
"@allma/core-cdk": patch
---

LLM_INVOCATION model health now counts only invocation failures; flow configuration errors, permission errors and safety blocks no longer mark a model unhealthy for other flows.
