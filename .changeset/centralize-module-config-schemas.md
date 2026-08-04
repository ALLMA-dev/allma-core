---
"@allma/core-types": minor
"@allma/core-cdk": patch
---

Centralize the remaining system-module `customConfig` schemas into
`@allma/core-types`, completing the module-config registry started in Phase 0.

- **`@allma/core-types`**: add and export the `customConfig` schemas (and their
  inferred types) for the 13 system modules that previously validated their
  config only inside `allma-app-logic`: `ddb-query-to-s3-manifest`,
  `s3-list-files`, `sqs-get-queue-attributes`, `sqs-receive-messages`,
  `dynamodb-query-and-update`, `dynamodb-update-item`, `array-aggregator`,
  `compose-object-from-input`, `date-time-calculator`, `flatten-array`,
  `generate-array`, `join-data`, and `generate-uuid`. All 16 system modules are
  now registered in `SYSTEM_MODULE_CONFIG_SCHEMAS`, so
  `SYSTEM_MODULES_WITHOUT_CONFIG_SCHEMA` is now empty. A new
  `QueueAttributeNameSchema` re-declares the SQS queue-attribute enum so
  core-types stays free of an `@aws-sdk/client-sqs` dependency. The Phase 0
  completeness test continues to enforce that every module is classified.
- **`@allma/core-cdk`**: rebuilt to pick up the bundled `allma-app-logic`
  handlers, which now import these schemas from `@allma/core-types` instead of
  re-declaring them locally (single source of truth; no runtime behavior change).

Additive and backward compatible: the schemas are byte-for-byte equivalent to the
ones the runtime handlers already enforced, so no flow that validates today stops
validating.
