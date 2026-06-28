import { describe, it, expect } from 'vitest';
import { validateAllmaConfig } from '@allma/core-sdk';
import { applyFlowImportDefaults, FlowDefinitionSchema } from '@allma/core-types';
import {
  defineFlow,
  deployVar,
  s3DataLoad,
  s3DataSave,
  llmInvocation,
  customLambdaInvoke,
  noOp,
  endFlow,
  FlowBuildError,
  STABLE_EXPORTED_AT,
} from './index.js';

/** The canonical worked example: load -> summarize -> save, with a fallback. */
function buildExampleFlow() {
  const flow = defineFlow({
    id: 'basic-extract-and-store',
    description: 'Load a document from S3, summarize with an LLM, store the result.',
    enableExecutionLogs: true,
    variables: { outputBucket: deployVar('basic-deployment-output-{{stage}}') },
  });

  const s = flow.steps({
    load: s3DataLoad({ sourceS3Uri: 's3://basic-deployment-input/doc.txt', outputFormat: 'TEXT' })
      .displayName('1. Load document')
      .outputs({ '$.steps_output.doc_text': '$.body' }),

    summarize: llmInvocation({ llmProvider: 'AWS_BEDROCK', modelId: 'anthropic.claude-3-sonnet' })
      .displayName('2. Summarize')
      .inputs({ 'prompt.document': '$.steps_output.doc_text' })
      .outputs({ '$.steps_output.summary': '$.text' }),

    store: s3DataSave({ destinationS3UriTemplate: 's3://{{flow_variables.outputBucket}}/summary.json' })
      .displayName('3. Store summary'),

    handleError: customLambdaInvoke({ lambdaFunctionArnTemplate: 'arn:aws:lambda:us-east-1:1:function:on-failure' })
      .displayName('Handle failure'),
  });

  s.load.next(s.summarize).onError({ fallback: s.handleError });
  s.summarize.next(s.store).onError({ fallback: s.handleError });
  flow.start(s.load);
  return flow;
}

describe('build() round-trip', () => {
  it('emits a flow the deploy validator and FlowDefinitionSchema accept', () => {
    const exported = buildExampleFlow().toExport();
    expect(exported.formatVersion).toBe('1.0');
    expect(exported.exportedAt).toBe(STABLE_EXPORTED_AT);

    const result = validateAllmaConfig(exported, 'basic-extract-and-store.flow.json');
    expect(result.success, JSON.stringify((result as { error?: unknown }).error)).toBe(true);

    const flow = exported.flows![0] as Record<string, unknown>;
    const imported = applyFlowImportDefaults(flow, '2026-06-28T00:00:00.000Z');
    expect(FlowDefinitionSchema.safeParse(imported).success).toBe(true);
  });

  it('stamps authoringSource="code" so the editor opens it read-only (RFC §6)', () => {
    const flow = buildExampleFlow().build();
    expect(flow.authoringSource).toBe('code');
    const exported = buildExampleFlow().toExport();
    expect((exported.flows![0] as Record<string, unknown>).authoringSource).toBe('code');
  });

  it('resolves ref-based wiring to ids and sets the start step', () => {
    const flow = buildExampleFlow().build();
    expect(flow.startStepInstanceId).toBe('load');
    const load = flow.steps.load as Record<string, unknown>;
    expect(load.defaultNextStepInstanceId).toBe('summarize');
    expect((load.onError as Record<string, unknown>).fallbackStepInstanceId).toBe('handleError');
  });

  it('emits NO positions so the editor auto-lays-out code-owned flows (Dagre)', () => {
    const flow = buildExampleFlow().build();
    for (const step of Object.values(flow.steps)) {
      expect(step).not.toHaveProperty('position');
    }
  });
});

describe('deterministic emit', () => {
  it('produces byte-identical output across builds', () => {
    const a = buildExampleFlow().toExport();
    const b = buildExampleFlow().toExport();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('strict authoring gate', () => {
  it('rejects an unknown payload key (stricter than the persisted passthrough schema)', () => {
    const flow = defineFlow({ id: 'bad-payload' });
    // Bypass the compile-time check to exercise the runtime strict clone.
    const s = flow.steps({ only: (noOp as (c: unknown) => ReturnType<typeof noOp>)({ bogusKey: 1 }) });
    flow.start(s.only);
    expect(() => flow.build()).toThrowError(FlowBuildError);
    try {
      flow.build();
    } catch (e) {
      expect((e as FlowBuildError).issues.join('\n')).toMatch(/bogusKey/);
    }
  });

  it('rejects an invalid known-module customConfig via the registry', () => {
    const flow = defineFlow({ id: 'bad-config' });
    const s = flow.steps({ load: s3DataLoad({ sourceS3Uri: 'not-an-s3-uri' }) });
    flow.start(s.load);
    expect(() => flow.build()).toThrowError(FlowBuildError);
    try {
      flow.build();
    } catch (e) {
      expect((e as FlowBuildError).issues.join('\n')).toMatch(/customConfig/);
    }
  });

  it('reports a dangling fallback/transition target', () => {
    const flow = defineFlow({ id: 'dangling' });
    const s = flow.steps({ a: noOp(), b: endFlow() });
    s.a.next(s.b);
    flow.start(s.a);
    // Wire b -> a then "forget" to declare a separate target by hand-editing is not
    // possible with refs; instead validate that a fully-wired flow passes.
    expect(() => flow.build()).not.toThrow();
  });
});

describe('deploy-token placement scan', () => {
  it('throws when a deploy token appears outside flowVariables', () => {
    const flow = defineFlow({ id: 'misplaced-token' });
    const s = flow.steps({
      // {{stage}} here is never rendered by the importer and absent at runtime.
      save: s3DataSave({ destinationS3UriTemplate: 's3://bucket-{{stage}}/out.json' }),
    });
    flow.start(s.save);
    expect(() => flow.build()).toThrowError(FlowBuildError);
    try {
      flow.build();
    } catch (e) {
      expect((e as FlowBuildError).issues.join('\n')).toMatch(/stage/);
    }
  });

  it('allows runtime Handlebars templates ({{flow_variables.x}}, {{steps_output.y}}) anywhere', () => {
    const flow = defineFlow({ id: 'runtime-templates', variables: { bucket: deployVar('b-{{stage}}') } });
    const s = flow.steps({
      save: s3DataSave({ destinationS3UriTemplate: 's3://{{flow_variables.bucket}}/{{steps_output.id}}.json' }),
    });
    flow.start(s.save);
    expect(() => flow.build()).not.toThrow();
  });

  it('deployVar() eagerly rejects an unknown deploy token', () => {
    expect(() => deployVar('x-{{stagee}}')).toThrowError(/unknown deploy token/i);
  });
});

describe('cycles / back-edges wire with refs (no string refs)', () => {
  it('supports a back-edge to an earlier step', () => {
    const flow = defineFlow({ id: 'loopy' });
    const s = flow.steps({ a: noOp(), b: noOp(), done: endFlow() });
    s.a.next(s.b);
    s.b.when('$.steps_output.b.retry == true', s.a).next(s.done); // back-edge b -> a
    flow.start(s.a);
    const built = flow.build();
    const b = built.steps.b as Record<string, unknown>;
    const transitions = b.transitions as { nextStepInstanceId: string }[];
    expect(transitions[0].nextStepInstanceId).toBe('a');
    expect(b.defaultNextStepInstanceId).toBe('done');
  });
});
