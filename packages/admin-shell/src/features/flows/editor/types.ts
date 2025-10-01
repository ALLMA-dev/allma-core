import { StepInstance, StepType } from '@allma/core-types';
import { Edge, Node } from 'reactflow';

export { StepType };

// Extend React Flow's Node data to include our specific step config
export interface StepNodeData {
  label: string;
  stepType: StepType;
  config: StepInstance;
  isStartNode: boolean;
  isDirty?: boolean;
  branchInfo?: { forkId: string, branchId: string, icon?: string };
  isBranchEnd?: boolean;
}

// Extend React Flow's Edge data to include our transition condition and type
export interface TransitionEdgeData {
  condition?: string; // This should be a JsonPathString
  branchId?: string; 
  edgeType?: 'default' | 'conditional' | 'fallback' | 'branch'; 
}

export type AllmaStepNode = Node<StepNodeData>;
export type AllmaTransitionEdge = Edge<TransitionEdgeData>;
