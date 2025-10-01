---
title: dynamodb-query-and-update
---

# `system/dynamodb-query-and-update`

### Purpose

A powerful data-saving module that first **queries** a DynamoDB table to find one or more items and then attempts to **atomically update** each one with a condition. This pattern is ideal for implementing work queues, where multiple workers might try to "claim" the same job. The conditional update ensures that only one worker can successfully claim an item.

---

### Configuration Parameters

This module receives its full configuration by merging the step's `customConfig` and its `inputMappings`.

| Parameter                           | Type       | Required | Description                                                                                                                                                                           |
| ----------------------------------- | ---------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `query.tableName`                   | `string`   |   Yes    | The name of the DynamoDB table.                                                                                                                                                       |
| `query.keyAttributes`               | `string[]` |    No    | **Recommended for performance.** An array of primary key attribute names (e.g., `["pk", "sk"]`). If omitted, a `DescribeTable` call is made, which is less efficient.                    |
| `query.indexName`                   | `string`   |    No    | The name of the GSI to query to find candidate items.                                                                                                                                 |
| `query.keyConditionExpression`      | `string`   |   Yes    | The query expression to find items to update.                                                                                                                                         |
| `query.expressionAttributeValues`   | `object`   |   Yes    | Values for placeholders in the query expression.                                                                                                                                      |
| `query.limit`                       | `number`   |    No    | The maximum number of items to query (and attempt to update). Defaults to 100.                                                                                                        |
| `update.updateExpression`           | `string`   |   Yes    | The DynamoDB update expression to apply to each found item (e.g., `SET #status = :newStatus`).                                                                                        |
| `update.expressionAttributeNames`   | `object`   |    No    | Names for placeholders in the update/condition expressions.                                                                                                                           |
| `update.expressionAttributeValues`  | `object`   |    No    | Values for placeholders in the update/condition expressions.                                                                                                                          |
| `update.conditionExpression`        | `string`   |    No    | **Crucial for atomicity.** An additional condition that must be true for the update to succeed (e.g., `#status = :pendingStatus`). This prevents race conditions. |

---

### Input & Output

#### Input Mappings & Literals

Use `inputMappings` and `literals` to construct the full configuration object described above. This is how you provide dynamic values to your query and update expressions.

#### Output Schema

The output contains the items that were **successfully** updated and a count.
```json
{
  "updatedItemCount": 1,
  "items": [
    {
      "pk": "JOB#123",
      "status": "CLAIMED",
      "claimedBy": "worker-abc"
    }
  ]
}
```

**Output Mapping Example:**
```json
"outputMappings": {
  "$.steps_output.claimed_jobs": "$.items"
}
```

---

### Full JSON Example

This step attempts to claim up to 5 pending jobs from a queue table by querying an index and then conditionally updating their status to "CLAIMED".

```json
"claim_pending_jobs": {
  "stepInstanceId": "claim_pending_jobs",
  "displayName": "Atomically Claim Pending Jobs",
  "stepType": "DATA_SAVE",
  "moduleIdentifier": "system/dynamodb-query-and-update",
  "literals": {
    "query": {
      "tableName": "JobQueueTable",
      "indexName": "StatusGSI",
      "keyConditionExpression": "#status = :status",
      "limit": 5,
      "keyAttributes": ["jobId"]
    },
    "update": {
      "updateExpression": "SET #status = :newStatus, #claimedBy = :workerId",
      "conditionExpression": "#status = :status"
    }
  },
  "inputMappings": {
    "query.expressionAttributeValues": {
      ":status": "$.flow_variables.statuses.pending"
    },
    "update.expressionAttributeNames": {
      "#status": "$.flow_variables.field_names.status",
      "#claimedBy": "$.flow_variables.field_names.claimedBy"
    },
    "update.expressionAttributeValues": {
      ":newStatus": "$.flow_variables.statuses.claimed",
      ":workerId": "$.flowExecutionId",
      ":status": "$.flow_variables.statuses.pending"
    }
  },
  "outputMappings": {
    "$.steps_output.claimed_jobs_list": "$.items"
  },
  "defaultNextStepInstanceId": "process_claimed_jobs"
}
```