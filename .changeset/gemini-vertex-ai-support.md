---
"@allma/core-types": minor
"@allma/core-cdk": minor
---

Add optional support for calling Gemini through **Vertex AI** instead of the
key-based Gemini Developer API, to escape the low rate limits of API-key access.

The `LLM_INVOCATION` Gemini adapter now constructs a Vertex AI client when
`gemini.useVertex` is set in the stage config (new `gemini` block:
`useVertex`, `gcpProjectId`, `gcpLocation`, optional `serviceAccountKeySecretArn`).
Authentication uses a GCP service-account key from Secrets Manager when provided,
otherwise Application Default Credentials / Workload Identity Federation. The CDK
construct injects the new env vars (`GEMINI_USE_VERTEX`, `GCP_PROJECT_ID`,
`GCP_LOCATION`, `GCP_SA_KEY_SECRET_ARN`) onto the iterative step processor and
grants read access to the service-account key secret when configured.

Fully backward-compatible and feature-flagged: with `useVertex` unset (the
default), Gemini keeps using the existing API key from `aiApiKeySecretArn`.
