---
"@allma/core-types": minor
"@allma/core-sdk": minor
"@allma/core-cdk": minor
---

Add a pluggable redactor to the core-sdk logger.

- `@allma/core-sdk`: new `setLogRedactor(fn)`, `createKeyPatternRedactor({ keys, patterns, replacement? })` and `LogRedactor`. The redactor runs on `details` and `message` at every level. If it throws or returns the wrong type, the line is written with `message` and `details` set to `'[REDACTION_FAILED]'`. The logger also registers a key/pattern redactor from the `LOG_REDACTION_CONFIG` env var when no redactor is registered yet. With no redactor and no env var, output is unchanged. `sendCloudFormationResponse` now logs through the structured logger instead of `console`.
- `@allma/core-types`: new `LogRedactionConfigSchema` / `LogRedactionConfig` and `ENV_VAR_NAMES.LOG_REDACTION_CONFIG`.
- `@allma/core-cdk`: new optional `StageConfig.logging.redaction`. The platform Lambdas get it through `LOG_REDACTION_CONFIG`, so platform log lines are redacted too.

Upgrade note: platform Lambdas no longer write the raw event dumps (iterative step processor `RAW_EVENT`, async-handler context, flow-start SQS body, MCP error body) with `console.log`. They now log at `DEBUG`, so they are hidden at the default `INFO` level. Set `LOG_LEVEL=DEBUG` to see them again.
