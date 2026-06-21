import { describe, it, expect } from 'vitest';
import { StepType } from '@allma/core-types';
import { flowDefinitionToElements } from '../../../../../src/features/flows/editor/flow-utils.js';
import { makeStep, makeFlow } from '../../../../_helpers/fixtures/flow-editor.js';

describe('flowDefinitionToElements — nodes', () => {
  it('creates one node per step, flagging the start node and falling back to the key for the label', () => {
    const flow = makeFlow(
      {
        a: makeStep('a', { displayName: 'Alpha', position: { x: 1, y: 2 } }),
        b: makeStep('b', { displayName: undefined, position: { x: 3, y: 4 } }),
      },
      { startStepInstanceId: 'a' },
    );

    const { nodes } = flowDefinitionToElements(flow);

    expect(nodes.map((n) => n.id).sort()).toEqual(['a', 'b']);
    expect(nodes.find((n) => n.id === 'a')!.data.label).toBe('Alpha');
    expect(nodes.find((n) => n.id === 'b')!.data.label).toBe('b'); // falls back to the key
    expect(nodes.find((n) => n.id === 'a')!.data.isStartNode).toBe(true);
    expect(nodes.find((n) => n.id === 'b')!.data.isStartNode).toBe(false);
  });

  it('preserves saved positions and does not auto-layout when any step has a position', () => {
    const flow = makeFlow({
      a: makeStep('a', { position: { x: 11, y: 22 } }),
      b: makeStep('b', { position: { x: 33, y: 44 } }),
    });

    const { nodes, flow: outFlow } = flowDefinitionToElements(flow);

    expect(nodes.find((n) => n.id === 'a')!.position).toEqual({ x: 11, y: 22 });
    expect(outFlow).toBe(flow); // unchanged reference — no layout pass
  });

  it('auto-lays-out and writes positions back when no step has a position', () => {
    const flow = makeFlow({
      a: makeStep('a', { position: undefined, defaultNextStepInstanceId: 'b' }),
      b: makeStep('b', { position: undefined }),
    });

    const { nodes, flow: outFlow } = flowDefinitionToElements(flow);

    for (const node of nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
    // Top-to-bottom layout: the downstream node sits below the source.
    const a = nodes.find((n) => n.id === 'a')!;
    const b = nodes.find((n) => n.id === 'b')!;
    expect(b.position.y).toBeGreaterThan(a.position.y);
    // Positions are written back into a fresh flow object (not the input).
    expect(outFlow).not.toBe(flow);
    expect(outFlow.steps.a.position).toEqual(a.position);
  });
});

describe('flowDefinitionToElements — edges', () => {
  it('emits a default edge for defaultNextStepInstanceId', () => {
    const flow = makeFlow({
      a: makeStep('a', { defaultNextStepInstanceId: 'b', position: { x: 0, y: 0 } }),
      b: makeStep('b', { position: { x: 0, y: 1 } }),
    });

    const { edges } = flowDefinitionToElements(flow);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      id: 'e-a-default-b',
      source: 'a',
      target: 'b',
      data: { edgeType: 'default' },
    });
  });

  it('emits conditional edges carrying their condition', () => {
    const flow = makeFlow({
      a: makeStep('a', {
        position: { x: 0, y: 0 },
        transitions: [{ condition: '$.ok', nextStepInstanceId: 'b' }] as never,
      }),
      b: makeStep('b', { position: { x: 0, y: 1 } }),
    });

    const { edges } = flowDefinitionToElements(flow);
    const cond = edges.find((e) => e.data?.edgeType === 'conditional')!;
    expect(cond.id).toBe('e-a-cond-0-b');
    expect(cond.target).toBe('b');
    expect(cond.data?.condition).toBe('$.ok');
  });

  it('emits a fallback edge for an onError handler', () => {
    const flow = makeFlow({
      a: makeStep('a', { position: { x: 0, y: 0 }, onError: { fallbackStepInstanceId: 'b' } } as never),
      b: makeStep('b', { position: { x: 0, y: 1 } }),
    });

    const { edges } = flowDefinitionToElements(flow);
    expect(edges.find((e) => e.data?.edgeType === 'fallback')).toMatchObject({
      id: 'e-a-error-b',
      target: 'b',
    });
  });
});

describe('flowDefinitionToElements — parallel branches', () => {
  const branchedFlow = () =>
    makeFlow({
      fork: makeStep('fork', {
        stepType: StepType.PARALLEL_FORK_MANAGER,
        position: { x: 0, y: 0 },
        parallelBranches: [{ stepInstanceId: 'b1', branchId: 'br1' }],
      } as never),
      b1: makeStep('b1', { position: { x: 0, y: 1 }, defaultNextStepInstanceId: 'b2' }),
      b2: makeStep('b2', { position: { x: 0, y: 2 } }),
    });

  it('emits a branch edge from the fork to each branch entry step', () => {
    const { edges } = flowDefinitionToElements(branchedFlow());
    expect(edges.find((e) => e.data?.edgeType === 'branch')).toMatchObject({
      id: 'e-fork-branch-b1',
      source: 'fork',
      target: 'b1',
      data: { branchId: 'br1' },
    });
  });

  it('tags every step reachable within a branch with its fork/branch info', () => {
    const { nodes } = flowDefinitionToElements(branchedFlow());
    for (const id of ['b1', 'b2']) {
      expect(nodes.find((n) => n.id === id)!.data.branchInfo).toEqual({ forkId: 'fork', branchId: 'br1' });
    }
  });

  it('marks a terminal branch step (no outgoing flow) as a branch end', () => {
    const { nodes } = flowDefinitionToElements(branchedFlow());
    expect(nodes.find((n) => n.id === 'b1')!.data.isBranchEnd).toBe(false); // has a next step
    expect(nodes.find((n) => n.id === 'b2')!.data.isBranchEnd).toBe(true); // terminal
  });
});
