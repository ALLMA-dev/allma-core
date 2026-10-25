---
'@allma/core-types': patch
'@allma/admin-shell': patch
'@allma/core-cdk': patch
---

Add `outputValidation` path type checks (`array`, `object`, `string`, `number`, `boolean`) to `@allma/core-types`, enforce them in `step-executor` to raise `ContentBasedRetryableError`, and document the configuration in `@allma/admin-shell` and docs.
