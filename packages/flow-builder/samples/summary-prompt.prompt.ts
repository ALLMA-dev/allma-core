/**
 * Reference example: a reusable prompt template authored in code (Phase 3).
 *
 * Compile it alongside flows with:
 *
 *   allma-flows build "packages/flow-builder/samples/*.ts" --out ./out
 *
 * to produce a deterministic `summary-prompt.prompt.json`. A flow references this
 * by importing the handle and passing it as a typed object (see
 * `config-as-code.flow.ts`), so a renamed prompt is a compile error.
 */
import { definePrompt } from '@allma/flow-builder';

const summaryPrompt = definePrompt({
  id: 'summary-prompt',
  name: 'Document summary',
  description: 'Summarizes a document into a few sentences.',
  content: 'Summarize the following document in 3 sentences:\n\n{{document}}',
  tags: ['summary'],
});

export default summaryPrompt;
