---
title: generate-uuid
---

# `system/generate-uuid`

### Purpose

A simple data transformation module that generates a single, random **UUID (v4)** using Node's `crypto.randomUUID()`. Optionally, a `prefix` and/or `suffix` can be supplied to wrap the generated UUID, which is useful for creating namespaced or human-readable unique identifiers (e.g. `order-<uuid>`). Use this whenever a workflow needs a guaranteed-unique key for a record, a correlation ID, an idempotency key, or a generated filename.

---

### Configuration Parameters

All parameters are optional. They can be provided either via the step's `customConfig` (static configuration) or via input mappings; when both are present, values from input mappings take precedence over `customConfig`.

| Parameter | Type     | Required | Default | Description                                                        |
| --------- | -------- | :------: | :-----: | ------------------------------------------------------------------ |
| `prefix`  | `string` |    No    |  `""`   | A string prepended to the front of the generated UUID.             |
| `suffix`  | `string` |    No    |  `""`   | A string appended to the end of the generated UUID.                |

If no parameters are provided, the module returns a bare UUID v4 string.

---

### Input & Output

#### Input (Optional)

**Example:**
To generate a UUID prefixed with `order-`:
```json
"customConfig": {
  "prefix": "order-"
}
```

#### Output Schema

The output is an object containing a single `uuid` field. The value is the generated UUID v4, wrapped with the configured `prefix` and `suffix` (`${prefix}${uuid}${suffix}`).
```json
{
  "uuid": "order-123e4567-e89b-42d3-a456-426614174000"
}
```

With no configuration, the output is a bare UUID:
```json
{
  "uuid": "123e4567-e89b-42d3-a456-426614174000"
}
```

**Output Mapping Example:**
```json
"outputMappings": {
  "$.flow_variables.record_id": "$.uuid"
}
```

---

### Full JSON Example

This step generates a UUID prefixed with `invoice-` and stores it in the steps output for use by a later step.

```json
"generate_invoice_id": {
  "stepInstanceId": "generate_invoice_id",
  "displayName": "Generate Invoice ID",
  "stepType": "DATA_TRANSFORMATION",
  "moduleIdentifier": "system/generate-uuid",
  "customConfig": {
    "prefix": "invoice-"
  },
  "outputMappings": {
    "$.steps_output.invoice_id": "$.uuid"
  },
  "defaultNextStepInstanceId": "save_invoice"
}
```
