---
title: sqs-sender
---

# `system/sqs-send`

### Purpose

A messaging module that sends a JSON payload as a message to an Amazon SQS (Simple Queue Service) queue. This is a "fire-and-forget" operation for queuing up work for other systems.

---

### Configuration Parameters

This module receives its full configuration by merging `customConfig`, `inputMappings`, and `literals`.

| Parameter                | Type     | Required                 | Description                                                                                                                                                                       |
| ------------------------ | -------- | :----------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payload`                | `object` |           Yes            | **Must be provided via `inputMappings`.** The JSON object to be sent as the message body.                                                                                         |
| `queueUrl`               | `string` |           Yes            | The URL of the SQS queue to send the message to. Typically provided as a `literal`.                                                                                             |
| `messageGroupId`         | `string` | For FIFO queues          | Required for FIFO queues. Messages with the same group ID are processed in order.                                                                                                 |
| `messageDeduplicationId` | `string` | For FIFO queues (optional) | Used for content-based deduplication in FIFO queues. If not provided, a unique ID is generated based on the message content. |

---

### Input & Output

#### Input Mappings & Literals

**Example:**
```json
"literals": {
  "queueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/MyWorkQueue.fifo",
  "messageGroupId": "user-processing"
},
"inputMappings": {
  "payload": "$.steps_output.build_user_payload"
}
```

#### Output Schema

The output contains the `MessageId` of the sent SQS message.
```json
{
  "sqsMessageId": "uuid-...",
  "_meta": { "status": "SUCCESS" }
}
```

**Output Mapping Example:**
```json
"outputMappings": {
  "$.steps_output.sqs_send_result": "$"
}
```

---

### Full JSON Example

This step sends a user profile to a FIFO queue for processing, using the user's ID as the `messageGroupId` to ensure updates for the same user are processed in order.

```json
"queue_user_for_processing": {
  "stepInstanceId": "queue_user_for_processing",
  "displayName": "Queue User for Processing",
  "stepType": "MESSAGING",
  "moduleIdentifier": "system/sqs-send",
  "literals": {
    "queueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/UserProfileUpdates.fifo"
  },
  "inputMappings": {
    "messageGroupId": "$.steps_output.user_profile.id",
    "payload": "$.steps_output.user_profile"
  },
  "defaultNextStepInstanceId": "next_step"
}
```