---
title: ddb-query-to-s3-manifest
---

# `system/ddb-query-to-s3-manifest`

### Purpose

A powerful data loading module that queries a DynamoDB table for a large number of items and streams the results into a single **JSON Lines (.jsonl)** file in S3. The primary use case is to prepare a large dataset for processing with a `PARALLEL_FORK_MANAGER` step in **S3 Distributed Map** mode.

The step's output is an **S3 Pointer object**.

---

### Configuration Parameters (`customConfig`)

| Parameter                       | Type     | Required | Description                                                                                                         |
| ------------------------------- | -------- | :------: | ------------------------------------------------------------------------------------------------------------------- |
| `query.tableName`               | `string` |   Yes    | The name of the DynamoDB table to query.                                                                            |
| `query.indexName`               | `string` |    No    | The name of the Global Secondary Index (GSI) to query, if applicable.                                               |
| `query.keyConditionExpression`  | `string` |   Yes    | The DynamoDB key condition expression (e.g., `pk = :pk and begins_with(sk, :skPrefix)`).                            |
| `query.expressionAttributeValues` | `object` |   Yes    | An object containing the values for placeholders in the expression (e.g., `{":pk": "USER#123"}`).                  |
| `query.projectionExpression`    | `string` |    No    | A comma-separated list of attributes to retrieve. If omitted, all attributes are returned.                          |
| `destination.bucketName`        | `string` |   Yes    | The name of the S3 bucket where the manifest file will be saved.                                                      |
| `destination.key`               | `string` |   Yes    | The full S3 key (path and filename) for the manifest file (e.g., `manifests/{{flowExecutionId}}.jsonl`).             |

:::tip Note
All configuration fields support Handlebars templating, allowing you to build dynamic queries and destinations.
:::

---

### Input & Output

#### Input Mappings

This module is configured entirely via `customConfig` and does not use `inputMappings`.

#### Output Schema

The output is an object containing the S3 Pointer and the total item count.
```json
{
  "manifest": {
    "_s3_output_pointer": {
      "bucket": "your-bucket-name",
      "key": "manifests/your-exec-id.jsonl"
    }
  },
  "itemCount": 15000
}
```

**Output Mapping Example:**
To make the manifest available to a subsequent parallel step:
```json
"outputMappings": {
  "$.steps_output.user_manifest": "$.manifest"
}
```

---

### Full JSON Example

This step queries all items for a specific user from a DynamoDB table and creates a manifest file in S3, which can then be used as the `itemsPath` for a parallel step.

```json
"generate_user_manifest": {
  "stepInstanceId": "generate_user_manifest",
  "displayName": "Generate User Data Manifest",
  "stepType": "DATA_LOAD",
  "moduleIdentifier": "system/ddb-query-to-s3-manifest",
  "customConfig": {
    "query": {
      "tableName": "MyDataTable",
      "keyConditionExpression": "PK = :partitionKey",
      "expressionAttributeValues": {
        ":partitionKey": "USER#{{initialContextData.userId}}"
      }
    },
    "destination": {
      "bucketName": "my-allma-data-bucket",
      "key": "manifests/{{initialContextData.userId}}-{{flowExecutionId}}.jsonl"
    }
  },
  "outputMappings": {
    "$.steps_output.manifest_details": "$"
  },
  "defaultNextStepInstanceId": "process_manifest_in_parallel"
}
```