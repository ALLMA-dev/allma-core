---
"@allma/core-cdk": patch
---

Fix the per-flow execution list returning empty (or dropping historical executions) for busy flows.
Step-execution records are denormalized with `flowDefinitionId` + `startTime`, so they now share the
`GSI_ByFlow_StartTime` partition with flow-execution records. DynamoDB applies `Limit` before
`FilterExpression`, so a single Limited query could return a whole page of step records that were
then filtered out, yielding an empty list even though executions exist. `listExecutions` now pages
through the index (bounded by a page cap) and skips step records, and returns a continuation token
built from the last record actually returned so pagination never skips entries.
