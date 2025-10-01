---
title: sqs-get-queue-attributes
---

# `system/sqs-get-queue-attributes`

### Purpose

A data loading module that fetches attributes for a specified Amazon SQS queue, such as the approximate number of messages.

---

### Configuration Parameters (`customConfig`)

| Parameter        | Type       | Required | Description                                                                                                                                               |
| ---------------- | ---------- | :------: | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queueUrl`       | `string`   |   Yes    | The full URL of the SQS queue. Supports Handlebars templating.                                                                                            |
| `attributeNames` | `string[]` |   Yes    | An array of attribute names to fetch. Common values include `ApproximateNumberOfMessages`, `ApproximateNumberOfMessagesNotVisible`, `All`. [Full List](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_GetQueueAttributes.html#API_GetQueueAttributes_RequestParameters) |

---

### Input & Output

#### Input Mappings

This module is configured entirely via `customConfig` and does not use `inputMappings`.

#### Output Schema

The output is an object containing a dictionary of the requested attributes. Numerical values are automatically converted to numbers.
```json
{
  "attributes": {
    "ApproximateNumberOfMessages": 120,
    "ApproximateNumberOfMessagesNotVisible": 5
  }
}
```

**Output Mapping Example:**
To store the message count in a flow variable:
```json
"outputMappings": {
  "$.flow_variables.queue_depth": "$.attributes.ApproximateNumberOfMessages"
}
```

---

### Full JSON Example

This step checks the number of messages in a queue and uses a conditional transition to decide whether to proceed.

```json
"check_queue_depth": {
  "stepInstanceId": "check_queue_depth",
  "displayName": "Check SQS Queue Depth",
  "stepType": "DATA_LOAD",
  "moduleIdentifier": "system/sqs-get-queue-attributes",
  "customConfig": {
    "queueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/my-processing-queue",
    "attributeNames": [
      "ApproximateNumberOfMessages"
    ]
  },
  "outputMappings": {
    "$.steps_output.queue_stats": "$"
  },
  "transitions": [
    {
      "condition": "$.steps_output.queue_stats.attributes.ApproximateNumberOfMessages > 0",
      "nextStepInstanceId": "process_messages"
    }
  ],
  "defaultNextStepInstanceId": "end_flow"
}
```