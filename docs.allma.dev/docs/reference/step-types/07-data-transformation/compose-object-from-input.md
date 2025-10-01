---
title: compose-object-from-input
---

# `system/compose-object-from-input`

### Purpose

A simple data transformation module that takes all of its inputs (from `inputMappings` and `literals`) and returns them as a single JSON object.

This is extremely useful for preparing a structured payload for a subsequent step, such as `SQS_SEND` or `CUSTOM_LAMBDA_INVOKE`.

---

### Configuration Parameters

This module has no `customConfig`. Its entire "configuration" is defined by the data you pass to it via `inputMappings` and `literals`.

---

### Input & Output

#### Input Mappings & Literals

Use `inputMappings` and `literals` to build the object you want to create. Dot notation in the target path will create nested objects.

**Example:**
```json
"inputMappings": {
  "user.id": "$.initialContextData.userId",
  "user.name": "$.steps_output.get_profile.name",
  "orderId": "$.flow_variables.currentOrderId"
},
"literals": {
  "eventType": "ORDER_CREATED"
}
```

#### Output Schema

The output is the exact object constructed from the inputs. Based on the example above, the output would be:
```json
{
  "user": {
    "id": "u-123",
    "name": "Jane Doe"
  },
  "orderId": "ord-456",
  "eventType": "ORDER_CREATED"
}
```

**Output Mapping Example:**
Typically, the entire composed object is mapped.
```json
"outputMappings": {
  "$.steps_output.sqs_payload": "$"
}
```

---

### Full JSON Example

This step constructs a payload that will be sent to an SQS queue in the next step.

```json
"build_sqs_message": {
  "stepInstanceId": "build_sqs_message",
  "displayName": "Build SQS Message Body",
  "stepType": "DATA_TRANSFORMATION",
  "moduleIdentifier": "system/compose-object-from-input",
  "literals": {
    "sourceSystem": "AllmaWorkflow"
  },
  "inputMappings": {
    "customerId": "$.initialContextData.customerId",
    "eventDetails": "$.steps_output.analyze_event"
  },
  "outputMappings": {
    "$.flow_variables.message_body": "$"
  },
  "defaultNextStepInstanceId": "send_to_sqs"
}
```