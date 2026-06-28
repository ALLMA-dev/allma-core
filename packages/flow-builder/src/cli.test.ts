import { describe, it, expect } from 'vitest';
import { defineFlow, s3DataLoad, llmInvocation, s3DataSave, startSubFlow, endFlow } from './index.js';
import { buildArtifacts, checkArtifacts, harvestCatalogIds } from './cli/commands.js';
import type { Catalog } from './catalog.js';

function exampleBuilder() {
  const flow = defineFlow({ id: 'cli-example', description: 'load -> summarize -> save' });
  const s = flow.steps({
    load: s3DataLoad({ sourceS3Uri: 's3://in/doc.txt' }),
    summarize: llmInvocation({ llmProvider: 'AWS_BEDROCK', modelId: 'm' }).inputs({
      'prompt.x': '$.steps_output.load',
    }),
    save: s3DataSave({ destinationS3UriTemplate: 's3://out/r.json' }),
  });
  s.load.next(s.summarize);
  s.summarize.next(s.save);
  flow.start(s.load);
  return flow;
}

describe('cli commands', () => {
  it('buildArtifacts emits deterministic, named *.flow.json content', () => {
    const [artifact] = buildArtifacts([exampleBuilder()]);
    expect(artifact.fileName).toBe('cli-example.flow.json');
    expect(artifact.json.endsWith('\n')).toBe(true);
    // Determinism: rebuild matches byte-for-byte.
    expect(buildArtifacts([exampleBuilder()])[0].json).toBe(artifact.json);
    // It is the deploy envelope.
    expect(JSON.parse(artifact.json).formatVersion).toBe('1.0');
  });

  it('checkArtifacts passes a valid flow with no unresolved references', () => {
    const result = checkArtifacts([exampleBuilder()]);
    expect(result.validationIssues).toEqual([]);
    expect(result.resolutionIssues).toEqual([]);
  });

  it('checkArtifacts surfaces a dangling cross-artifact reference', () => {
    const flow = defineFlow({ id: 'parent' });
    const s = flow.steps({ start: startSubFlow({ subFlowDefinitionId: 'missing-child' }), done: endFlow() });
    s.start.next(s.done);
    flow.start(s.start);
    const result = checkArtifacts([flow]);
    expect(result.resolutionIssues).toHaveLength(1);
    expect(result.resolutionIssues[0].id).toBe('missing-child');
  });

  it('harvestCatalogIds collects ids from an export-shaped JSON object', () => {
    const catalog: Catalog = { flowIds: new Set(), promptTemplateIds: new Set(), stepDefinitionIds: new Set() };
    harvestCatalogIds({ flows: [{ id: 'f1' }], promptTemplates: [{ id: 'p1' }], stepDefinitions: [{ id: 's1' }] }, catalog);
    expect([...catalog.flowIds, ...catalog.promptTemplateIds, ...catalog.stepDefinitionIds]).toEqual(['f1', 'p1', 's1']);
  });

  it('round-trips through a discardable empty-start guard', () => {
    const flow = defineFlow({ id: 'no-steps' });
    const result = checkArtifacts([flow]);
    expect(result.validationIssues.join('\n')).toMatch(/no steps|no start/i);
  });
});
