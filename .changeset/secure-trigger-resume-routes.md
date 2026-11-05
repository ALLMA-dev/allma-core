---
'@allma/core-types': minor
'@allma/core-sdk': minor
'@allma/core-cdk': minor
---

Secure the public flow-trigger (`POST /allma/flows/{flowId}/trigger`) and resume (`POST /allma/resume`) routes. Both routes now enforce AWS IAM (SigV4) at the gateway by default; set `adminApi.webhookApiKeySecretArn` to instead accept an `x-api-key` / `Authorization: Bearer` caller secret that the Lambda verifies against Secrets Manager. The authenticated caller identity is carried as `ownerPrincipal` through the flow run and stamped onto `WAIT_FOR_EXTERNAL_EVENT` continuation records, so a resume now atomically verifies the caller owns the waiting run (403 on mismatch, 404 on missing key) before sending `SendTaskSuccess`. The internal system resume from `finalize-flow` authenticates its own call (SigV4 and/or a body HMAC signature).
