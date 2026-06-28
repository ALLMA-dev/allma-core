/**
 * Reference example: a flow that references a code-authored prompt by typed
 * OBJECT (Phase 3), and uses an opt-in typed context for refactor-safe mappings.
 *
 * Build the whole config dir together so the cross-artifact reference resolves:
 *
 *   allma-flows build  "packages/flow-builder/samples/*.ts" --out ./out
 *   allma-flows check  "packages/flow-builder/samples/*.ts" --out ./out
 *   allma-flows deploy "packages/flow-builder/samples/*.ts" --remote $ALLMA_API --publish
 */
import { defineFlow, llmInvocation, endFlow, flowContext } from '@allma/flow-builder';
import summaryPrompt from './summary-prompt.prompt.js';

/** The shape of this flow's runtime context — drives compile-time path checking. */
interface Ctx {
  steps_output: { summarize: { text: string } };
}
const $ = flowContext<Ctx>();

const flow = defineFlow({
  id: 'config-as-code-summary',
  name: 'Config-as-code summary',
  description: 'Summarize using a code-authored prompt referenced by object.',
});

const s = flow.steps({
  summarize: llmInvocation({
    llmProvider: 'AWS_BEDROCK',
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    // Typed object reference — not a bare string id.
    promptTemplateId: summaryPrompt,
  }).outputs({ [$('$.steps_output.summarize.text')]: '$.text' }),

  done: endFlow(),
});

s.summarize.next(s.done);
flow.start(s.summarize);

export default flow;
