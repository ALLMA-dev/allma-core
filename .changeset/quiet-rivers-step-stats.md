---
"@allma/core-types": minor
"@allma/core-cdk": minor
"@allma/admin-shell": minor
---

Add per-step execution statistics. A new Admin Panel **Statistics** view and
`GET /allma/dashboard/step-stats` admin API report step counts, failures, average duration, and
LLM token usage broken down by step type, by flow, and over time (per-hour / per-day) for the last
24 hours and 7 days. Step-execution log records now carry `flowDefinitionId`, `flowDefinitionVersion`
and (for LLM steps) `inputTokens` / `outputTokens`, and a new `GSI_StepStats_ByTime` index backs the
on-read aggregation.
