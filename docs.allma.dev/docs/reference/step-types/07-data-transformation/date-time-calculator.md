---
title: date-time-calculator
---

# `system/date-time-calculator`

### Purpose

A data transformation module that performs simple date arithmetic by adding or subtracting a specified number of seconds from a base timestamp. The output is a new ISO 8601 formatted date-time string.

---

### Configuration Parameters (via Input Mappings)

| Parameter       | Type     | Required | Description                                                                                             |
| --------------- | -------- | :------: | ------------------------------------------------------------------------------------------------------- |
| `baseTime`      | `string` |   Yes    | The starting timestamp in ISO 8601 format (e.g., `2024-01-01T12:00:00.000Z`).                           |
| `offsetSeconds` | `number` |   Yes    | The number of seconds to add or subtract.                                                               |
| `operation`     | `string` |   Yes    | The operation to perform: `add` or `subtract`.                                                          |

---

### Input & Output

#### Input Mappings

Use `inputMappings` and `literals` to provide the configuration parameters.

**Example:**
To calculate a timestamp 1 hour (3600 seconds) in the future:
```json
"inputMappings": {
  "baseTime": "$.flow_variables.now"
},
"literals": {
  "offsetSeconds": 3600,
  "operation": "add"
}
```

#### Output Schema

The output is an object containing the calculated ISO 8601 string.
```json
{
  "result": "2024-01-01T13:00:00.000Z"
}
```

**Output Mapping Example:**
```json
"outputMappings": {
  "$.flow_variables.expiry_time": "$.result"
}
```

---

### Full JSON Example

This step calculates an expiry timestamp for a token that is valid for 15 minutes.

```json
"calculate_expiry": {
  "stepInstanceId": "calculate_expiry",
  "displayName": "Calculate Token Expiry",
  "stepType": "DATA_TRANSFORMATION",
  "moduleIdentifier": "system/date-time-calculator",
  "literals": {
    "offsetSeconds": 900,
    "operation": "add"
  },
  "inputMappings": {
    "baseTime": "$.startTime"
  },
  "outputMappings": {
    "$.steps_output.token_details.expiresAt": "$.result"
  },
  "defaultNextStepInstanceId": "issue_token"
}
```