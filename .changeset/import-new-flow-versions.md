---
"@allma/core-cdk": minor
"@allma/flow-builder": patch
---

Import (CDK deploy and `POST /v1/allma/import`) now creates a new version of an existing flow or prompt when the imported version number does not exist yet, and publishes it when `isPublished` is true. Previously this failed the import.
