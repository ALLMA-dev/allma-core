---
title: dynamodb-data-loader
---

# `system/dynamodb-data-loader`

### Purpose

A flexible data loading module that performs a standard DynamoDB read operation (`GET`, `QUERY`, or `SCAN`) and places the result into the step's output.

---

### Configuration Parameters (`customConfig`)

| Parameter                   | Type     | Required                 | Description                                                                                         |
| --------------------------- | -------- | :----------------------: | --------------------------------------------------------------------------------------------------- |
| `operation`                 | `string` |           Yes            | The DynamoDB operation to perform: `GET`, `QUERY`, or `SCAN`.                                       |
| `tableName`                 | `string` |           Yes            | The name of the DynamoDB table.                                                                     |
| `key`                       | `object` | For `GET`                | The primary key object for the item to retrieve (e.g., `{"PK": "USER#123", "SK": "PROFILE"}`).       |
| `indexName`                 | `string` |            No            | The name of the Global Secondary Index (GSI) to use for a `QUERY` or `SCAN`.                        |
| `keyConditionExpression`    | `string` | For `QUERY`              | The key condition expression for the query.                                                         |
| `filterExpression`          | `string` |            No            | A filter expression to apply after a `QUERY` or `SCAN`.                                             |
| `expressionAttributeValues` | `object` | If expression has values | An object containing the values for placeholders in expressions.                                      |
| `projectionExpression`      | `string` |            No            | A comma-separated list of attributes to retrieve.                                                   |
| `limit`                     | `number` |            No            | The maximum number of items to return.                                                              |
| `scanIndexForward`          | `boolean`|            No            | For `QUERY`, specifies the sort order. `true` for ascending (default), `false` for descending.      |
| `select`                    | `string` |            No            | For `QUERY` or `SCAN`, can be set to `COUNT` to return only the number of matching items, not the items themselves. |

:::tip Note
All configuration fields support Handlebars templating, allowing you to build dynamic queries.
:::

---

### Input & Output

#### Input Mappings

This module is configured entirely via `customConfig` and does not use `inputMappings`.

#### Output Schema

The output is an object containing the result of the DynamoDB operation.
```json
{
  "content": { ... } // or [ ... ] or null
}
```
-   For `GET`: The single item object, or `null` if not found.
-   For `QUERY`/`SCAN`: An array of item objects.
-   For `COUNT`: An object like `{"Count": 123, "ScannedCount": 123}`.

**Output Mapping Example:**
```json
"outputMappings": {
  "$.steps_output.user_profile": "$.content"
}
```

---

### Full JSON Example

This step performs a `QUERY` on a GSI to find all documents belonging to a user.

```json
"get_user_documents": {
  "stepInstanceId": "get_user_documents",
  "displayName": "Get User Documents from DynamoDB",
  "stepType": "DATA_LOAD",
  "moduleIdentifier": "system/dynamodb-data-loader",
  "customConfig": {
    "operation": "QUERY",
    "tableName": "AppDataTable",
    "indexName": "UserDocumentsGSI",
    "keyConditionExpression": "userId = :uid",
    "expressionAttributeValues": {
      ":uid": "{{initialContextData.userId}}"
    }
  },
  "outputMappings": {
    "$.flow_variables.documents": "$.content"
  },
  "defaultNextStepInstanceId": "process_documents"
}
```