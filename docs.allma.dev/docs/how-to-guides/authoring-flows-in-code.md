---
title: Authoring Flows in Code (TypeScript)
sidebar_position: 6
---

# Authoring Flows in Code (TypeScript)

Allma flows are normally authored in the Visual Flow Editor or hand-written as
`*.flow.json`. The **`@allma/flow-builder`** package lets you author them in
**TypeScript** instead — with compile-time type safety, refactor-safe references,
a strict build-time gate, and a deterministic JSON artifact the existing deploy
pipeline consumes unchanged.

This guide walks through building a flow in code, referencing reusable artifacts
(prompts, step definitions, MCP connections), validating, and deploying — all from
a repo, reviewable as a normal pull request.

:::info When to use code vs. the Visual Editor
Both are first-class. Code authoring shines when you want flows in version
control, code review, and refactor safety. A flow is owned by **either** code
**or** the editor at a time (never both) — see [Coexistence](#coexistence-with-the-visual-editor).
:::

## Prerequisites

- An Allma deployment (see [Quick Start](../getting-started/quick-start.md)).
- A project that can take `@allma/flow-builder` as a `devDependency`.
- A TypeScript runner such as [`tsx`](https://github.com/privatenumber/tsx) to run
  the CLI against `.ts` sources.

```bash
npm install --save-dev @allma/flow-builder tsx
```

## 1. Define a flow

A flow is declared in two phases: declare every step (`flow.steps({...})`, which
returns a typed record of **refs**), then wire those refs. Because every ref
exists before wiring, forward and backward edges are symmetric and fully typed —
there are no stringly-typed step ids to drift out of sync.

```ts title="flows/extract-and-store.flow.ts"
import { defineFlow, deployVar, s3DataLoad, llmInvocation, s3DataSave, customLambdaInvoke }
  from '@allma/flow-builder';

const flow = defineFlow({
  id: 'extract-and-store',
  description: 'Load a document, summarize it, and store the result.',
  enableExecutionLogs: true,
  // The only place deploy placeholders are rendered (by the importer).
  variables: { outputBucket: deployVar('my-output-{{stage}}') },
});

const s = flow.steps({
  load: s3DataLoad({ sourceS3Uri: 's3://my-input/document.txt', outputFormat: 'TEXT' })
    .displayName('1. Load document')
    .outputs({ '$.steps_output.doc_text': '$.body' }),

  summarize: llmInvocation({ llmProvider: 'AWS_BEDROCK', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' })
    .displayName('2. Summarize')
    .inputs({ 'prompt.document': '$.steps_output.doc_text' })
    .outputs({ '$.steps_output.summary': '$.text' }),

  store: s3DataSave({ destinationS3UriTemplate: 's3://{{flow_variables.outputBucket}}/summary.json' })
    .displayName('3. Store summary'),

  onError: customLambdaInvoke({ lambdaFunctionArnTemplate: 'arn:aws:lambda:us-east-1:0:function:on-failure' }),
});

s.load.next(s.summarize).onError({ fallback: s.onError });
s.summarize.next(s.store).onError({ fallback: s.onError });
flow.start(s.load);

export default flow;
```

A wrong key for the step type, an unknown `customConfig` field, a deleted-step
fallback, a malformed JSONPath, or a deploy placeholder in the wrong place are all
**compile-time or build-time** errors — none reach deploy.

## 2. Author reusable artifacts (config-as-code)

Prompts, reusable step definitions, and MCP connections can be authored in code
too. Each `define*` returns a typed **handle** you reference by object, not by a
bare string id — so a renamed artifact is a compile error.

```ts title="config/summary-prompt.prompt.ts"
import { definePrompt } from '@allma/flow-builder';

export default definePrompt({
  id: 'summary-prompt',
  name: 'Document summary',
  content: 'Summarize the following document in 3 sentences:\n\n{{document}}',
});
```

```ts title="flows/uses-prompt.flow.ts"
import { defineFlow, llmInvocation, endFlow } from '@allma/flow-builder';
import summaryPrompt from '../config/summary-prompt.prompt.js';

const flow = defineFlow({ id: 'uses-prompt' });
const s = flow.steps({
  summarize: llmInvocation({
    llmProvider: 'AWS_BEDROCK',
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    promptTemplateId: summaryPrompt,        // typed object reference, not a string
  }),
  done: endFlow(),
});
s.summarize.next(s.done);
flow.start(s.summarize);
export default flow;
```

The same pattern works for `defineStep` (reference via `.fromDefinition(handle)`),
`defineMcpConnection` (`mcpCall({ mcpConnectionId: handle, ... })`), and sub-flows
(`startSubFlow({ subFlowDefinitionId: someFlow })`). For an id that lives outside
your config dir (e.g. a platform-managed flow), wrap it in `external('that-id')` to
document the intent and skip the resolution check.

## 3. Type-safe context paths (optional)

`flowContext<Ctx>()` constrains JSONPath arguments to the keys of a context type,
so a renamed context field fails compilation:

```ts
import { flowContext } from '@allma/flow-builder';

interface Ctx { steps_output: { summarize: { text: string } } }
const $ = flowContext<Ctx>();

s.store.outputs({ [$('$.steps_output.summarize.text')]: '$.text' });   // ✅
s.store.outputs({ [$('$.steps_output.summarize.txet')]: '$.text' });   // ❌ compile error
```

## 4. Build, check, deploy

```bash
# Compile TS → deterministic JSON (one file per artifact, suffixed by kind).
npx tsx node_modules/@allma/flow-builder/dist/cli/allma-flows.js \
  build "flows/**/*.ts" "config/**/*.ts" --out config/flows

# Validate + fail on drift between the TS source and the committed JSON.
npx ... allma-flows.js check "flows/**/*.ts" "config/**/*.ts" --out config/flows
```

Commit the generated JSON. In CI, run `check` so the byte-stable artifact makes
the PR diff meaningful and any drift between `.ts` and `.json` fails the build. The
existing CDK config-importer picks up the JSON unchanged — deploy stays a pure
"ship these files" step.

To promote **without** a CDK redeploy, use `deploy`, which merges the built
artifacts and `POST`s them to the admin import API (a bearer token from
`ALLMA_ADMIN_TOKEN`):

```bash
ALLMA_ADMIN_TOKEN=… npx ... allma-flows.js deploy "config/flows/*.json" \
  --remote https://api.my-allma.example.com --publish
```

`deploy` honors the importer's version-slot contract: a brand-new flow id is
created; an existing flow id only *updates* a version slot that already exists.
See the [Versioning & Publishing](../getting-started/key-concepts/versioning-publishing.md)
concept and the [Flow Builder Reference](../reference/flow-builder-reference.md)
for the exact rules.

## Coexistence with the Visual Editor

Ownership is per-flow and explicit. The builder stamps `authoringSource: 'code'`
and emits no step positions, so the editor's auto-layout arranges code-owned flows
on first open. The editor opens such flows **read-only** (viewing and the Sandbox
stay enabled; structural edits and Save are disabled, with a "Managed in code"
banner). Ownership transfer is deliberate and one-way:

- `allma-flows eject <flowId> --from "config/flows/*.json"` adopts a visual flow
  **into** code (JSON → TS).
- The editor's "Unlock for visual editing" action flips ownership **back**.

With `--remote`, `allma-flows check` also fails if a code-owned flow's deployed
copy was taken over in the editor, catching divergence before the next deploy.

## Next steps

- The complete API and CLI surface: [Flow Builder Reference](../reference/flow-builder-reference.md).
- The JSON the builder emits: [Flow Definition Reference](../reference/flow-definition-reference.md).
