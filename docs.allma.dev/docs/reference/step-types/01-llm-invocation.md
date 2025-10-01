---
title: LLM Invocation
sidebar_position: 1
---

# `LLM_INVOCATION`

### Purpose

Invokes a Large Language Model (LLM) to generate text, classify content, or produce structured JSON based on a dynamic prompt. This is the core step for integrating AI into any workflow.

---

### Configuration Parameters

| Parameter                   | Type                               | Required | Description                                                                                                                                                                                          |
| --------------------------- | ---------------------------------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llmProvider`               | `string`                           |   Yes    | The AI provider to use, such as `AWS_BEDROCK` or `GEMINI`.                                                                                                                                           |
| `modelId`                   | `string`                           |   Yes    | The specific model identifier from the chosen provider (e.g., `anthropic.claude-3-sonnet-20240229-v1:0` for Bedrock, or `gemini-1.5-pro-latest` for Gemini).                                             |
| `promptTemplateId`          | `string`                           |   Yes    | The ID of a versioned, reusable Prompt Template to use for this invocation. The flow will automatically load the latest **published** version of this template.                                        |
| `inferenceParameters`       | `object`                           |    No    | Controls the generation behavior of the LLM. Includes `temperature`, `maxOutputTokens`, `topP`, `topK`, and `seed`.                                                                                    |
| `templateContextMappings`   | `object`                           |    No    | Builds dynamic variables for your prompt template by collecting and formatting data from the Flow Context. Each key becomes a variable name (e.g., `chat_history`) available in your prompt.            |
| `customConfig.jsonOutputMode` | `boolean`                          |    No    | Set to `true` to instruct the LLM to return valid JSON. The step will automatically parse the response. If parsing fails, it can trigger the `retryOnContentError` policy.                            |
| `customConfig.anthropic_version`| `string`                           |    No    | (Bedrock/Anthropic only) Specify a different Anthropic version string, e.g., `bedrock-2023-05-31`.                                                                                                   |
| `securityValidatorConfig`   | `object`                           |    No    | An integrated check to prevent prompt leaking or harmful content. Can check for `forbiddenStrings`.                                                                                                  |
| `outputValidation`          | `object`                           |    No    | Validates the structure of the LLM's JSON output. `requiredFields` is an array of JSONPaths that must exist in the output. If any check fails, it can trigger `retryOnContentError`.                   |

---

### Input & Output

#### Input Mappings

The `LLM_INVOCATION` step primarily gets its dynamic data via `templateContextMappings`. However, `inputMappings` can be used to pass simple variables directly to the prompt template.

**Example:**
If your prompt is `Analyze this text: {{user_text}}`, you can map data to it like this:

```json
"inputMappings": {
  "user_text": "$.initialContextData.query"
}
```

#### Output Schema

If `jsonOutputMode` is `false` (default), the output is:
```json
{
  "llm_response": "The generated text from the model.",
  "_meta": { ... }
}
```

If `jsonOutputMode` is `true`, the output is the parsed JSON object from the model, plus the `_meta` block:
```json
{
  "parsed_field_1": "value1",
  "parsed_field_2": true,
  "_meta": {
    "tokenUsage": { "inputTokens": 120, "outputTokens": 45 },
    "llmInvocationParameters": { ... },
    "llmPrompt": "The full, rendered prompt sent to the model.",
    "llmRawResponse": "The raw string response from the model."
  }
}
```

**Output Mapping Example:**

```json
"outputMappings": {
  "$.steps_output.summary_result": "$",
  "$.flow_variables.summary_text": "$.llm_response"
}
```

---

### Full JSON Example

This example defines a step that uses Bedrock Claude Sonnet to analyze an email and extract structured data as JSON. It includes retries for content errors and validation to ensure the output contains an `urgency` field.

```json
"generate_summary": {
  "stepInstanceId": "generate_summary",
  "displayName": "Generate Email Summary",
  "stepType": "LLM_INVOCATION",
  "llmProvider": "AWS_BEDROCK",
  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
  "promptTemplateId": "email-summarizer-v1",
  "customConfig": {
    "jsonOutputMode": true
  },
  "outputValidation": {
    "requiredFields": ["$.urgency"]
  },
  "templateContextMappings": {
    "email_body": {
      "sourceJsonPath": "$.steps_output.parse_email.body"
    }
  },
  "outputMappings": {
    "$.steps_output.summary_data": "$"
  },
  "onError": {
    "retryOnContentError": {
      "count": 2
    },
    "fallbackStepInstanceId": "handle_summary_failure"
  },
  "defaultNextStepInstanceId": "save_summary_to_db"
}
```