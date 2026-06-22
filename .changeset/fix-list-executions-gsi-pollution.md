---
---

fix(executions): restore the flow-executions list for busy flows.

`listExecutions` queries `GSI_ByFlow_StartTime` (keyed on `flowDefinitionId` + `startTime`) with a
`Limit` and a `FilterExpression` on `itemType`. The step-statistics work denormalized
`flowDefinitionId` onto step-execution records, which — combined with their existing `startTime` —
pulled every step record into that index. Because DynamoDB applies `Limit` before the filter, busy
flows returned pages made entirely of (filtered-out) step records, so the API responded with
`items: []` and those flows' executions disappeared from the admin UI. The service now pages through
the index, accumulating matching flow-execution records until the requested page is filled or the
partition is exhausted, and derives the `nextToken` from the last record actually returned.

(`allma-app-logic` is private and unpublished, so this changeset intentionally bumps no package.)
