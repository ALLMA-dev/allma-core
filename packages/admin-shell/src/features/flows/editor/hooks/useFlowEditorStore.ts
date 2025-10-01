import { create } from 'zustand';
import {
    Connection,
    EdgeChange,
    Node,
    NodeChange,
    addEdge,
    OnNodesChange,
    OnEdgesChange,
    applyNodeChanges,
    applyEdgeChanges,
    EdgeRemoveChange,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { LARGE_ARROW_MARKER } from '../constants';
import { type FlowDefinition, StepInstance } from '@allma/core-types';
import { AllmaStepNode, AllmaTransitionEdge, StepNodeData } from '../types';

// The type for the flow definition stored in the editor state.
// It includes the `name` and `description` from the metadata record for UI purposes.
type FlowEditorDefinition = FlowDefinition & { name: string; description?: string };

export type RFState = {
    flowDefinition: FlowEditorDefinition | null;
    nodes: AllmaStepNode[];
    edges: AllmaTransitionEdge[];
    isDirty: boolean; // Global dirty flag for the entire flow
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: (connection: Connection) => void;
    setFlow: (flow: FlowEditorDefinition, nodes: AllmaStepNode[], edges: AllmaTransitionEdge[]) => void;
    updateNodeConfig: (nodeId: string, updatedData: Partial<StepNodeData>) => void;
    addNode: (node: Omit<AllmaStepNode, 'id' | 'position'>, position: { x: number, y: number }) => void;
    onNodesDelete: (deletedNodes: Node[]) => void;
    deleteNodes: (nodeIds: string[]) => void;
    updateEdgeCondition: (edgeId: string, newCondition: string) => void;
    updateEdgeHandles: (edgeId: string, handles: { sourceHandle: string | null; targetHandle: string | null }) => void;
    deleteEdgeById: (edgeId: string) => void; 
    clearDirtyState: () => void;
    updateFlowProperties: (properties: Partial<Record<string, any>>) => void;
    setStartNode: (nodeId: string) => void;
    deselectAll: () => void;
};
const useFlowEditorStore = create<RFState>((set, get) => ({
    flowDefinition: null,
    nodes: [],
    edges: [],
    isDirty: false,
    onNodesChange: (changes: NodeChange[]) => {
        set(state => {
            const { flowDefinition, nodes } = state;
            if (!flowDefinition) {
                // Should not happen if a flow is loaded, but a good guard.
                return { ...state, nodes: applyNodeChanges(changes, nodes) };
            }
    
            // First, apply the changes to the nodes array for React Flow's internal state
            const updatedNodes = applyNodeChanges(changes, nodes);
    
            const updatedSteps = { ...flowDefinition.steps };
            let wasPositionUpdated = false;
    
            // Now, iterate through the changes to update our canonical flowDefinition state
            changes.forEach(change => {
                // We are interested in any position change, not just at the end of a drag.
                // This makes the logic simpler and more robust, at a slight performance cost during drag.
                // This is the key fix to ensure all position changes are captured.
                if (change.type === 'position' && change.position) {
                    const stepToUpdate = updatedSteps[change.id];
                    if (stepToUpdate) {
                        // Create a new step object with the updated position.
                        updatedSteps[change.id] = {
                            ...stepToUpdate,
                            position: change.position,
                        };
                        wasPositionUpdated = true;
                    }
                }
            });
    
            // If any position was updated, create a new flow definition object and mark as dirty.
            if (wasPositionUpdated) {
                const newFlowDef = { ...flowDefinition, steps: updatedSteps };
                return {
                    nodes: updatedNodes,
                    flowDefinition: newFlowDef,
                    isDirty: true,
                };
            }
    
            // If no positions were updated (e.g., selection change), just return the updated nodes array.
            return { ...state, nodes: updatedNodes };
        });
    },
    onEdgesChange: (changes: EdgeChange[]) => {
        set(state => {
            const { flowDefinition, nodes, edges } = state;
            const removedEdgeChanges = changes.filter((change): change is EdgeRemoveChange => change.type === 'remove');
    
            if (removedEdgeChanges.length === 0 || !flowDefinition) {
                return { ...state, edges: applyEdgeChanges(changes, edges) };
            }
    
            const newSteps = { ...flowDefinition.steps };
            const modifiedSourceNodeIds = new Set<string>();
    
            for (const change of removedEdgeChanges) {
                const edgeToRemove = edges.find(e => e.id === change.id);
                if (!edgeToRemove) continue;
    
                const sourceNodeId = edgeToRemove.source;
                const targetNodeId = edgeToRemove.target;
                const originalSourceConfig = newSteps[sourceNodeId];
    
                if (originalSourceConfig) {
                    let isModified = false;
                    const newSourceConfig = { ...originalSourceConfig };
    
                    if (newSourceConfig.defaultNextStepInstanceId === targetNodeId) {
                        newSourceConfig.defaultNextStepInstanceId = undefined;
                        isModified = true;
                    }
    
                    if (newSourceConfig.transitions) {
                        const initialLength = newSourceConfig.transitions.length;
                        newSourceConfig.transitions = newSourceConfig.transitions.filter(
                            t => t.nextStepInstanceId !== targetNodeId
                        );
                        if (newSourceConfig.transitions.length < initialLength) {
                            isModified = true;
                        }
                    }
    
                    if (isModified) {
                        newSteps[sourceNodeId] = newSourceConfig;
                        modifiedSourceNodeIds.add(sourceNodeId);
                    }
                }
            }
    
            if (modifiedSourceNodeIds.size > 0) {
                const newFlowDef = { ...flowDefinition, steps: newSteps };
                
                const newNodes = nodes.map(node => {
                    if (modifiedSourceNodeIds.has(node.id)) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                config: newSteps[node.id],
                                isDirty: true,
                            }
                        };
                    }
                    return node;
                });
    
                return {
                    ...state,
                    flowDefinition: newFlowDef,
                    edges: applyEdgeChanges(changes, edges),
                    nodes: newNodes,
                    isDirty: true,
                };
            }
    
            return { ...state, edges: applyEdgeChanges(changes, edges) };
        });
    },
    onConnect: (connection: Connection) => {
        set(state => {
            const { flowDefinition, nodes, edges } = state;
            if (!flowDefinition || !connection.source || !connection.target) {
                return state;
            }
    
            const sourceNodeId = connection.source;
            const targetNodeId = connection.target;
    
            // Get the original config for immutable updates
            const originalSourceConfig = flowDefinition.steps[sourceNodeId];
            if (!originalSourceConfig) return state;
    
            // Create a mutable copy of the source step's configuration
            const updatedSourceConfig = { ...originalSourceConfig };
    
            let newEdge: AllmaTransitionEdge;
            const newEdgeBase = {
                id: uuidv4(),
                type: 'conditionalEdge',
                source: connection.source,
                target: connection.target,
                sourceHandle: connection.sourceHandle,
                targetHandle: connection.targetHandle,
                markerEnd: LARGE_ARROW_MARKER,
            };
    
            // Logic: If there's no default next step, this new connection becomes the default.
            // Otherwise, it becomes a new conditional transition.
            if (!updatedSourceConfig.defaultNextStepInstanceId) {
                updatedSourceConfig.defaultNextStepInstanceId = targetNodeId;
                newEdge = { ...newEdgeBase, data: { edgeType: 'default' } };
            } else {
                const transitions = updatedSourceConfig.transitions ? [...updatedSourceConfig.transitions] : [];
                const newTransition = {
                    condition: '$.placeholder.condition' as const,
                    nextStepInstanceId: targetNodeId,
                };
                transitions.push(newTransition);
                updatedSourceConfig.transitions = transitions;
                newEdge = { 
                    ...newEdgeBase, 
                    data: { edgeType: 'conditional', condition: newTransition.condition } 
                };
            }
    
            // Create the new state immutably
            const newFlowDef = {
                ...flowDefinition,
                steps: {
                    ...flowDefinition.steps,
                    [sourceNodeId]: updatedSourceConfig, // Overwrite the step config with the updated version
                }
            };
    
            const newNodes = nodes.map(node => {
                if (node.id === sourceNodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            config: updatedSourceConfig, // Ensure the node's internal config is updated
                            isDirty: true,
                        }
                    };
                }
                return node;
            });
    
            return {
                ...state,
                flowDefinition: newFlowDef,
                edges: addEdge(newEdge, edges),
                nodes: newNodes,
                isDirty: true,
            };
        });
    },
    setFlow: (flowDefinition: FlowEditorDefinition, nodes: AllmaStepNode[], edges: AllmaTransitionEdge[]) => {
        const cleanNodes = nodes.map(n => ({ ...n, data: { ...n.data, isDirty: false } }));
        set({ flowDefinition, nodes: cleanNodes, edges, isDirty: false });
    },
    updateNodeConfig: (nodeId: string, updatedData: Partial<StepNodeData>) => {
        set(state => {
            const { flowDefinition, nodes, edges } = state;
            if (!flowDefinition) return state;

            const nodeToUpdate = nodes.find(n => n.id === nodeId);
            if (!nodeToUpdate) return state;

            const newConfig = { ...nodeToUpdate.data.config, ...updatedData.config };
            const oldId = nodeId;
            const newId = newConfig.stepInstanceId;

            if (newId && newId !== oldId) {
                const newSteps = { ...flowDefinition.steps };
                delete newSteps[oldId];
                newSteps[newId] = newConfig;

                for (const stepId in newSteps) {
                    const step = newSteps[stepId];
                    if (step.defaultNextStepInstanceId === oldId) {
                        step.defaultNextStepInstanceId = newId;
                    }
                    if (step.transitions) {
                        step.transitions.forEach(t => {
                            if (t.nextStepInstanceId === oldId) t.nextStepInstanceId = newId;
                        });
                    }
                }
                
                const newFlowDef = { ...flowDefinition, steps: newSteps };
                if (newFlowDef.startStepInstanceId === oldId) {
                    newFlowDef.startStepInstanceId = newId;
                }

                const newNodes = nodes.map(n => n.id === oldId ? { ...n, id: newId, data: { ...n.data, ...updatedData, config: newConfig, isDirty: true } } : n);
                const newEdges = edges.map(e => {
                    const newEdge = { ...e };
                    if (newEdge.source === oldId) newEdge.source = newId;
                    if (newEdge.target === oldId) newEdge.target = newId;
                    return newEdge;
                });

                return { ...state, flowDefinition: newFlowDef, nodes: newNodes, edges: newEdges, isDirty: true };

            } else {
                const oldDefaultNextStepId = nodeToUpdate.data.config.defaultNextStepInstanceId;
                const newDefaultNextStepId = newConfig.defaultNextStepInstanceId;
                
                let newEdges = [...edges];

                if (oldDefaultNextStepId !== newDefaultNextStepId) {
                    newEdges = newEdges.filter(edge => 
                        !(edge.source === nodeId && edge.data?.edgeType === 'default')
                    );

                    if (newDefaultNextStepId) {
                        const newDefaultEdge: AllmaTransitionEdge = {
                            id: uuidv4(),
                            source: nodeId,
                            target: newDefaultNextStepId,
                            type: 'conditionalEdge',
                            data: { edgeType: 'default' },
                            markerEnd: LARGE_ARROW_MARKER,
                        };
                        newEdges.push(newDefaultEdge);
                    }
                }

                const newFlowDef = {
                    ...flowDefinition,
                    steps: {
                        ...flowDefinition.steps,
                        [nodeId]: newConfig
                    }
                };
                const newNodes = nodes.map((node) => {
                    if (node.id === nodeId) {
                        return { ...node, data: { ...node.data, ...updatedData, config: newConfig, isDirty: true } };
                    }
                    return node;
                });

                return { ...state, flowDefinition: newFlowDef, nodes: newNodes, edges: newEdges, isDirty: true };
            }
        });
    },
    addNode: (node: Omit<AllmaStepNode, 'id' | 'position'>, position: { x: number, y: number }) => {
        const { flowDefinition, nodes } = get();
        if (!flowDefinition) return;

        const newId = `${node.data.stepType.toLowerCase()}_${uuidv4().substring(0, 8)}`;

        const newStepConfig: any = {
            ...node.data.config,
            stepInstanceId: newId,
            stepType: node.data.stepType,
            displayName: node.data.label,
            position: position,
        };

        const newNode: AllmaStepNode = {
            id: newId,
            position: position,
            type: 'stepNode',
            data: {
                ...node.data,
                config: newStepConfig,
                isDirty: true,
            },
        };
        
        const newFlowDef = {
            ...flowDefinition,
            steps: {
                ...flowDefinition.steps,
                [newId]: newStepConfig
            }
        };
        set({ nodes: [...nodes, newNode], flowDefinition: newFlowDef, isDirty: true });
    },
    deleteNodes: (nodeIds: string[]) => {
        set(state => {
            const { flowDefinition, nodes, edges } = state;
            if (!flowDefinition) return state;

            const deletedIdsSet = new Set(nodeIds);
            const newNodes = nodes.filter((node) => !deletedIdsSet.has(node.id));
            const newEdges = edges.filter((edge) => !deletedIdsSet.has(edge.source) && !deletedIdsSet.has(edge.target));
            
            const newSteps = { ...flowDefinition.steps };
            deletedIdsSet.forEach(id => delete newSteps[id]);

            const stepsAfterCleanup = Object.keys(newSteps).reduce((acc, stepId) => {
                const step = newSteps[stepId];
                let isModified = false;
                const newStep = { ...step };

                if (newStep.defaultNextStepInstanceId && deletedIdsSet.has(newStep.defaultNextStepInstanceId)) {
                    newStep.defaultNextStepInstanceId = undefined;
                    isModified = true;
                }

                if (newStep.transitions) {
                    const originalTransitionsLength = newStep.transitions.length;
                    newStep.transitions = newStep.transitions.filter(t => !deletedIdsSet.has(t.nextStepInstanceId));
                    if (newStep.transitions.length < originalTransitionsLength) {
                        isModified = true;
                    }
                }
                acc[stepId] = isModified ? newStep : step;
                return acc;
            }, {} as Record<string, StepInstance>);

            let newFlowDef: FlowEditorDefinition = {
                ...flowDefinition,
                steps: stepsAfterCleanup,
            };

            if (newFlowDef.startStepInstanceId && deletedIdsSet.has(newFlowDef.startStepInstanceId)) {
                newFlowDef = { ...newFlowDef, startStepInstanceId: '' };
            }

            return {
                ...state,
                nodes: newNodes,
                edges: newEdges,
                flowDefinition: newFlowDef,
                isDirty: true,
            };
        });
    },
    onNodesDelete: (deletedNodes: Node[]) => {
        get().deleteNodes(deletedNodes.map(n => n.id));
    },
    updateEdgeCondition: (edgeId: string, newCondition: string) => {
        set(state => {
            const { flowDefinition, edges, nodes } = state;
            if (!flowDefinition) return state;

            const edgeToUpdate = edges.find(e => e.id === edgeId);
            if (!edgeToUpdate || !edgeToUpdate.source || !edgeToUpdate.target) return state;

            const sourceNodeId = edgeToUpdate.source;
            const targetNodeId = edgeToUpdate.target;

            const sourceNodeConfig = flowDefinition.steps[sourceNodeId];
            if (!sourceNodeConfig?.transitions) return state;

            // Find and update the specific transition
            let transitionUpdated = false;
            const updatedTransitions = sourceNodeConfig.transitions.map(t => {
                if (t.nextStepInstanceId === targetNodeId && t.condition !== newCondition) {
                    transitionUpdated = true;
                    return { ...t, condition: newCondition };
                }
                return t;
            });

            if (!transitionUpdated) return state;

            // Create new state immutably
            const newFlowDef = {
                ...flowDefinition,
                steps: {
                    ...flowDefinition.steps,
                    [sourceNodeId]: {
                        ...sourceNodeConfig,
                        transitions: updatedTransitions,
                    },
                },
            };

            const newEdges = edges.map(e => 
                e.id === edgeId 
                    ? { ...e, data: { ...e.data, condition: newCondition } } 
                    : e
            );
            
            const newNodes = nodes.map(n =>
                n.id === sourceNodeId
                ? { ...n, data: { ...n.data, isDirty: true } }
                : n
            );
    
            return { 
                ...state, 
                flowDefinition: newFlowDef, 
                edges: newEdges,
                nodes: newNodes,
                isDirty: true 
            };
        });
    },
    updateEdgeHandles: (edgeId, { sourceHandle, targetHandle }) => {
        set(state => ({
            edges: state.edges.map(edge =>
                edge.id === edgeId
                    ? { ...edge, sourceHandle, targetHandle }
                    : edge
            ),
        }));
    },
    deleteEdgeById: (edgeId: string) => {
        const { onEdgesChange } = get();
        onEdgesChange([{ type: 'remove', id: edgeId }]);
    },
    clearDirtyState: () => {
        set({
            isDirty: false,
            nodes: get().nodes.map(n => ({ ...n, data: { ...n.data, isDirty: false } }))
        });
    },
    updateFlowProperties: (properties: Partial<Record<string, any>>) => {
        set((state) => {
            if (!state.flowDefinition) return state;
    
            const newFlowDef = { ...state.flowDefinition, ...properties };
            
            const newNodes = state.nodes.map(n => ({
                ...n,
                data: {
                    ...n.data,
                    isStartNode: n.id === newFlowDef.startStepInstanceId,
                }
            }));
    
            return {
                flowDefinition: newFlowDef,
                nodes: newNodes,
                isDirty: true,
            };
        });
    },
    // NEW: Action to set the start node
    setStartNode: (nodeId: string) => {
        set(state => {
            const { flowDefinition, nodes } = state;
            if (!flowDefinition || flowDefinition.startStepInstanceId === nodeId) {
                return state; // No change needed
            }

            // Update the canonical source of truth
            const newFlowDef = { ...flowDefinition, startStepInstanceId: nodeId };

            // Update the nodes array for immediate visual feedback
            const newNodes = nodes.map(node => ({
                ...node,
                data: {
                    ...node.data,
                    isStartNode: node.id === nodeId,
                }
            }));

            return {
                ...state,
                flowDefinition: newFlowDef,
                nodes: newNodes,
                isDirty: true,
            };
        });
    },
    deselectAll: () => {
        const { nodes, edges, onNodesChange, onEdgesChange } = get();
        
        const nodeChanges: NodeChange[] = nodes
            .filter(node => node.selected)
            .map(node => ({
                type: 'select',
                id: node.id,
                selected: false,
            }));
    
        const edgeChanges: EdgeChange[] = edges
            .filter(edge => edge.selected)
            .map(edge => ({
                type: 'select',
                id: edge.id,
                selected: false,
            }));
            
        if (nodeChanges.length > 0) {
            onNodesChange(nodeChanges);
        }
        if (edgeChanges.length > 0) {
            onEdgesChange(edgeChanges);
        }
    },
}));
export default useFlowEditorStore;
