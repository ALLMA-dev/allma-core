---
"@allma/core-cdk": patch
---

Tighten the webhook-signing-secret Secrets Manager grants on the orchestration and lifecycle-dispatcher roles to least privilege: replace the unconditioned `arn:aws:secretsmanager:*:*:secret:*` resource with an account/region-scoped ARN plus a `secretsmanager:ResourceTag/allma-mcp-secret == 'true'` condition, matching the pattern already used elsewhere in the stack. Signing secrets must now live in the same account and region as the stack and be tagged `allma-mcp-secret=true`.
