---
title: LLM Invocation
sidebar_position: 1
---

# `LLM_INVOCATION`

### Purpose

Invokes a Large Language Model (LLM) to generate text, classify content, or produce structured JSON based on a dynamic prompt. This is the core step for integrating AI into any workflow.

It also supports **multimodal (vision) input**: you can attach images and PDFs to the prompt for vision-capable models (`GEMINI` and `AWS_BEDROCK` Anthropic Claude). See [Media Attachments](#media-attachments-vision) below.

---

### Configuration Parameters

| Parameter                   | Type                               | Required | Description                                                                                                                                                                                          |
| --------------------------- | ---------------------------------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llmProvider`               | `string`                           |   Yes    | The AI provider to use, such as `AWS_BEDROCK` or `GEMINI`. Supports **Handlebars templating** — see [Templated Model Selection](#templated-model-selection).                                          |
| `modelId`                   | `string`                           |   Yes    | The specific model identifier from the chosen provider (e.g., `anthropic.claude-3-sonnet-20240229-v1:0` for Bedrock, or `gemini-1.5-pro-latest` for Gemini). Supports **Handlebars templating** — see [Templated Model Selection](#templated-model-selection). |
| `fallbacks`                 | `{ llmProvider, modelId, inferenceParameters?, customConfig? }[]` |    No    | An ordered list of fallback models to try if the primary model fails. Each entry's `llmProvider` and `modelId` also support **Handlebars templating** — see [Templated Model Selection](#templated-model-selection). |
| `promptTemplateId`          | `string`                           |   Yes    | The ID of a versioned, reusable Prompt Template to use for this invocation. The flow will automatically load the latest **published** version of this template.                                        |
| `inferenceParameters`       | `object`                           |    No    | Controls the generation behavior of the LLM. Includes `temperature`, `maxOutputTokens`, `topP`, `topK`, and `seed`.                                                                                    |
| `templateContextMappings`   | `object`                           |    No    | Builds dynamic variables for your prompt template by collecting and formatting data from the Flow Context. Each key becomes a variable name (e.g., `chat_history`) available in your prompt.            |
| `mediaAttachments`          | `{ s3Pointer \| url \| base64, mimeType? }[]` |    No    | A **static** list of images/PDFs to send to vision-capable models. Each item has **exactly one** source — `s3Pointer` (`{ bucket, key }`), `url` (public http(s)), or `base64` (inline data) — plus an optional `mimeType`. See [Media Attachments](#media-attachments-vision). |
| `mediaAttachmentsPath`      | `string` (JSONPath)                |    No    | A **dynamic** JSONPath pointing to an array of media attachment objects in the flow context (e.g., `$.steps_output.fetch_images.files`). Mutually exclusive with `mediaAttachments`. |
| `customConfig.jsonOutputMode` | `boolean`                          |    No    | Set to `true` to instruct the LLM to return valid JSON. The step will automatically parse the response. If parsing fails, it can trigger the `retryOnContentError` policy.                            |
| `customConfig.anthropic_version`| `string`                           |    No    | (Bedrock/Anthropic only) Specify a different Anthropic version string, e.g., `bedrock-2023-05-31`.                                                                                                   |
| `securityValidatorConfig`   | `object`                           |    No    | An integrated check to prevent prompt leaking or harmful content. Can check for `forbiddenStrings`.                                                                                                  |
| `outputValidation`          | `object`                           |    No    | Validates the structure of the LLM's JSON output. `requiredFields` is an array of JSONPaths that must exist in the output. If any check fails, it can trigger `retryOnContentError`.                   |

---

### Templated Model Selection {#templated-model-selection}

The model-selection fields — `llmProvider`, `modelId`, and every entry inside `fallbacks[]` — are rendered as **Handlebars templates** against the flow context at runtime, just like `inputMappings`, `customConfig`, and the prompt body. This lets a flow centralize and parameterize model choice instead of hardcoding model IDs in every step.

```json
{
  "stepType": "LLM_INVOCATION",
  "llmProvider": "{{config.providers.primary}}",
  "modelId": "{{config.llmModels.bedrockSonnet}}",
  "fallbacks": [
    {
      "llmProvider": "{{config.providers.fallback}}",
      "modelId": "{{config.llmModels.bedrockHaiku}}"
    }
  ]
}
```

The templates are resolved against the same context available to `templateContextMappings`, so `config.*`, `flow_variables.*`, `steps_output.*`, and `initialContextData.*` are all in scope.

**Notes & guarantees:**

- **Backward compatible.** Plain values without `{{ }}` (e.g. `"AWS_BEDROCK"`, `"gemini-1.5-pro-latest"`) pass through unchanged, so existing flows are unaffected.
- **Validated after rendering.** A `modelId` that resolves to an empty/undefined value, or an `llmProvider` that does not resolve to a valid provider (`GEMINI`, `ANTHROPIC`, `OPENAI`, `AWS_BEDROCK`, `CUSTOM_LAMBDA`), fails the step with a clear error instead of silently calling the provider with a bad selection.

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

### Media Attachments (Vision) {#media-attachments-vision}

Attach images and PDFs so a vision-capable model can "see" them alongside your text prompt. This is supported for **`GEMINI`** models and **`AWS_BEDROCK`** Anthropic Claude models. For any other provider/model the media is ignored and the prompt is sent as text only.

**Supported media types:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`, and `application/pdf`.

Each attachment specifies **exactly one** source:

| Source       | Shape                          | Behavior                                                                                                  |
| ------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `s3Pointer`  | `{ bucket, key }`              | Fetched from S3 and base64-encoded at runtime. `mimeType` is inferred from the object's `ContentType` (or key extension) when omitted. |
| `url`        | `string` (public http(s) URL)  | Fetched and base64-encoded at runtime. `mimeType` is inferred from the response `Content-Type` when omitted. |
| `base64`     | `string` (inline base64 data)  | Used as-is. **`mimeType` is required** for this source.                                                   |

:::warning Media attachments are mutually exclusive
Set **either** `mediaAttachments` (static list) **or** `mediaAttachmentsPath` (dynamic JSONPath) — not both. When `mediaAttachmentsPath` resolves to `undefined`, the step runs with no media; if it resolves to a non-array or malformed objects, the step fails with a permanent error. An unsupported `mimeType` also fails permanently.
:::

The same resolved media is sent to the primary model **and** every configured fallback. Media is resolved inside the step (never stored in the execution state), and the raw base64 is **excluded** from the `_meta.llmInvocationParameters` trace — only a summary (`{ count, mimeTypes }`) is logged.

**Example (static list with all three source types):**

```json
"mediaAttachments": [
  { "s3Pointer": { "bucket": "my-bucket", "key": "uploads/invoice.pdf" } },
  { "url": "https://example.com/diagram.png" },
  { "base64": "iVBORw0KGgo...", "mimeType": "image/png" }
]
```

**Example (dynamic list from context):**

```json
"mediaAttachmentsPath": "$.steps_output.fetch_images.files"
```

The data at that path must be an array of media attachment objects, e.g. `[{ "s3Pointer": { "bucket": "b", "key": "k.jpg" } }]`.

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