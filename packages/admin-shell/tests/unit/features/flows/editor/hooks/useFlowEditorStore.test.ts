import { describe, it, expect, beforeEach } from 'vitest';
import useFlowEditorStore from '../../../../../../src/features/flows/editor/hooks/useFlowEditorStore.js';
import { makeStep, makeNode, makeEdge, makeFlow } from '../../../../../_helpers/fixtures/flow-editor.js';

const store = useFlowEditorStore;
const get = () => store.getState();

/** Reset only the data slice between tests; the action functions are stable singletons. */
beforeEach(() => {
  store.setState({ flowDefinition: null, nodes: [], edges: [], isDirty: false });
});

describe('setFlow', () => {
  it('loads the flow, clears dirty flags, and resets per-node dirty state', () => {
    const flow = makeFlow({ a: makeStep('a') });
    const node = makeNode('a', flow.steps.a, { data: { label: 'a', stepType: flow.steps.a.stepType, config: flow.steps.a, isStartNode: false, isDirty: true } });

    get().setFlow(flow, [node], []);

    expect(get().flowDefinition).toBe(flow);
    expect(get().isDirty).toBe(false);
    expect(get().nodes[0].data.isDirty).toBe(false);
  });
});

describe('addNode', () => {
  it('appends a node, registers its step, and marks the flow dirty', () => {
    get().setFlow(makeFlow({ a: makeStep('a') }), [makeNode('a')], []);

    get().addNode(
      { type: 'stepNode', data: { label: 'New', stepType: get().flowDefinition!.steps.a.stepType, config: {} as never, isStartNode: false } },
      { x: 50, y: 60 },
    );

    const { nodes, flowDefinition } = get();
    expect(nodes).toHaveLength(2);
    const added = nodes[1];
    expect(added.id).toMatch(/^no_op_[0-9a-f]{8}$/);
    expect(added.position).toEqual({ x: 50, y: 60 });
    expect(flowDefinition!.steps[added.id]).toBeDefined();
    expect(flowDefinition!.steps[added.id].stepInstanceId).toBe(added.id);
    expect(get().isDirty).toBe(true);
  });

  it('is a no-op when no flow is loaded', () => {
    get().addNode(
      { type: 'stepNode', data: { label: 'x', stepType: makeStep('x').stepType, config: {} as never, isStartNode: false } },
      { x: 0, y: 0 },
    );
    expect(get().nodes).toHaveLength(0);
  });
});

describe('onConnect', () => {
  const setup = () => {
    const flow = makeFlow({ a: makeStep('a'), b: makeStep('b'), c: makeStep('c') });
    get().setFlow(flow, [makeNode('a'), makeNode('b'), makeNode('c')], []);
  };

  it('makes the first connection the default next step', () => {
    setup();
    get().onConnect({ source: 'a', target: 'b', sourceHandle: null, targetHandle: null });

    const { edges, flowDefinition, isDirty } = get();
    expect(flowDefinition!.steps.a.defaultNextStepInstanceId).toBe('b');
    expect(edges).toHaveLength(1);
    expect(edges[0].data?.edgeType).toBe('default');
    expect(isDirty).toBe(true);
  });

  it('makes a second connection from the same source a conditional transition', () => {
    setup();
    get().onConnect({ source: 'a', target: 'b', sourceHandle: null, targetHandle: null });
    get().onConnect({ source: 'a', target: 'c', sourceHandle: null, targetHandle: null });

    const { edges, flowDefinition } = get();
    expect(flowDefinition!.steps.a.defaultNextStepInstanceId).toBe('b');
    expect(flowDefinition!.steps.a.transitions).toHaveLength(1);
    expect(flowDefinition!.steps.a.transitions![0].nextStepInstanceId).toBe('c');
    expect(edges).toHaveLength(2);
    expect(edges[1].data?.edgeType).toBe('conditional');
  });

  it('ignores a connection with a missing endpoint or unknown source', () => {
    setup();
    get().onConnect({ source: 'a', target: null, sourceHandle: null, targetHandle: null });
    get().onConnect({ source: 'ghost', target: 'b', sourceHandle: null, targetHandle: null });
    expect(get().edges).toHaveLength(0);
    expect(get().isDirty).toBe(false);
  });
});

