import { describe, it, expect } from 'vitest';
import { validateAllmaConfig } from '@allma/core-sdk';
import {
  definePrompt,
  defineStep,
  defineMcpConnection,
  llmInvocation,
  s3DataLoad,
  ArtifactBuildError,
  STABLE_TIMESTAMP,
  STABLE_EXPORTED_AT,
} from './index.js';
import { stableStringify } from './serialize.js';

describe('definePrompt', () => {
  it('builds a deterministic, deploy-valid prompt template', () => {
    const prompt = definePrompt({ id: 'summary-prompt', name: 'Summary', content: 'Summarize: {{doc}}' });
    expect(prompt.id).toBe('summary-prompt');
    expect(prompt.kind).toBe('prompt');

    const built = prompt.build();
    expect(built.createdAt).toBe(STABLE_TIMESTAMP);
    expect(built.updatedAt).toBe(STABLE_TIMESTAMP);
    expect(built.version).toBe(1);

    const exported = prompt.toExport();
    expect(exported.exportedAt).toBe(STABLE_EXPORTED_AT);
    expect(exported.promptTemplates).toHaveLength(1);
    const result = validateAllmaConfig(exported, 'summary-prompt.prompt.json');
    expect(result.success, JSON.stringify((result as { error?: unknown }).error)).toBe(true);
  });

  it('is byte-stable across builds', () => {
    const make = () => definePrompt({ id: 'p', name: 'P', content: 'x' }).toExport();
    expect(stableStringify(make())).toBe(stableStringify(make()));
  });

  it('rejects an unknown key via the strict gate', () => {
    const prompt = definePrompt({ id: 'p', name: 'P', content: 'x', bogus: 1 } as never);
    expect(() => prompt.build()).toThrow(ArtifactBuildError);
  });

  it('rejects an empty content via the schema', () => {
    expect(() => definePrompt({ id: 'p', name: 'P', content: '' }).build()).toThrow(ArtifactBuildError);
  });
});

describe('defineMcpConnection', () => {
  it('builds a deterministic, deploy-valid connection', () => {
    const conn = defineMcpConnection({
      id: 'github-mcp',
      name: 'GitHub MCP',
      serverUrl: 'https://mcp.example.com',
      authentication: { type: 'NONE' },
    });
    expect(conn.kind).toBe('mcpConnection');
    const built = conn.build();
    expect(built.createdAt).toBe(STABLE_TIMESTAMP);

    const result = validateAllmaConfig(conn.toExport(), 'github-mcp.mcp.json');
    expect(result.success, JSON.stringify((result as { error?: unknown }).error)).toBe(true);
  });

  it('rejects an invalid serverUrl', () => {
    const conn = defineMcpConnection({
      id: 'bad',
      name: 'Bad',
      serverUrl: 'not-a-url',
      authentication: { type: 'NONE' },
    });
    expect(() => conn.build()).toThrow(ArtifactBuildError);
  });
});

describe('defineStep', () => {
  it('builds a deploy-valid step definition from a typed factory', () => {
    const def = defineStep(
      { id: 'summarize-doc', name: 'Summarize document' },
      llmInvocation({ llmProvider: 'AWS_BEDROCK', modelId: 'anthropic.claude-3-sonnet' }).outputs({
        '$.steps_output.summary': '$.text',
      }),
    );
    expect(def.kind).toBe('stepDefinition');
    const built = def.build();
    expect(built.id).toBe('summarize-doc');
    expect((built as Record<string, unknown>).stepType).toBe('LLM_INVOCATION');
    expect((built as Record<string, unknown>).outputMappings).toEqual({ '$.steps_output.summary': '$.text' });

    const result = validateAllmaConfig(def.toExport(), 'summarize-doc.step.json');
    expect(result.success, JSON.stringify((result as { error?: unknown }).error)).toBe(true);
  });

  it('builds a module-based step definition with registry-validated customConfig', () => {
    const def = defineStep(
      { id: 'load-doc', name: 'Load document' },
      s3DataLoad({ sourceS3Uri: 's3://bucket/doc.txt', outputFormat: 'TEXT' }),
    );
    const result = validateAllmaConfig(def.toExport(), 'load-doc.step.json');
    expect(result.success, JSON.stringify((result as { error?: unknown }).error)).toBe(true);
  });

  it('rejects an unknown payload key via the per-leaf strict gate', () => {
    const def = defineStep(
      { id: 'bad-step', name: 'Bad' },
      llmInvocation({ llmProvider: 'AWS_BEDROCK', modelId: 'm', bogusField: true } as never),
    );
    expect(() => def.build()).toThrow(ArtifactBuildError);
  });
});
