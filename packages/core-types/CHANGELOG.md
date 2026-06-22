# @allma/core-types

## 1.4.0

### Minor Changes

- a7b39cd: `LLM_INVOCATION` model selection now supports Handlebars templating. The `llmProvider`, `modelId`,
  and every `fallbacks[]` entry are rendered against the flow context at runtime (the same context as
  `templateContextMappings`), so flows can centralize/parameterize model choice, e.g.
  `"modelId": "{{config.llmModels.bedrockSonnet}}"`. Plain values without `{{ }}` are unchanged, so
  existing flows are unaffected. Resolved values are validated after rendering: an empty `modelId` or
  an `llmProvider` that does not resolve to a valid provider fails the step with a clear error.

## 1.3.0

### Minor Changes

- 9f5cdad: Add per-step execution statistics. A new Admin Panel **Statistics** view and
  `GET /allma/dashboard/step-stats` admin API report step counts, failures, average duration, and
  LLM token usage broken down by step type, by flow, and over time (per-hour / per-day) for the last
  24 hours and 7 days. Step-execution log records now carry `flowDefinitionId`, `flowDefinitionVersion`
  and (for LLM steps) `inputTokens` / `outputTokens`, and a new `GSI_StepStats_ByTime` index backs the
  on-read aggregation.

## 1.2.0

### Minor Changes

- ac065ee: feat(llm): support image & PDF attachments on `LLM_INVOCATION` steps. Add the resolved media contract (`LlmMediaKind`, `LlmMediaContent`, `media` on `LlmGenerationRequest`) plus supported-MIME constants, and extend the step schema with `mediaAttachments` (static list of S3-pointer / URL / inline-base64 sources) and `mediaAttachmentsPath` (dynamic JSONPath). Media is resolved to base64 at runtime and wired through to the multimodal Gemini and Bedrock Anthropic adapters.

## 1.1.3

### Patch Changes

- 0ce23e0: Integration tests fixes, build fixes

## 1.1.2

### Patch Changes

- 1951c6d: Concurency and logging improvements
- cd2218e: fix: parallel step logging and display improvements
- 9e3d6ee: Context hydration fixes, S3 preview tool
- 6ee1569: Parallel batch processing and input/output of step improvements
- 6ee1569: Sub-Flow execution fixes

## 1.1.1

### Patch Changes

- 4d6f2f4: Email send attachments improvements and cc, bcc added
- 4706c67: Email send has CC and fromName parameters now

## 1.1.0

### Minor Changes

- 96b1d0c: Agents feature is added

### Patch Changes

- af39aab: Small changes across the system to improve stability

## 1.0.17

### Patch Changes

- 131aa94: Small fixes here and there

## 1.0.16

### Patch Changes

- e4301e0: Flow variables functionality has been added
- 7b7f11e: Join data step added to Allma

## 1.0.15

### Patch Changes

- 2e86990: Step creation on UI fixed (no StepDefinition for system steps)

## 1.0.14

### Patch Changes

- 97ea67a: Send email with attachments implemented
- 6f103d7: CDK deployment imports improvements
- 23b6fb6: List files on S3 step added

## 1.0.13

### Patch Changes

- e233841: LLM retry fix, currentItem in PARALLEL fork clean fix

## 1.0.12

### Patch Changes

- 67664df: ExpressionAttributeNames added to DDB steps

## 1.0.11

### Patch Changes

- d643b0c: Orchestrator concurrency added

## 1.0.10

### Patch Changes

- 198a0ee: File download step has been added

## 1.0.9

### Patch Changes

- 664bf52: Email ingress attachment support is added

## 1.0.8

### Patch Changes

- bba0e3e: UI and data templation fixes

## 1.0.7

### Patch Changes

- e0891b0: Dependencies fix. Minor UI and types fixes

## 1.0.6

### Patch Changes

- af014ee: Packages configurations fix for NPM

## 1.0.5

### Patch Changes

- 389235b: Core error reporting improve. Admin UI MCP paths fix

## 1.0.4

### Patch Changes

- 33b6f11: Dependencies and paths updated to fix deployment issues

## 1.0.3

### Patch Changes

- 921cdc7: packages configuration fixed for public use

## 1.0.2

### Patch Changes

- ca55090: Schedule and MCP steps are added. Minor fixes of other parts of the system.

## 1.0.1

### Patch Changes

- 4659536: Initial change