describe('deleteNodes', () => {
  it('removes the node, its edges, and all references to it', () => {
    const flow = makeFlow(
      {
        a: makeStep('a', { defaultNextStepInstanceId: 'b' }),
        b: makeStep('b'),
        c: makeStep('c', { transitions: [{ condition: '$.x', nextStepInstanceId: 'b' }] as never }),
      },
      { startStepInstanceId: 'a' },
    );
    get().setFlow(
      flow,
      [makeNode('a'), makeNode('b'), makeNode('c')],
      [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'c', 'b')],
    );

    get().deleteNodes(['b']);

    const { nodes, edges, flowDefinition } = get();
    expect(nodes.map((n) => n.id)).toEqual(['a', 'c']);
    expect(edges).toHaveLength(0);
    expect(flowDefinition!.steps.b).toBeUndefined();
    expect(flowDefinition!.steps.a.defaultNextStepInstanceId).toBeUndefined();
    expect(flowDefinition!.steps.c.transitions).toHaveLength(0);
    expect(get().isDirty).toBe(true);
  });

  it('clears the start step when it is deleted', () => {
    const flow = makeFlow({ a: makeStep('a'), b: makeStep('b') }, { startStepInstanceId: 'a' });
    get().setFlow(flow, [makeNode('a'), makeNode('b')], []);

    get().deleteNodes(['a']);
    expect(get().flowDefinition!.startStepInstanceId).toBe('');
  });

  it('onNodesDelete delegates to deleteNodes', () => {
    const flow = makeFlow({ a: makeStep('a'), b: makeStep('b') });
    get().setFlow(flow, [makeNode('a'), makeNode('b')], []);

    get().onNodesDelete([{ id: 'a' } as never]);
    expect(get().nodes.map((n) => n.id)).toEqual(['b']);
  });
});

describe('updateNodeConfig', () => {
  it('renames a step id and rewrites every reference to it', () => {
    const flow = makeFlow(
      {
        a: makeStep('a', { defaultNextStepInstanceId: 'b' }),
        b: makeStep('b'),
      },
      { startStepInstanceId: 'b' },
    );
    get().setFlow(flow, [makeNode('a'), makeNode('b')], [makeEdge('e1', 'a', 'b')]);

    get().updateNodeConfig('b', { config: makeStep('b2') });

    const { flowDefinition, nodes, edges } = get();
    expect(flowDefinition!.steps.b).toBeUndefined();
    expect(flowDefinition!.steps.b2).toBeDefined();
    expect(flowDefinition!.steps.a.defaultNextStepInstanceId).toBe('b2');
    expect(flowDefinition!.startStepInstanceId).toBe('b2');
    expect(nodes.find((n) => n.id === 'b2')).toBeDefined();
    expect(edges[0].target).toBe('b2');
  });

  it('syncs the default edge when defaultNextStepInstanceId changes (no id rename)', () => {
    const flow = makeFlow({ a: makeStep('a'), b: makeStep('b') });
    get().setFlow(flow, [makeNode('a'), makeNode('b')], []);

    get().updateNodeConfig('a', { config: makeStep('a', { defaultNextStepInstanceId: 'b' }) });

    const defaultEdges = get().edges.filter((e) => e.data?.edgeType === 'default');
    expect(defaultEdges).toHaveLength(1);
    expect(defaultEdges[0].source).toBe('a');
    expect(defaultEdges[0].target).toBe('b');
  });
});

describe('updateEdgeCondition', () => {
  it('updates the matching transition condition and the edge data', () => {
    const flow = makeFlow({
      a: makeStep('a', { transitions: [{ condition: '$.old', nextStepInstanceId: 'b' }] as never }),
      b: makeStep('b'),
    });
    get().setFlow(flow, [makeNode('a'), makeNode('b')], [makeEdge('e1', 'a', 'b', { data: { edgeType: 'conditional' } })]);

    get().updateEdgeCondition('e1', '$.new');

    expect(get().flowDefinition!.steps.a.transitions![0].condition).toBe('$.new');
    expect(get().edges[0].data?.condition).toBe('$.new');
    expect(get().isDirty).toBe(true);
  });

  it('is a no-op when the source has no matching transition', () => {
    const flow = makeFlow({ a: makeStep('a'), b: makeStep('b') });
    get().setFlow(flow, [makeNode('a'), makeNode('b')], [makeEdge('e1', 'a', 'b')]);
    get().updateEdgeCondition('e1', '$.x');
    expect(get().isDirty).toBe(false);
  });
});

describe('updateEdgeHandles', () => {
  it('updates only the handles of the targeted edge', () => {
    const flow = makeFlow({ a: makeStep('a'), b: makeStep('b') });
    get().setFlow(flow, [makeNode('a'), makeNode('b')], [makeEdge('e1', 'a', 'b')]);

    get().updateEdgeHandles('e1', { sourceHandle: 'sh', targetHandle: 'th' });

    expect(get().edges[0].sourceHandle).toBe('sh');
    expect(get().edges[0].targetHandle).toBe('th');
  });
});

