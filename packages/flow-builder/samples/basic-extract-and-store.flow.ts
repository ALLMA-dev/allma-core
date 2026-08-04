/**
 * Reference example: a generic "load → summarize → store" flow authored in code.
 *
 * Product-agnostic, modeled on the generic `examples/basic-deployment` demo (per
 * AGENTS.md, platform docs use only the generic demo). Compile it with:
 *
 *   allma-flows build "packages/flow-builder/samples/*.flow.ts" --out ./out
 *
 * to produce a deterministic `basic-extract-and-store.flow.json` the CDK
 * config-importer can deploy unchanged.
 */
import {
  defineFlow,
  deployVar,
  s3DataLoad,
  s3DataSave,
  llmInvocation,
  customLambdaInvoke,
} from '@allma/flow-builder';

const flow = defineFlow({
  id: 'basic-extract-and-store',
  name: 'Basic Extract and Store',
  description: 'Load a document from S3, summarize it with an LLM, and store the result.',
  enableExecutionLogs: true,
  // The only place deploy placeholders are rendered (by the importer). Steps
  // reference it at runtime via the Handlebars context as {{flow_variables.outputBucket}}.
  variables: { outputBucket: deployVar('basic-deployment-output-{{stage}}') },
});

// Phase 1 — declare steps; `s` is a typed record of refs.
const s = flow.steps({
  load: s3DataLoad({ sourceS3Uri: 's3://basic-deployment-input/document.txt', outputFormat: 'TEXT' })
    .displayName('1. Load document')
    .outputs({ '$.steps_output.doc_text': '$.body' }),

  summarize: llmInvocation({ llmProvider: 'AWS_BEDROCK', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' })
    .displayName('2. Summarize')
    .inputs({ 'prompt.document': '$.steps_output.doc_text' })
    .outputs({ '$.steps_output.summary': '$.text' }),

  store: s3DataSave({ destinationS3UriTemplate: 's3://{{flow_variables.outputBucket}}/summary.json' })
    .displayName('3. Store summary'),

  handleError: customLambdaInvoke({
    lambdaFunctionArnTemplate: 'arn:aws:lambda:us-east-1:000000000000:function:basic-deployment-on-failure',
  }).displayName('Handle failure'),
});

// Phase 2 — wire with refs (refactor-safe; cycles allowed).
s.load.next(s.summarize).onError({ fallback: s.handleError });
s.summarize.next(s.store).onError({ fallback: s.handleError });
flow.start(s.load);

export default flow;
