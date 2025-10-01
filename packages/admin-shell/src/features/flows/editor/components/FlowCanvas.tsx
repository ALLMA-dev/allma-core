import React, { useCallback, useRef, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  Node,
  Edge,
  useOnSelectionChange,
  OnConnectStartParams,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';

import useFlowEditorStore from '../hooks/useFlowEditorStore';
import BaseStepNode from './custom-nodes/BaseStepNode';
import ConditionalEdge from './custom-nodes/ConditionalEdge';
import { Box, Menu } from '@mantine/core';
import { AllmaStepNode } from '../types';
import { UnifiedStepDefinition } from '../../../../api/stepDefinitionService';
import { IconPlayerPlay, IconTrash } from '@tabler/icons-react';
import { calculateSmartEdgeConnection } from './custom-nodes/hooks/useSmartEdge';

const nodeTypes = { stepNode: BaseStepNode };
const edgeTypes = { conditionalEdge: ConditionalEdge };

interface FlowCanvasProps {
    onNodeClick: (nodeId: string | null) => void;
    onEdgeClick: (edgeId: string | null) => void;
    onPaneClick: () => void;
    onNodeDoubleClick: (nodeId: string) => void;
    onDropOnCanvas: () => void;
}

export function FlowCanvas({ onNodeClick, onEdgeClick, onPaneClick, onNodeDoubleClick, onDropOnCanvas }: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const connectionStartParams = useRef<OnConnectStartParams | null>(null);
  
  const nodes = useFlowEditorStore((state) => state.nodes);
  const edges = useFlowEditorStore((state) => state.edges);
  const flowDefinition = useFlowEditorStore((state) => state.flowDefinition);
  const onNodesChange = useFlowEditorStore((state) => state.onNodesChange);
  const onEdgesChange = useFlowEditorStore((state) => state.onEdgesChange);
  const onConnect = useFlowEditorStore((state) => state.onConnect);
  const onNodesDelete = useFlowEditorStore((state) => state.onNodesDelete);
  const addNode = useFlowEditorStore((state) => state.addNode);
  const setStartNode = useFlowEditorStore((state) => state.setStartNode);
  
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const isReadOnly = flowDefinition?.isPublished ?? false;

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);
  const memoizedEdgeTypes = useMemo(() => edgeTypes, []);

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
        if (nodes.length === 1 && edges.length === 0) onNodeClick(nodes[0].id);
        else if (edges.length === 1 && nodes.length === 0) onEdgeClick(edges[0].id);
        else onPaneClick();
    }
  });

  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (!isReadOnly) onNodeDoubleClick(node.id);
  }, [isReadOnly, onNodeDoubleClick]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowWrapper.current) return;

      const dataString = event.dataTransfer.getData('application/reactflow');
      if (!dataString) return;

      const stepDefinition = JSON.parse(dataString) as UnifiedStepDefinition;
      const { stepType, name: label } = stepDefinition;
      
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const newNode: Omit<AllmaStepNode, 'id' | 'position'> = {
        type: 'stepNode',
        data: {
          label: label,
          stepType: stepType,
          config: { stepType: stepType, displayName: label, stepDefinitionId: stepDefinition.id } as any,
          isStartNode: false,
        },
      };

      addNode(newNode, position);
      onDropOnCanvas();
    }, [addNode, reactFlowInstance, onDropOnCanvas]
  );
  
  const onConnectStart = useCallback((_: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => {
    connectionStartParams.current = params;
  }, []);
  
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    const startParams = connectionStartParams.current;
    if (!startParams || !startParams.nodeId) return;
    
    // Reset for next connection attempt
    connectionStartParams.current = null;
    
    // Check if the connection ended on a handle (ReactFlow handles this via onConnect)
    const targetIsPane = (event.target as HTMLElement).classList.contains('react-flow__pane');
    if (targetIsPane) return; // Dropped on pane, do nothing.

    const targetElement = event.target as HTMLElement;
    const targetNodeElement = targetElement.closest('.react-flow__node');

    if (targetNodeElement) {
      const targetNodeId = (targetNodeElement as HTMLElement).dataset.id;
      const sourceNodeId = startParams.nodeId;

      if (targetNodeId && sourceNodeId && targetNodeId !== sourceNodeId) {
        const sourceNode = reactFlowInstance.getNode(sourceNodeId);
        const targetNode = reactFlowInstance.getNode(targetNodeId);

        const allEdges = useFlowEditorStore.getState().edges;
        const getUsedHandles = (nodeId: string): Set<string> => {
            const used = new Set<string>();
            allEdges.forEach(edge => {
                if (edge.source === nodeId && edge.sourceHandle) used.add(edge.sourceHandle);
                if (edge.target === nodeId && edge.targetHandle) used.add(edge.targetHandle);
            });
            return used;
        };

        const usedSourceHandles = getUsedHandles(sourceNodeId);
        const usedTargetHandles = getUsedHandles(targetNodeId);
        
        const smartConnection = calculateSmartEdgeConnection(sourceNode, targetNode, usedSourceHandles, usedTargetHandles);

        if (smartConnection) {
          onConnect({
            source: sourceNodeId,
            target: targetNodeId,
            sourceHandle: smartConnection.sourceHandleId,
            targetHandle: smartConnection.targetHandleId,
          });
        }
      }
    }
  }, [reactFlowInstance, onConnect]);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    onEdgesChange([{ type: 'remove', id: oldEdge.id }]);
    onConnect(newConnection);
  }, [onConnect, onEdgesChange]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    if (isReadOnly) return;
    setMenu({ id: node.id, x: event.clientX, y: event.clientY });
  }, [isReadOnly]);

  const handleSetStartNode = () => {
      if (menu) setStartNode(menu.id);
      setMenu(null);
  };
  
  const handleDeleteNodeFromMenu = () => {
    if (menu) onNodesDelete([{ id: menu.id } as Node]);
    setMenu(null);
  };

  return (
    <Box style={{ width: '100%', height: '100%' }} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onEdgeUpdate={onEdgeUpdate}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodesDelete={onNodesDelete}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeContextMenu={handleNodeContextMenu}
        nodeTypes={memoizedNodeTypes}
        edgeTypes={memoizedEdgeTypes}
        fitView
        nodesDraggable={!isReadOnly}
        nodesConnectable={!isReadOnly}
        elementsSelectable={!isReadOnly}
        deleteKeyCode={isReadOnly ? null : ['Backspace', 'Delete']}
        isValidConnection={() => true}
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
        {menu && (
            <Menu
                opened={!!menu}
                onClose={() => setMenu(null)}
                shadow="md"
                width={200}
                position="right-start"
                offset={0}
                styles={{ dropdown: { position: 'absolute', left: menu.x, top: menu.y } }}
            >
                <Menu.Label>Node Actions</Menu.Label>
                <Menu.Item
                    leftSection={<IconPlayerPlay size={14} />}
                    onClick={handleSetStartNode}
                    disabled={nodes.find(n => n.id === menu.id)?.data.isStartNode}
                >
                    Set as Start Node
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={handleDeleteNodeFromMenu}
                    disabled={nodes.find(n => n.id === menu.id)?.data.isStartNode}
                >
                    Delete Node
                </Menu.Item>
            </Menu>
        )}
      </ReactFlow>
    </Box>
  );
}
