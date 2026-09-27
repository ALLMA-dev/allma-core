---
"@allma/core-cdk": patch
---

Route DynamoDB access in six admin and flow Lambda handlers (dashboard stats, flow control, step management, email ingress, execution-lifecycle dispatcher, resume flow) through service classes instead of per-handler `ddbDocClient` calls. No behaviour change.
