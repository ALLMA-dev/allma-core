import React, { memo, useMemo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, Text, Badge, Group, useMantineTheme, Tooltip, Code, Box, Stack } from '@mantine/core';
import { IconPlayerPlay, IconPencil, IconGitBranch, IconGitFork, IconArrowBackUp } from '@tabler/icons-react';
import { StepNodeData } from '../../types';
import { getStepConfig } from '../../step-configs';
import { StepType } from '@allma/core-types';
import useFlowEditorStore from '../../hooks/useFlowEditorStore';

// Defines all possible handle positions, including correct CSS for centering.
const allHandles: { id: string; position: Position; style: React.CSSProperties }[] = [
    { id: 'top-left', position: Position.Top, style: { top: 0, left: '25%', transform: 'translate(-50%, -50%)' } },
    { id: 'top-center', position: Position.Top, style: { top: 0, left: '50%', transform: 'translate(-50%, -50%)' } },
    { id: 'top-right', position: Position.Top, style: { top: 0, left: '75%', transform: 'translate(-50%, -50%)' } },
    { id: 'bottom-left', position: Position.Bottom, style: { bottom: 0, left: '25%', transform: 'translate(-50%, 50%)' } },
    { id: 'bottom-center', position: Position.Bottom, style: { bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' } },
    { id: 'bottom-right', position: Position.Bottom, style: { bottom: 0, left: '75%', transform: 'translate(-50%, 50%)' } },
    { id: 'left', position: Position.Left, style: { left: 0, top: '50%', transform: 'translate(-50%, -50%)' } },
    { id: 'right', position: Position.Right, style: { right: 0, top: '50%', transform: 'translate(50%, -50%)' } },
];

function BaseStepNode({ data, selected, id: nodeId }: NodeProps<StepNodeData>) {
  const { label, stepType, isStartNode, isDirty, branchInfo, isBranchEnd, config } = data;
  const { itemsPath, parallelBranches } = config;
  const theme = useMantineTheme();
  const edges = useFlowEditorStore((state) => state.edges);
  const [isNodeHovered, setIsNodeHovered] = useState(false);

  const connectedHandles = useMemo(() => {
    const handles = new Set<string>();
    edges.forEach(edge => {
      if (edge.source === nodeId && edge.sourceHandle) handles.add(edge.sourceHandle);
      if (edge.target === nodeId && edge.targetHandle) handles.add(edge.targetHandle);
    });
    return handles;
  }, [edges, nodeId]);

  const stepConfig = getStepConfig(stepType);
  const Icon = stepConfig.icon;
  const isEndNode = stepType === StepType.END_FLOW;
  const isParallelFork = stepType === StepType.PARALLEL_FORK_MANAGER;

  let borderColor = selected ? theme.colors.cyan[5] : theme.colors.dark[4];
  if (isDirty) {
    borderColor = theme.colors.yellow[6];
  }
  const borderWidth = selected ? '3px' : '2px';
  
  const branchColor = theme.colors.grape[6];
  
  return (
    <Box 
      pos="relative" 
      onMouseEnter={() => setIsNodeHovered(true)}
      onMouseLeave={() => setIsNodeHovered(false)}
    >
      {allHandles.map(handle => {
        const isConnected = connectedHandles.has(handle.id);
        const isVisible = isConnected || isNodeHovered;
        // A handle is connectable only if it's not already connected.
        const isConnectable = !isConnected;

        return (
          <div key={handle.id} className={`handle-wrapper ${isVisible ? 'visible' : ''}`} style={handle.style}>
            {/* The styled, visible circle. This is not a ReactFlow handle. */}
            <div className={`handle-circle ${isConnected ? 'connected' : ''}`} />
            
            {/* An invisible target handle overlaying the wrapper. */}
            <Handle 
              type="target" 
              position={handle.position} 
              id={handle.id} 
              isConnectable={isConnectable && !isStartNode}
              style={{ width: '100%', height: '100%', background: 'transparent', border: 'none' }}
            />
            
            {/* An invisible source handle overlaying the wrapper for starting new connections. */}
            {!isEndNode && (
              <Handle
                type="source"
                position={handle.position}
                id={handle.id}
                isConnectable={isConnectable}
                style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', cursor: 'crosshair' }}
              />
            )}
          </div>
        );
      })}
      
      <Card
        shadow="sm"
        padding="sm"
        radius="md"
        withBorder
        style={{
          minWidth: 250,
          maxWidth: 400,
          border: `${borderWidth} solid ${borderColor}`,
          backgroundColor: config.fill || (isStartNode ? theme.colors.green[9] : theme.colors.dark[6]),
          opacity: 1,
          position: 'relative',
        }}
      >
        {branchInfo?.icon && (
          <Tooltip label={`Icon: ${branchInfo.icon}`}>
            <Badge 
              variant="filled" 
              color="grape" 
              size="sm"
              style={{ position: 'absolute', top: -10, right: -10 }}
              leftSection={<IconGitBranch size={12} />}
            >
              {branchInfo.icon}
            </Badge>
          </Tooltip>
        )}

        <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="xs" align="center" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Icon size={18} color={theme.colors.gray[6]} style={{ flexShrink: 0 }} />
              <Text fw={500} size="sm" truncate>
                  {label}
              </Text>
            </Group>
            <Group gap="xs" wrap="nowrap">
              {isDirty && <Badge color="yellow" variant="light" leftSection={<IconPencil size={12} />}>Edited</Badge>}
              {isStartNode && <Badge color="green" leftSection={<IconPlayerPlay size={12}/>}>Start</Badge>}
            </Group>
        </Group>

        <Group justify="space-between" mt={4} align="center" wrap="nowrap">
            <Stack gap={4}>
              <Text component="div" size="xs" c="dimmed">
                Type: <Badge variant="light" color="gray">{stepType}</Badge>
              </Text>
              {isParallelFork && (
                  <Text component="div" size="xs" c="dimmed">
                    <Group gap={4} align="center" wrap="nowrap">
                      <IconGitFork size={14} style={{ flexShrink: 0 }} />
                      {itemsPath && typeof itemsPath === 'string' ? (
                        <Text span truncate>Dynamic: <Code fz="xs">{itemsPath}</Code></Text>
                      ) : (
                        <Text span>{parallelBranches?.length || 0} branches</Text>
                      )}
                    </Group>
                  </Text>
              )}
            </Stack>
        </Group>
      </Card>
      
      {isBranchEnd && (
        <Stack
          gap={2}
          align="center"
          style={{
              position: 'absolute',
              bottom: -30,
              left: '50%',
              transform: 'translateX(-50%)',
              opacity: 0.9,
              pointerEvents: 'none',
          }}
        >
          <Box style={{ width: '2px', height: '8px', backgroundColor: branchColor }} />
          <Group gap={4} wrap="nowrap">
              <IconArrowBackUp size={14} color={branchColor} />
              <Text size="xs" c={branchColor}>Return</Text>
          </Group>
        </Stack>
      )}
    </Box>
  );
}

export default memo(BaseStepNode);
