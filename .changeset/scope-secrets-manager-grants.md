---
"@allma/core-cdk": minor
---

**Upgrade note:** webhook signing secrets must now be in the same AWS account and region as the Allma stack and carry the tag `allma-mcp-secret=true`. Tag existing signing secrets before you deploy this version; otherwise webhook signing fails with access denied at runtime.

The orchestration and lifecycle-dispatcher roles no longer get Secrets Manager access to `arn:aws:secretsmanager:*:*:secret:*`. They get an account/region-scoped ARN with a `secretsmanager:ResourceTag/allma-mcp-secret == 'true'` condition, the same least-privilege pattern the rest of the stack uses.
