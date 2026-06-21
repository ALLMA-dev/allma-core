---
"@allma/core-types": minor
---

feat(llm): support image & PDF attachments on `LLM_INVOCATION` steps. Add the resolved media contract (`LlmMediaKind`, `LlmMediaContent`, `media` on `LlmGenerationRequest`) plus supported-MIME constants, and extend the step schema with `mediaAttachments` (static list of S3-pointer / URL / inline-base64 sources) and `mediaAttachmentsPath` (dynamic JSONPath). Media is resolved to base64 at runtime and wired through to the multimodal Gemini and Bedrock Anthropic adapters.
