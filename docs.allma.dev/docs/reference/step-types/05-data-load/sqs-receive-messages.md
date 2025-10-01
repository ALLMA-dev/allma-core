---
title: sqs-receive-messages
---

# `system/sqs-receive-messages`

### Purpose

A data loading module that receives a batch of messages from an Amazon SQS queue. It can also optionally delete the messages after receiving them.

---

### Configuration Parameters (`customConfig`)

| Parameter             | Type      | Required | Description                                                                                                                       |
| --------------------- | --------- | :------: | --------------------------------------------------------------------------------------------------------------------------------- |
| `queueUrl`            | `string`  |   Yes    | The full URL of the SQS queue. Supports Handlebars templating.                                                                    |
| `maxNumberOfMessages` | `number`  |    No    | The maximum number of messages to receive in a single call. Must be between 1 and 10. Defaults to 10.                            |
| `waitTimeSeconds`     | `number`  |    No    | The duration (in seconds) for which the call waits for a message to arrive in the queue before returning. Defaults to 0.           |
| `deleteMessages`      | `boolean` |    No    | If `true` (the default), the received messages will be deleted from the queue immediately. Set to `false` to inspect messages without deleting. |

---

### Input & Output

#### Input Mappings

This module is configured entirely via `customConfig` and does not use `inputMappings`.

#### Output Schema

The output is an object containing an array of the received messages and a count.
```json
{
  "messages": [
    {
      "messageId": "...",
      "receiptHandle": "...",
      "body": "{\"key\": \"value\"}",
      "attributes": { ... }
    }
  ],
  "messageCount": 1
}
```
The `body` of the message is a raw string and often needs to be parsed in a subsequent step.

**Output Mapping Example:**
To place the array of messages into the flow context for a parallel step to process:
```json
"outputMappings": {
  "$.flow_variables.messages_to_process": "$.messages"
}
```

---

### Full JSON Example

This step receives up to 5 messages from a queue and then passes them to a parallel processing step.

```json
"get_messages_from_queue": {
  "stepInstanceId": "get_messages_from_queue",
  "displayName": "Get Messages from SQS",
  "stepType": "DATA_LOAD",
  "moduleIdentifier": "system/sqs-receive-messages",
  "customConfig": {
    "queueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/my-work-queue",
    "maxNumberOfMessages": 5,
    "deleteMessages": true
  },
  "outputMappings": {
    "$.steps_output.received_messages": "$.messages"
  },
  "defaultNextStepInstanceId": "process_messages_in_parallel"
}
```