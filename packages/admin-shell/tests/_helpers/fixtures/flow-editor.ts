import { StepType, type StepInstance } from '@allma/core-types';
import type { AllmaStepNode, AllmaTransitionEdge } from '../../../src/features/flows/editor/types.js';

/**
 * Fixture builders for the flow-editor Zustand store tests. They produce loosely-typed
 * objects shaped like the real entities — the store performs no Zod validation, so minimal
 * fixtures are sufficient and keep each test readable.
 */

type FlowEditorDefinition = Parameters<
  import('../../../src/features/flows/editor/hooks/useFlowEditorStore.js').RFState['setFlow']
>[0];

export const makeStep = (id: string, over: Partial<StepInstance> = {}): StepInstance =>
  ({
    stepInstanceId: id,
    stepType: StepType.NO_OP,
    displayName: id,
    position: { x: 0, y: 0 },
    ...over,
  }) as StepInstance;

export const makeNode = (
  id: string,
  config: StepInstance = makeStep(id),
  over: Partial<AllmaStepNode> = {},
): AllmaStepNode =>
  ({
    id,
    position: { x: 0, y: 0 },
    type: 'stepNode',
    data: {
      label: id,
      stepType: config.stepType,
      config,
      isStartNode: false,
    },
    ...over,
  }) as AllmaStepNode;

export const makeEdge = (
  id: string,
  source: string,
  target: string,
  over: Partial<AllmaTransitionEdge> = {},
): AllmaTransitionEdge => ({
  id,
  source,
  target,
  type: 'conditionalEdge',
  data: { edgeType: 'default' },
  ...over,
});

export const makeFlow = (
  steps: Record<string, StepInstance>,
  over: Partial<FlowEditorDefinition> = {},
): FlowEditorDefinition =>
  ({
    id: 'flow-1',
    version: 1,
    name: 'Test Flow',
    startStepInstanceId: Object.keys(steps)[0] ?? '',
    steps,
    ...over,
  }) as FlowEditorDefinition;
