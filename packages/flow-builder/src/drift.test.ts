import { describe, it, expect, vi } from 'vitest';
import { detectDrift, type DeployedFlow, type LocalCodeFlow } from './drift.js';
import type { FlowAuthoringFormat } from '@allma/core-types';

const codeFlow = (overrides: Partial<FlowAuthoringFormat> = {}): FlowAuthoringFormat =>
  ({
    id: 'f1',
    version: 1,
    authoringSource: 'code',
    startStepInstanceId: 'a',
    steps: { a: { stepInstanceId: 'a', stepType: 'NO_OP' } },
    ...overrides,
  }) as unknown as FlowAuthoringFormat;

const local = (flow = codeFlow()): LocalCodeFlow[] => [{ flowId: flow.id, version: flow.version, flow }];

/** The deployed copy = the local flow plus the server bookkeeping the importer stamps. */
const deployed = (flow: FlowAuthoringFormat, overrides: Partial<DeployedFlow> = {}): DeployedFlow => ({
  ...(flow as unknown as DeployedFlow),
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-02T00:00:00.000Z',
  isPublished: false,
  ...overrides,
});

describe('detectDrift', () => {
  it('reports no drift when the deployed copy matches the code source', async () => {
    const flow = codeFlow();
    const fetchDeployed = vi.fn().mockResolvedValue(deployed(flow));
    expect(await detectDrift(local(flow), fetchDeployed)).toEqual([]);
  });

  it('flags editor-owned drift when the deployed copy is no longer authoringSource=code', async () => {
    const flow = codeFlow();
    const fetchDeployed = vi.fn().mockResolvedValue(deployed(flow, { authoringSource: 'visual' }));
    const issues = await detectDrift(local(flow), fetchDeployed);
    expect(issues).toHaveLength(1);
    expect(issues[0].reason).toBe('editor-owned');
  });

  it('flags content-mismatch when an authored field differs but it is still code-owned', async () => {
    const flow = codeFlow({ description: 'from code' });
    const changed = deployed(codeFlow({ description: 'edited live' }));
    const fetchDeployed = vi.fn().mockResolvedValue(changed);
    const issues = await detectDrift(local(flow), fetchDeployed);
    expect(issues).toHaveLength(1);
    expect(issues[0].reason).toBe('content-mismatch');
  });

  it('ignores server-stamped fields the source never authors', async () => {
    const flow = codeFlow();
    // Deployed has extra bookkeeping + a defaulted flowVariables, but the authored fields match.
    const fetchDeployed = vi.fn().mockResolvedValue(deployed(flow, { publishedAt: null, flowVariables: {} }));
    expect(await detectDrift(local(flow), fetchDeployed)).toEqual([]);
  });

  it('treats a not-yet-deployed flow as no drift', async () => {
    const fetchDeployed = vi.fn().mockResolvedValue(null);
    expect(await detectDrift(local(), fetchDeployed)).toEqual([]);
  });

  it('skips flows that are not code-owned locally', async () => {
    const visual = codeFlow({ authoringSource: 'visual' });
    const fetchDeployed = vi.fn().mockResolvedValue(deployed(visual, { authoringSource: 'visual' }));
    expect(await detectDrift(local(visual), fetchDeployed)).toEqual([]);
    expect(fetchDeployed).not.toHaveBeenCalled();
  });
});
