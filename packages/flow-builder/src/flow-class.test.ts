import { describe, it, expect } from 'vitest';
import {
  Flow,
  defineFlow,
  deployVar,
  s3DataLoad,
  llmInvocation,
  s3DataSave,
  customLambdaInvoke,
  jp,
  FlowBuildError,
} from './index.js';

/** The same flow authored with the functional builder. */
function viaDefineFlow() {
  const flow = defineFlow({
    id: 'parity',
    description: 'load -> summarize -> save',
    variables: { outputBucket: deployVar('out-{{stage}}') },
  });
  const s = flow.steps({
    load: s3DataLoad({ sourceS3Uri: 's3://in/doc.txt', outputFormat: 'TEXT' }).displayName('Load'),
    summarize: llmInvocation({ llmProvider: 'AWS_BEDROCK', modelId: 'm' }).inputs({ 'prompt.x': jp('$.steps_output.load') }),
    store: s3DataSave({ destinationS3UriTemplate: 's3://{{flow_variables.outputBucket}}/r.json' }),
    onErr: customLambdaInvoke({ lambdaFunctionArnTemplate: 'arn:aws:lambda:us-east-1:1:function:f' }),
  });
  s.load.next(s.summarize).onError({ fallback: s.onErr });
  s.summarize.when(jp.eq('$.steps_output.load', 'x'), s.store);
  s.summarize.next(s.store);
  flow.start(s.load);
  return flow;
}

/** The same flow authored with the OO facade. */
function viaClassFlow() {
  const flow = new Flow({
    id: 'parity',
    description: 'load -> summarize -> save',
    variables: { outputBucket: deployVar('out-{{stage}}') },
  });
  const load = flow.addStep('load', s3DataLoad({ sourceS3Uri: 's3://in/doc.txt', outputFormat: 'TEXT' }).displayName('Load'));
  const summarize = flow.addStep('summarize', llmInvocation({ llmProvider: 'AWS_BEDROCK', modelId: 'm' }).inputs({ 'prompt.x': jp('$.steps_output.load') }));
  const store = flow.addStep('store', s3DataSave({ destinationS3UriTemplate: 's3://{{flow_variables.outputBucket}}/r.json' }));
  const onErr = flow.addStep('onErr', customLambdaInvoke({ lambdaFunctionArnTemplate: 'arn:aws:lambda:us-east-1:1:function:f' }));
  load.next(summarize).onError({ fallback: onErr });
  summarize.when(jp.eq('$.steps_output.load', 'x'), store);
  summarize.next(store);
  flow.start(load);
  return flow;
}

describe('class Flow', () => {
  it('produces an artifact identical to the functional builder (parity)', () => {
    expect(viaClassFlow().toExport()).toEqual(viaDefineFlow().toExport());
  });

  it('stamps authoringSource="code" like defineFlow', () => {
    expect(viaClassFlow().build().authoringSource).toBe('code');
  });

  it('rejects a duplicate step id', () => {
    const flow = new Flow({ id: 'dup' });
    flow.addStep('a', s3DataSave({ destinationS3UriTemplate: 's3://x/y' }));
    expect(() => flow.addStep('a', s3DataSave({ destinationS3UriTemplate: 's3://x/z' }))).toThrow(/twice/);
  });

  it('runs the same strict validation gate (missing start fails)', () => {
    const flow = new Flow({ id: 'no-start' });
    flow.addStep('only', s3DataSave({ destinationS3UriTemplate: 's3://x/y' }));
    expect(() => flow.build()).toThrow(FlowBuildError);
  });
});
