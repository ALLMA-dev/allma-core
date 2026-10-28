---
"@allma/core-cdk": patch
---

Validate the resume payload byte size against `MAX_CONTEXT_DATA_SIZE_BYTES` before consuming the continuation record in `resume-flow`, so an oversized resume request returns `413 PAYLOAD_TOO_LARGE` without deleting the waiting flow's task token.
