import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  Node,
  useNodes,
} from 'reactflow';
import { Badge, useMantineTheme } from '@mantine/core';
import { StepNodeData, TransitionEdgeData } from '../../types';
import useFlowEditorStore from '../../hooks/useFlowEditorStore';
import { useEffect } from 'react';
import { useSmartEdge } from './hooks/useSmartEdge';


export default function ConditionalEdge({
  id,
  source,
  target,
  sourceX: initialSourceX,
  sourceY: initialSourceY,
  targetX: initialTargetX,
  targetY: initialTargetY,
  sourcePosition: initialSourcePosition,
  targetPosition: initialTargetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps<TransitionEdgeData>) {
  const theme = useMantineTheme();
  const nodes = useNodes();
  const updateEdgeHandles = useFlowEditorStore((state) => state.updateEdgeHandles);

  const sourceNode = nodes.find((n) => n.id === source) as Node<StepNodeData> | undefined;
  const targetNode = nodes.find((n) => n.id === target) as Node<StepNodeData> | undefined;

  const smartEdge = useSmartEdge(sourceNode, targetNode);

  useEffect(() => {
    if (smartEdge?.sourceHandleId && smartEdge?.targetHandleId) {
      updateEdgeHandles(id, { sourceHandle: smartEdge.sourceHandleId, targetHandle: smartEdge.targetHandleId });
    }
  }, [id, smartEdge?.sourceHandleId, smartEdge?.targetHandleId, updateEdgeHandles]);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: smartEdge?.sourceX ?? initialSourceX,
    sourceY: smartEdge?.sourceY ?? initialSourceY,
    sourcePosition: smartEdge?.sourcePosition ?? initialSourcePosition,
    targetX: smartEdge?.targetX ?? initialTargetX,
    targetY: smartEdge?.targetY ?? initialTargetY,
    targetPosition: smartEdge?.targetPosition ?? initialTargetPosition,
  });

  const edgeType = data?.edgeType || 'default';

  // Start with base style and add selection style
  const edgeStyle = { ...style, strokeWidth: selected ? 3 : 1.5, zIndex: 20 };
  let label = null;
  
  switch (edgeType) {
    case 'branch':
      edgeStyle.stroke = theme.colors.grape[6];
      label = (
        <Badge
          variant="filled"
          color="grape"
          size="sm"
          title={`Branch: ${data?.branchId}`}
        >
          {data?.branchId}
        </Badge>
      );
      break;

    case 'conditional':
      edgeStyle.strokeDasharray = '5 5';
      label = (
        <Badge
          variant="light"
          color="blue"
          size="sm"
          style={{ cursor: 'pointer' }}
          title={data?.condition}
        >
          Condition
        </Badge>
      );
      break;

    case 'fallback':
      edgeStyle.stroke = theme.colors.red[7];
      edgeStyle.strokeDasharray = '4 4';
      label = (
        <Badge
          variant="light"
          color="red"
          size="sm"
        >
          On Error
        </Badge>
      );
      break;

    case 'default':
    default:
      // default solid line, no label
      break;
  }
  
  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      {label && (
         <EdgeLabelRenderer>
         <div
           style={{
             position: 'absolute',
             transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
             pointerEvents: 'all',
           }}
           className="nodrag nopan"
         >
           {label}
         </div>
       </EdgeLabelRenderer>
      )}
    </>
  );
}
