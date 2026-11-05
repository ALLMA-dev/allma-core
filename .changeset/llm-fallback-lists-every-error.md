---
"@allma/core-cdk": patch
---

LLM_INVOCATION: when every model fails, the error message lists each model's failure, primary first. The Gemini adapter now reports the real HTTP status in errorDetails.status. Because the adapter now reads the top-level ApiError status, it also retries a Gemini ApiError with status 429 or 5xx with its own backoff before it moves to the next fallback.
