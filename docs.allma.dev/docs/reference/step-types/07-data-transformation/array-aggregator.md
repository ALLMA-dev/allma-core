---
title: array-aggregator
---

# `system/array-aggregator`

### Purpose

A data transformation module that performs a numerical aggregation (`min`, `max`, `sum`, `avg`) on an array of numbers or an array of objects containing numbers.

---

### Configuration Parameters (via Input Mappings)

| Parameter   | Type       | Required | Description                                                                                                                                                             |
| ----------- | ---------- | :------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `array`     | `array`    |   Yes    | The array to be processed.                                                                                                                                              |
| `operation` | `string`   |   Yes    | The aggregation to perform: `min`, `max`, `sum`, or `avg`.                                                                                                              |
| `path`      | `string`   |    No    | If the `array` contains objects, this is the property name (a simple key, not JSONPath) to extract the numeric value from each object. Booleans are treated as 1 or 0. |

---

### Input & Output

#### Input Mappings

Use `inputMappings` to provide the configuration parameters.

**Example:**
To calculate the average score from an array of review objects:
```json
"inputMappings": {
  "array": "$.steps_output.get_reviews.reviews_list",
  "path": "score"
},
"literals": {
  "operation": "avg"
}
```

#### Output Schema

The output is an object containing the numerical result.
```json
{
  "result": 4.5
}
```

**Output Mapping Example:**
```json
"outputMappings": {
  "$.flow_variables.average_score": "$.result"
}
```

---

### Full JSON Example

This step calculates the total cost from a list of line items.

```json
"calculate_total_cost": {
  "stepInstanceId": "calculate_total_cost",
  "displayName": "Calculate Total Cost",
  "stepType": "DATA_TRANSFORMATION",
  "moduleIdentifier": "system/array-aggregator",
  "literals": {
    "operation": "sum",
    "path": "price"
  },
  "inputMappings": {
    "array": "$.initialContextData.cart.items"
  },
  "outputMappings": {
    "$.flow_variables.total_cost": "$.result"
  },
  "defaultNextStepInstanceId": "create_invoice"
}
```