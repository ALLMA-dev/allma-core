---
title: dynamodb-update-item
---

# `system/dynamodb-update-item`

### Purpose

A data-saving module that performs a standard DynamoDB `UpdateItem` operation on a single item. It's used for creating, updating, or deleting attributes of an item in a table.

---

### Configuration Parameters

This module receives its full configuration by merging the step's `customConfig`, `inputMappings`, and `literals`.

| Parameter                   | Type     | Required | Description                                                                                                                                     |
| --------------------------- | -------- | :------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `tableName`                 | `string` |   Yes    | The name of the DynamoDB table.                                                                                                                 |
| `key`                       | `object` |   Yes    | The primary key object of the item to update (e.g., `{"PK": "USER#123"}`).                                                                      |
| `updateExpression`          | `string` |   Yes    | The DynamoDB update expression (e.g., `SET #name = :name, #email = :email`).                                                                    |
| `expressionAttributeNames`  | `object` |    No    | An object defining placeholders for attribute names in the expression (e.g., `{"#name": "name"}`).                                              |
| `expressionAttributeValues` | `object` |    No    | An object defining placeholders for attribute values in the expression (e.g., `{":name": "Jane Doe"}`).                                         |
| `conditionExpression`       | `string` |    No    | An optional condition that must be met for the update to succeed. If it fails, the step will throw a `ConditionalCheckFailedException`.           |

---

### Input & Output

#### Input Mappings & Literals

Use `inputMappings` and `literals` to construct the full configuration object described above. This is how you provide dynamic values to your key, expressions, and values.

**Example:**
```json
"inputMappings": {
  "key.PK": "$.flow_variables.user_pk",
  "expressionAttributeValues.:name": "$.steps_output.get_name.fullName"
}
```

#### Output Schema

The output contains the attributes that were updated by the operation.
```json
{
  "updatedAttributes": {
    "name": "Jane Doe",
    "email": "jane.doe@example.com"
  },
  "_meta": { "status": "SUCCESS", ... }
}
```

**Output Mapping Example:**
This step's output is often not needed, but you can map it if necessary.
```json
"outputMappings": {
  "$.flow_variables.update_result": "$.updatedAttributes"
}
```

---

### Full JSON Example

This step updates a user's profile in a DynamoDB table with a new name and email address retrieved from a previous step.

```json
"update_user_profile": {
  "stepInstanceId": "update_user_profile",
  "displayName": "Update User in DynamoDB",
  "stepType": "DATA_SAVE",
  "moduleIdentifier": "system/dynamodb-update-item",
  "literals": {
    "tableName": "UsersTable",
    "updateExpression": "SET #nm = :newName, #em = :newEmail",
    "expressionAttributeNames": {
      "#nm": "name",
      "#em": "email"
    }
  },
  "inputMappings": {
    "key.userId": "$.initialContextData.userId",
    "expressionAttributeValues.:newName": "$.steps_output.get_new_data.name",
    "expressionAttributeValues.:newEmail": "$.steps_output.get_new_data.email"
  },
  "defaultNextStepInstanceId": "end_flow"
}
```