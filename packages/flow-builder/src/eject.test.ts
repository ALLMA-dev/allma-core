import { describe, it, expect } from 'vitest';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  defineFlow,
  deployVar,
  s3DataLoad,
  s3DataSave,
  llmInvocation,
  customLambdaInvoke,
  dataTransform,
  ejectFlow,
  flowToBuilderSpec,
  type FlowBuilder,
} from './index.js';

/** Absolute path to the local builder entry, so generated TS imports the source under test. */
const LOCAL_INDEX = fileURLToPath(new URL('./index.ts', import.meta.url));

/** A flow exercising typed steps, a registry wrapper, an escape hatch, wiring + onError. */
function buildSampleFlow(): FlowBuilder {
  const flow = defineFlow({
    id: 'eject-sample',
    name: 'Eject Sample',
    description: 'Round-trip fixture',
    enableExecutionLogs: true,
    variables: { outputBucket: deployVar('out-{{stage}}') },
  });

  const s = flow.steps({
    load: s3DataLoad({ sourceS3Uri: 's3://in/doc.txt', outputFormat: 'TEXT' })
      .displayName('1. Load')
      .outputs({ '$.steps_output.doc_text': '$.body' }),

    summarize: llmInvocation({ llmProvider: 'AWS_BEDROCK', modelId: 'anthropic.claude-3-sonnet' })
      .displayName('2. Summarize')
      .inputs({ 'prompt.document': '$.steps_output.doc_text' }),

    reshape: dataTransform({ moduleIdentifier: 'consumer/custom-reshape', customConfig: { mode: 'x' } })
      .displayName('3. Reshape'),

    store: s3DataSave({ destinationS3UriTemplate: 's3://{{flow_variables.outputBucket}}/out.json' }),

    handleError: customLambdaInvoke({ lambdaFunctionArnTemplate: 'arn:aws:lambda:us-east-1:1:function:on-failure' }),
  });

  s.load.next(s.summarize).onError({ fallback: s.handleError, continueOnFailure: true });
  s.summarize.when('$.steps_output.doc_text', s.reshape);
  s.summarize.next(s.store);
  flow.start(s.load);
  return flow;
}

/** Writes generated source to a temp file, imports it, and returns its default builder. */
async function importGenerated(source: string): Promise<FlowBuilder> {
  const dir = await mkdtemp(join(tmpdir(), 'allma-eject-'));
  const file = join(dir, 'generated.flow.ts');
  await writeFile(file, source, 'utf8');
  try {
    const mod = (await import(/* @vite-ignore */ file)) as { default: FlowBuilder };
    return mod.default;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('ejectFlow', () => {
  it('round-trips JSON -> TS -> build() back to the same artifact', async () => {
    const original = buildSampleFlow().toExport();
    const flow = original.flows![0];

    const source = ejectFlow(flow, { importSpecifier: LOCAL_INDEX });
    const rebuilt = await importGenerated(source);

    expect(rebuilt.toExport()).toEqual(original);
  });

  it('uses the registry wrapper for known modules and the escape hatch for unknown ones', () => {
    const flow = buildSampleFlow().toExport().flows![0];
    const spec = flowToBuilderSpec(flow);
    const byId = Object.fromEntries(spec.steps.map((st) => [st.id, st.factory]));
    expect(byId.load).toBe('s3DataLoad'); // known system module -> typed wrapper
    expect(byId.store).toBe('s3DataSave');
    expect(byId.reshape).toBe('dataTransform'); // consumer module -> generic escape hatch
    expect(byId.summarize).toBe('llmInvocation'); // typed-payload factory
  });

  it('defaults the import specifier to the published package name', () => {
    const flow = buildSampleFlow().toExport().flows![0];
    const source = ejectFlow(flow);
    expect(source).toContain("from '@allma/flow-builder'");
    expect(source).toContain('export default flow;');
  });
});
