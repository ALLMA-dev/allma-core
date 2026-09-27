---
"@allma/core-cdk": patch
---

Bedrock adapter now rejects built-in tools (`google_search`, `code_execution`, `web_search`) with an explicit error on every Bedrock model family. Before, Anthropic models got them as broken custom tools, and Amazon and OpenAI models dropped them silently.
