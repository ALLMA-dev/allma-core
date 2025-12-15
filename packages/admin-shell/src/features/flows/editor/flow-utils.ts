import { type FlowDefinition, type StepInstance, StepType, BranchDefinition } from '@allma/core-types';
import { Position, type XYPosition } from 'reactflow';
import Dagre from 'dagre';
import { LARGE_ARROW_MARKER } from './constants.js';
import { AllmaStepNode, AllmaTransitionEdge } from './types.js';

const dagreGraph = new Dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 115; // Increased height to accommodate more info

/**
 * Traverses the flow definition to identify all steps that are part of a parallel branch.
 * @param steps The complete map of step configurations from the flow definition.
 * @returns A Map where the key is a step's unique key (from the steps object) and the value contains the parent fork and branch IDs.
 */
const findBranchSteps = (steps: Record<string, StepInstance>): Map<string, { forkId: string, branchId: string }> => {
    const branchStepMap = new Map<string, { forkId: string, branchId: string }>();
    const allStepIds = new Set(Object.keys(steps));

    for (const [stepKey, step] of Object.entries(steps)) {
        if (step.stepType === StepType.PARALLEL_FORK_MANAGER) {
            // TypeScript now correctly infers `step` has `parallelBranches`
            if (step.parallelBranches) {
                for (const branch of step.parallelBranches) {
                    // Check if the branch refers to a step instance within this flow.
                    // The branch could be an inline sub-flow, which does not have a 'stepInstanceId'.
                    if ('stepInstanceId' in branch && branch.stepInstanceId) {
                        const startStepId = branch.stepInstanceId;
                        const queue: string[] = [startStepId];
                        const visited = new Set<string>();

                        while (queue.length > 0) {
                            const currentStepId = queue.shift()!;
                            if (!currentStepId || visited.has(currentStepId) || !allStepIds.has(currentStepId)) {
                                continue;
                            }

                            visited.add(currentStepId);
                            branchStepMap.set(currentStepId, { forkId: stepKey, branchId: branch.branchId });

                            const currentStepConfig = steps[currentStepId];
                            if (currentStepConfig) {
                                if (currentStepConfig.defaultNextStepInstanceId) {
                                    queue.push(currentStepConfig.defaultNextStepInstanceId);
                                }
                                currentStepConfig.transitions?.forEach((t: { nextStepInstanceId: string }) => queue.push(t.nextStepInstanceId));
                            }
                        }
                    }
                }
            }
        }
    }

    return branchStepMap;
};

// Converts our API's FlowDefinition into nodes and edges for React Flow
export const flowDefinitionToElements = (flow: FlowDefinition): { flow: FlowDefinition, nodes: AllmaStepNode[], edges: AllmaTransitionEdge[] } => {
  const nodes: AllmaStepNode[] = [];
  const edges: AllmaTransitionEdge[] = [];
  
  const allStepEntries = Object.entries(flow.steps);
  
  // Determine if we should run auto-layout. We only do this if NO nodes have valid position data.
  // This preserves user-arranged layouts if they exist, treating auto-layout as a one-time setup.
  const hasAnyPositionData = allStepEntries.some(
    ([, step]) => step.position && typeof step.position.x === 'number' && typeof step.position.y === 'number'
  );
  const shouldAutoLayout = !hasAnyPositionData && allStepEntries.length > 0;

  const branchStepsMap = findBranchSteps(flow.steps);

  // Create nodes, respecting saved positions if they exist.
  allStepEntries.forEach(([stepKey, step]) => {
    let position: XYPosition = { x: 0, y: 0 };
    if (step.position && typeof step.position.x === 'number' && typeof step.position.y === 'number') {
        position = step.position;
    }

    // Logic to determine if a step is the end of a branch path
    const isBranchStep = branchStepsMap.has(stepKey);
    const hasNoOutgoingFlow = !step.defaultNextStepInstanceId;
    const isNotGlobalEnd = step.stepType !== StepType.END_FLOW;
    const isBranchEnd = isBranchStep && hasNoOutgoingFlow && isNotGlobalEnd;

    nodes.push({
      id: stepKey,
      type: 'stepNode',
      position: position,
      data: {
        label: step.displayName || stepKey,
        stepType: step.stepType,
        config: step,
        isStartNode: stepKey === flow.startStepInstanceId,
        branchInfo: branchStepsMap.get(stepKey),
        isBranchEnd: isBranchEnd,
      },
    });
  });

  // Create edges
  allStepEntries.forEach(([stepKey, step]) => {
    // Default transition
    if (step.defaultNextStepInstanceId) {
      edges.push({
        id: `e-${stepKey}-default-${step.defaultNextStepInstanceId}`,
        source: stepKey,
        target: step.defaultNextStepInstanceId,
        type: 'conditionalEdge',
        markerEnd: LARGE_ARROW_MARKER,
        data: { edgeType: 'default' }
      });
    }

    // Conditional transitions
    step.transitions?.forEach((transition: { condition: string; nextStepInstanceId: string }, index: number) => {
      edges.push({
        id: `e-${stepKey}-cond-${index}-${transition.nextStepInstanceId}`,
        source: stepKey,
        target: transition.nextStepInstanceId,
        type: 'conditionalEdge',
        markerEnd: LARGE_ARROW_MARKER,
        data: {
          edgeType: 'conditional',
          condition: transition.condition,
        },
      });
    });
    
    // Error handling transition
    if (step.onError?.fallbackStepInstanceId) {
        edges.push({
            id: `e-${stepKey}-error-${step.onError.fallbackStepInstanceId}`,
            source: stepKey,
            target: step.onError.fallbackStepInstanceId,
            type: 'conditionalEdge',
            markerEnd: LARGE_ARROW_MARKER,
            data: { edgeType: 'fallback' }
        });
    }

    // Edges for Parallel Forks to start their branches
    if (step.stepType === StepType.PARALLEL_FORK_MANAGER && step.parallelBranches) {
        step.parallelBranches.forEach((branch: BranchDefinition) => {
            if ('stepInstanceId' in branch && branch.stepInstanceId) {
                edges.push({
                    id: `e-${stepKey}-branch-${branch.stepInstanceId}`,
                    source: stepKey,
                    target: branch.stepInstanceId,
                    type: 'conditionalEdge',
                    markerEnd: LARGE_ARROW_MARKER,
                    data: {
                        edgeType: 'branch',
                        branchId: branch.branchId
                    }
                });
            }
        });
    }
  });

  // If we don't need to auto-layout, return the elements with their saved positions.
  if (!shouldAutoLayout) {
    return { flow, nodes, edges };
  }
  
  // If no positions exist, calculate them once and update the flow definition.
  const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges);
  
  // Create a new flow definition object to avoid mutation
  const updatedFlow = { 
      ...flow, 
      steps: { ...flow.steps } 
  };
  
  layoutedNodes.forEach(node => {
    if (updatedFlow.steps[node.id]) {
      // Create a new step object to avoid nested mutation
      updatedFlow.steps[node.id] = {
        ...updatedFlow.steps[node.id],
        position: node.position
      };
    }
  });

  return { flow: updatedFlow, nodes: layoutedNodes, edges };
};

// Calculates the layout of nodes and edges using Dagre
const getLayoutedElements = (nodes: AllmaStepNode[], edges: AllmaTransitionEdge[]): { nodes: AllmaStepNode[], edges: AllmaTransitionEdge[] } => {
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 60 }); // Top-to-Bottom layout

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  Dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Top;
    node.sourcePosition = Position.Bottom;

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes: layoutedNodes, edges };
};