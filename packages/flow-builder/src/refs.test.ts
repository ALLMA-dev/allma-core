import { describe, it, expect } from 'vitest';
import {
  defineFlow,
  definePrompt,
  defineMcpConnection,
  llmInvocation,
  mcpCall,
  startSubFlow,
  endFlow,
  noOp,
  external,
  resolveReferences,
} from './index.js';
import { checkArtifacts } from './cli/commands.js';

const prompt = definePrompt({ id: 'summary-prompt', name: 'Summary', content: 'Summarize {{doc}}' });
const conn = defineMcpConnection({
  id: 'github-mcp',
  name: 'GitHub MCP',
  serverUrl: 'https://mcp.example.com',
  authentication: { type: 'NONE' },
});

/** A flow that references a prompt handle and an MCP connection handle by OBJECT. */
function flowUsingHandles() {
  const flow = defineFlow({ id: 'uses-handles' });
  const s = flow.steps({
    summarize: llmInvocation({
      llmProvider: 'AWS_BEDROCK',
      modelId: 'anthropic.claude-3-sonnet',
      promptTemplateId: prompt,
    }),
    tool: mcpCall({ mcpConnectionId: conn, toolName: 'search' }),
    done: endFlow(),
  });
  s.summarize.next(s.tool);
  s.tool.next(s.done);
  flow.start(s.summarize);
  return flow;
}

describe('typed object refs', () => {
  it('normalizes a prompt handle to its string id in the emitted artifact', () => {
    const flow = flowUsingHandles().build();
    const steps = flow.steps as Record<string, Record<string, unknown>>;
    expect(steps.summarize.promptTemplateId).toBe('summary-prompt');
    expect(steps.tool.mcpConnectionId).toBe('github-mcp');
  });

  it('normalizes a flow handle in a sub-flow reference', () => {
    const child = defineFlow({ id: 'child' });
    const cs = child.steps({ only: noOp() });
    child.start(cs.only);

    const parent = defineFlow({ id: 'parent' });
    const ps = parent.steps({ start: startSubFlow({ subFlowDefinitionId: child }), done: endFlow() });
    ps.start.next(ps.done);
    parent.start(ps.start);

    const steps = parent.build().steps as Record<string, Record<string, unknown>>;
    expect(steps.start.subFlowDefinitionId).toBe('child');
  });
});

describe('cross-artifact resolution across all artifact kinds', () => {
  it('flags a dangling prompt and mcp reference when not in the catalog', () => {
    const issues = resolveReferences([flowUsingHandles().build()]);
    const kinds = issues.map((i) => i.kind).sort();
    expect(kinds).toEqual(['mcpConnection', 'prompt']);
  });

  it('resolves prompt/mcp refs supplied via a known catalog', () => {
    const issues = resolveReferences([flowUsingHandles().build()], {
      promptTemplateIds: new Set(['summary-prompt']),
      mcpConnectionIds: new Set(['github-mcp']),
    });
    expect(issues).toHaveLength(0);
  });

  it('honors external() for an intentionally out-of-dir mcp connection', () => {
    const flow = defineFlow({ id: 'ext' });
    const s = flow.steps({
      tool: mcpCall({ mcpConnectionId: external('platform-managed-mcp'), toolName: 'x' }),
      done: endFlow(),
    });
    s.tool.next(s.done);
    flow.start(s.tool);
    expect(resolveReferences([flow.build()])).toHaveLength(0);
  });

  it('resolves locally-authored prompt/mcp handles when built together (checkArtifacts)', () => {
    const { validationIssues, resolutionIssues } = checkArtifacts([prompt, conn, flowUsingHandles()]);
    expect(validationIssues).toEqual([]);
    expect(resolutionIssues).toEqual([]);
  });
});
