---
title: sns-publisher
---

# `system/sns-publish`

### Purpose

A messaging module that publishes a JSON payload to an Amazon SNS (Simple Notification Service) topic. This is a "fire-and-forget" operation for broadcasting events to downstream subscribers.

---

### Configuration Parameters

This module receives its full configuration by merging `customConfig`, `inputMappings`, and `literals`.

| Parameter           | Type     | Required | Description                                                                                                                                 |
| ------------------- | -------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `payload`           | `object` |   Yes    | **Must be provided via `inputMappings`.** The JSON object to be published as the message body.                                              |
| `topicArn`          | `string` |   Yes    | The ARN of the SNS topic to publish to. Typically provided as a `literal`.                                                                  |
| `messageAttributes` | `object` |    No    | An object defining SNS message attributes for filtering. The structure must match the AWS SDK's `MessageAttributeValue` format. See example. |

---

### Input & Output

#### Input Mappings & Literals

**Example:**
```json
"literals": {
  "topicArn": "arn:aws:sns:us-east-1:123456789012:MyTopic",
  "messageAttributes": {
    "eventType": { "DataType": "String", "StringValue": "ORDER_CONFIRMED" }
  }
},
"inputMappings": {
  "payload": "$.steps_output.build_order_payload"
}
```

#### Output Schema

The output contains the `MessageId` of the published SNS message.
```json
{
  "snsMessageId": "uuid-...",
  "_meta": { "status": "SUCCESS" }
}
```

**Output Mapping Example:**
```json
"outputMappings": {
  "$.steps_output.sns_publish_result": "$"
}
```

---

### Full JSON Example

This step publishes an order confirmation event to an SNS topic.

```json
"publish_order_event": {
  "stepInstanceId": "publish_order_event",
  "displayName": "Publish Order Confirmation to SNS",
  "stepType": "MESSAGING",
  "moduleIdentifier": "system/sns-publish",
  "literals": {
    "topicArn": "arn:aws:sns:us-east-1:123456789012:OrderEvents",
    "messageAttributes": {
      "status": {
        "DataType": "String",
        "StringValue": "CONFIRMED"
      }
    }
  },
  "inputMappings": {
    "payload.orderId": "$.initialContextData.orderId",
    "payload.customerId": "$.initialContextData.customerId"
  },
  "defaultNextStepInstanceId": "end_flow"
}
```