---
"@allma/core-sdk": patch
"@allma/core-cdk": patch
---

Fix concurrent fork branches losing state. Branches share one flow execution id, so two branches that offloaded at the same step in the same millisecond wrote the same S3 key, and one overwrote the other. Offloaded payload, field, step-record and manifest keys now include a random UUID. Readers follow the stored pointer, so keys written by older versions stay readable.
