---
"@allma/core-cdk": patch
---

Classify DynamoDB ValidationException and non-retryable client errors as PermanentStepError to prevent spurious retries