describe('deleteEdgeById', () => {
  it('removes the edge and cleans the source step references', () => {
    const flow = makeFlow({
      a: makeStep('a', { defaultNextStepInstanceId: 'b' }),
      b: makeStep('b'),
    });
    get().setFlow(flow, [makeNode('a'), makeNode('b')], [makeEdge('e1', 'a', 'b')]);

    get().deleteEdgeById('e1');

    expect(get().edges).toHaveLength(0);
    expect(get().flowDefinition!.steps.a.defaultNextStepInstanceId).toBeUndefined();
  });
});

describe('setStartNode', () => {
  it('sets the start step and flags the chosen node', () => {
    const flow = makeFlow({ a: makeStep('a'), b: makeStep('b') }, { startStepInstanceId: 'a' });
    get().setFlow(flow, [makeNode('a'), makeNode('b')], []);

    get().setStartNode('b');

    expect(get().flowDefinition!.startStepInstanceId).toBe('b');
    expect(get().nodes.find((n) => n.id === 'b')!.data.isStartNode).toBe(true);
    expect(get().nodes.find((n) => n.id === 'a')!.data.isStartNode).toBe(false);
    expect(get().isDirty).toBe(true);
  });

  it('is a no-op when the node is already the start node', () => {
    const flow = makeFlow({ a: makeStep('a') }, { startStepInstanceId: 'a' });
    get().setFlow(flow, [makeNode('a')], []);
    get().setStartNode('a');
    expect(get().isDirty).toBe(false);
  });
});

describe('updateFlowProperties', () => {
  it('merges properties and recomputes which node is the start node', () => {
    const flow = makeFlow({ a: makeStep('a'), b: makeStep('b') }, { startStepInstanceId: 'a' });
    get().setFlow(flow, [makeNode('a'), makeNode('b')], []);

    get().updateFlowProperties({ startStepInstanceId: 'b', name: 'Renamed' });

    expect(get().flowDefinition!.name).toBe('Renamed');
    expect(get().nodes.find((n) => n.id === 'b')!.data.isStartNode).toBe(true);
    expect(get().isDirty).toBe(true);
  });
});

describe('clearDirtyState', () => {
  it('clears the global flag and every per-node dirty flag', () => {
    const flow = makeFlow({ a: makeStep('a') });
    const dirtyNode = makeNode('a');
    dirtyNode.data.isDirty = true;
    get().setFlow(flow, [dirtyNode], []);
    store.setState({ isDirty: true });

    get().clearDirtyState();

    expect(get().isDirty).toBe(false);
    expect(get().nodes[0].data.isDirty).toBe(false);
  });
});

describe('onNodesChange', () => {
  it('persists a node position change into the canonical flow definition', () => {
    const flow = makeFlow({ a: makeStep('a', { position: { x: 0, y: 0 } }) });
    get().setFlow(flow, [makeNode('a')], []);

    get().onNodesChange([{ type: 'position', id: 'a', position: { x: 99, y: 88 } }]);

    expect(get().flowDefinition!.steps.a.position).toEqual({ x: 99, y: 88 });
    expect(get().isDirty).toBe(true);
  });

  it('treats a selection-only change as non-dirtying visual state', () => {
    const flow = makeFlow({ a: makeStep('a') });
    get().setFlow(flow, [makeNode('a')], []);

    get().onNodesChange([{ type: 'select', id: 'a', selected: true }]);

    expect(get().nodes[0].selected).toBe(true);
    expect(get().isDirty).toBe(false);
  });
});

describe('onEdgesChange', () => {
  it('cleans up the source step when an edge is removed', () => {
    const flow = makeFlow({
      a: makeStep('a', { defaultNextStepInstanceId: 'b' }),
      b: makeStep('b'),
    });
    get().setFlow(flow, [makeNode('a'), makeNode('b')], [makeEdge('e1', 'a', 'b')]);

    get().onEdgesChange([{ type: 'remove', id: 'e1' }]);

    expect(get().edges).toHaveLength(0);
    expect(get().flowDefinition!.steps.a.defaultNextStepInstanceId).toBeUndefined();
    expect(get().isDirty).toBe(true);
  });
});

describe('deselectAll', () => {
  it('deselects any selected nodes and edges', () => {
    const flow = makeFlow({ a: makeStep('a'), b: makeStep('b') });
    const selectedNode = makeNode('a');
    selectedNode.selected = true;
    get().setFlow(flow, [selectedNode, makeNode('b')], [makeEdge('e1', 'a', 'b', { selected: true })]);

    get().deselectAll();

    expect(get().nodes.find((n) => n.id === 'a')!.selected).toBe(false);
    expect(get().edges[0].selected).toBe(false);
  });
});
