---
title: s3-data-saver
---

# `system/s3-data-saver`

### Purpose

A data-saving module that saves a payload from the flow context to a specified S3 location. It automatically stringifies JSON objects/arrays.

---

### Configuration Parameters

This module receives its full configuration by merging the step's `customConfig`, `inputMappings`, and `literals`.

| Parameter                   | Type     | Required | Description                                                                                                                                                                 |
| --------------------------- | -------- | :------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contentToSave`             | `any`    |   Yes    | **Must be provided via `inputMappings`.** This is the data that will be saved to the S3 object. If it's an object/array, it will be JSON stringified.                            |
| `destinationS3UriTemplate`  | `string` |   Yes    | A Handlebars template for the full S3 URI of the destination object (e.g., `s3://my-bucket/results/{{flowExecutionId}}.json`).                                                   |
| `contentType`               | `string` |    No    | The `Content-Type` header for the S3 object (e.g., `application/json`, `text/plain`). Defaults to `application/octet-stream`.                                                   |
| `metadataTemplate`          | `object` |    No    | A key-value object for custom S3 metadata. Both keys and values support Handlebars templating, but values will be converted to strings as required by S3.                        |

---

### Input & Output

#### Input Mappings

The `inputMappings` are **critical** for this step to define what content gets saved.

**Example:**
To save the output of a previous LLM step:
```json
"inputMappings": {
  "contentToSave": "$.steps_output.summary_step"
}
```

#### Output Schema

The output contains details about the saved S3 object.
```json
{
  "s3Uri": "s3://my-bucket/results/exec-123.json",
  "eTag": "...",
  "versionId": "...",
  "_meta": { "status": "SUCCESS", ... }
}
```

**Output Mapping Example:**
```json
"outputMappings": {
  "$.flow_variables.saved_report_uri": "$.s3Uri"
}
```

---

### Full JSON Example

This step takes the result of a summary step and saves it as a JSON file in S3, naming the file with the flow execution ID.

```json
"save_summary_to_s3": {
  "stepInstanceId": "save_summary_to_s3",
  "displayName": "Save Summary to S3",
  "stepType": "DATA_SAVE",
  "moduleIdentifier": "system/s3-data-saver",
  "literals": {
    "destinationS3UriTemplate": "s3://my-app-results/summaries/{{flowExecutionId}}.json",
    "contentType": "application/json"
  },
  "inputMappings": {
    "contentToSave": "$.steps_output.generate_summary"
  },
  "outputMappings": {
    "$.steps_output.s3_save_result": "$"
  },
  "defaultNextStepInstanceId": "end_flow"
}
```