import { type FlowDefinition, type StepInstance, StepType, BranchDefinition } from '@allma/core-types';
import { Position, type XYPosition } from 'reactflow';
import Dagre from 'dagre';
import { LARGE_ARROW_MARKER } from './constants.js';
import { AllmaStepNode, AllmaTransitionEdge } from './types';

const dagreGraph = new Dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 115; // Increased height to accommodate more info

/**
 * Traverses the flow definition to identify all steps that are part of a parallel branch.
 * @param steps The complete map of step configurations from the flow definition.
 * @returns A Map where the key is a step's instance ID and the value contains the parent fork and branch IDs.
 */
const findBranchSteps = (steps: Record<string, StepInstance>): Map<string, { forkId: string, branchId: string }> => {
    const branchStepMap = new Map<string, { forkId: string, branchId: string }>();
    const allStepIds = new Set(Object.keys(steps));

    const forkManagers = Object.values(steps).filter(step => step.stepType === StepType.PARALLEL_FORK_MANAGER);

    for (const fork of forkManagers) {
        if (fork.parallelBranches) {
            for (const branch of fork.parallelBranches) {
                // FIX: Check if the branch refers to a step instance within this flow.
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
                        branchStepMap.set(currentStepId, { forkId: fork.stepInstanceId, branchId: branch.branchId });

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

    return branchStepMap;
};

// Converts our API's FlowDefinition into nodes and edges for React Flow
export const flowDefinitionToElements = (flow: FlowDefinition): { flow: FlowDefinition, nodes: AllmaStepNode[], edges: AllmaTransitionEdge[] } => {
  const nodes: AllmaStepNode[] = [];
  const edges: AllmaTransitionEdge[] = [];
  
  const allSteps = Object.values(flow.steps);
  const allNodesHavePosition = allSteps.length > 0 && allSteps.every(step => !!step.position);

  const branchStepsMap = findBranchSteps(flow.steps);

  // Create nodes
  allSteps.forEach((step: StepInstance) => {
    let position: XYPosition = { x: 0, y: 0 };
    if (step.position && typeof step.position.x === 'number' && typeof step.position.y === 'number') {
        position = step.position;
    }

    // NEW: Logic to determine if a step is the end of a branch path
    const isBranchStep = branchStepsMap.has(step.stepInstanceId);
    const hasNoOutgoingFlow = !step.defaultNextStepInstanceId;
    const isNotGlobalEnd = step.stepType !== StepType.END_FLOW;
    const isBranchEnd = isBranchStep && hasNoOutgoingFlow && isNotGlobalEnd;

    nodes.push({
      id: step.stepInstanceId,
      type: 'stepNode',
      position: position,
      data: {
        label: step.displayName || step.stepInstanceId,
        stepType: step.stepType,
        config: step,
        isStartNode: step.stepInstanceId === flow.startStepInstanceId,
        branchInfo: branchStepsMap.get(step.stepInstanceId),
        isBranchEnd: isBranchEnd, // Add the calculated property
      },
    });
  });

  // Create edges
  allSteps.forEach((step: StepInstance) => {
    // Default transition
    if (step.defaultNextStepInstanceId) {
      edges.push({
        id: `e-${step.stepInstanceId}-default-${step.defaultNextStepInstanceId}`,
        source: step.stepInstanceId,
        target: step.defaultNextStepInstanceId,
        type: 'conditionalEdge',
        markerEnd: LARGE_ARROW_MARKER,
        data: { edgeType: 'default' }
      });
    }

    // Conditional transitions
    step.transitions?.forEach((transition: { condition: string; nextStepInstanceId: string }, index: number) => {
      edges.push({
        id: `e-${step.stepInstanceId}-cond-${index}-${transition.nextStepInstanceId}`,
        source: step.stepInstanceId,
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
            id: `e-${step.stepInstanceId}-error-${step.onError.fallbackStepInstanceId}`,
            source: step.stepInstanceId,
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
                    id: `e-${step.stepInstanceId}-branch-${branch.stepInstanceId}`,
                    source: step.stepInstanceId,
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

  // If all nodes already have a position, we're done. Return the original flow.
  if (allNodesHavePosition) {
    return { flow, nodes, edges };
  }
  
  // If positions are missing, calculate them and update the flow definition.
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
