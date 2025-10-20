// packages/allma-core/admin-shell/src/features/flows/editor/FlowEditorPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Group, Alert, ActionIcon, Tooltip, Paper, Stack, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconDeviceFloppy, IconLock, IconLayoutSidebarLeftCollapse, IconPlus } from '@tabler/icons-react';
import { ReactFlowProvider, useReactFlow } from 'reactflow';

import { PageContainer, CopyableText } from '@allma/ui-components';
import { useGetFlowByVersion, useUpdateFlowVersion } from '../../../api/flowService';
import useFlowEditorStore from './hooks/useFlowEditorStore';
import { flowDefinitionToElements } from './flow-utils';
import { FlowCanvas } from './components/FlowCanvas';
import { FlowsBreadcrumbs } from '../FlowsBreadcrumbs';
import { StepPalette } from './components/editor-panel/StepPalette';
import { StepEditorPanel } from './components/editor-panel/StepEditorPanel';
import { EdgeEditorPanel } from './components/editor-panel/EdgeEditorPanel';
import { useGetFlowConfig } from '../../../api/flowService';

function FlowEditorPageContent() {
  const { flowId, version } = useParams<{ flowId: string, version: string }>();
  const navigate = useNavigate();
  useReactFlow();

  const deselectAll = useFlowEditorStore(state => state.deselectAll);
  const setFlow = useFlowEditorStore(state => state.setFlow);
  const flowFromStore = useFlowEditorStore(state => state.flowDefinition);
  const isDirty = useFlowEditorStore(state => state.isDirty || state.nodes.some(n => n.data.isDirty));
  const clearDirtyState = useFlowEditorStore(state => state.clearDirtyState);
  
  const updateFlowMutation = useUpdateFlowVersion();
  const [paletteVisible, { close: closePalette, toggle: togglePalette }] = useDisclosure(false);
  
  // State for the right panel
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isPanelShaking, setIsPanelShaking] = useState(false);
  const [isPanelErrorLocked, setIsPanelErrorLocked] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'configuration' | 'sandbox'>('configuration');

  const { data: flowConfig } = useGetFlowConfig(flowId);
  const { data: flowDef, isLoading, error } = useGetFlowByVersion(flowId, version);

  useEffect(() => {
    if (flowDef && flowConfig) {
      // The flow name and description now come from the master config record
      const flowWithMetadata = { 
        ...flowDef, 
        name: flowConfig.name,
        description: flowConfig.description || undefined,
      };
      // The `flow` returned by flowDefinitionToElements is typed as `FlowDefinition`, losing the name.
      // We ignore it and pass our fully-typed `flowWithMetadata` object to the store instead.
      const { nodes, edges } = flowDefinitionToElements(flowWithMetadata);
      setFlow(flowWithMetadata, nodes, edges);
    }
  }, [flowDef?.updatedAt, flowConfig?.updatedAt, setFlow]);

  const handleSaveDraft = () => {
    if (flowFromStore) {
      updateFlowMutation.mutate({ flowDef: flowFromStore }, {
        onSuccess: () => {
          clearDirtyState();
          navigate(`/flows/versions/${flowId}`);
        },
      });
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        navigate(`/flows/versions/${flowId}`);
      }
    } else {
      navigate(`/flows/versions/${flowId}`);
    }
  };

  // --- Coordinated Panel Handlers ---

  const handleNodeSelect = (nodeId: string | null) => {
    if (isPanelErrorLocked) {
      setIsPanelShaking(true);
      return;
    }
    setSelectedEdgeId(null);
    setSelectedNodeId(nodeId);
  };
  
  const handleEdgeClick = (edgeId: string | null) => {
    if (isPanelErrorLocked) {
      setIsPanelShaking(true);
      return;
    }
    setSelectedNodeId(null);
    setSelectedEdgeId(edgeId);
  };

  const handlePaneClick = () => {
    if (isPanelErrorLocked) {
      setIsPanelShaking(true);
    } else {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  const handleCloseAttempt = () => {
    // Declaratively deselect all nodes and edges via the store.
    // This solves the re-open bug without causing race conditions.
    deselectAll();
  
    // This is the "escape hatch" close, always works for the panel UI state.
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setIsPanelErrorLocked(false); // Reset the lock
  };

  const handleOpenSandbox = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setActiveEditorTab('sandbox');
  };
  
  // --- END: Coordinated Panel Handlers ---
  
  const isReadOnly = flowFromStore?.isPublished;

  const titleComponent = (
    <Stack gap={0} align="flex-start">
      <Title order={2}>
        {isReadOnly ? `Viewing Flow: ${flowFromStore?.name || '...'}` : `Editing Flow: ${flowFromStore?.name || '...'}`}
      </Title>
      {flowId && <CopyableText text={flowId} size="sm" />}
    </Stack>
  );

  return (
    <PageContainer
      title={titleComponent}
      fluid
      breadcrumb={<FlowsBreadcrumbs flowId={flowId} flowName={flowFromStore?.name} isEditing />}
      rightSection={
        <Group>
          <Button variant="default" onClick={handleClose}>
            {isReadOnly ? 'Back to Versions' : 'Close'}
          </Button>
          {!isReadOnly && (
            <Button
              leftSection={<IconDeviceFloppy size="1rem"/>}
              onClick={handleSaveDraft}
              loading={updateFlowMutation.isPending}
              disabled={!isDirty}
            >
              Save Draft & Close
            </Button>
          )}
        </Group>
      }
      loading={isLoading || !flowFromStore}
    >
      {error && <Alert color="red" title="Failed to load flow" icon={<IconAlertCircle />}>{error.message}</Alert>}
      
      {flowFromStore && (
        <Box style={{ 
          height: `calc(100vh - ${isReadOnly ? 34 : 24}vh)`,
          display: 'flex', 
          flexDirection: 'column' 
        }}>
          {isReadOnly && (
              <Alert color="orange" title="Read-Only Mode! This flow version is published and cannot be edited. To make changes, please create a new version." icon={<IconLock />} mb="md">
              </Alert>
          )}
          <Group wrap="nowrap" align="stretch" gap={0} style={{ flex: 1, minHeight: 0 }}>
            {/* NEW: Left-side panel for the Step Palette */}
            {paletteVisible && !isReadOnly && (
                <Paper
                    shadow="md"
                    p="lg"
                    withBorder
                    style={{
                        width: 300,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <StepPalette />
                </Paper>
            )}

            {/* Center Panel: Canvas */}
            <Box style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                {!isReadOnly && (
                    <Tooltip label={paletteVisible ? 'Hide Steps Panel' : 'Add Steps'} position="right">
                    <ActionIcon 
                        variant="filled"
                        color="blue"
                        onClick={togglePalette}
                        size="lg"
                        style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}
                    >
                        {paletteVisible ? <IconLayoutSidebarLeftCollapse /> : <IconPlus />}
                    </ActionIcon>
                    </Tooltip>
                )}
                <FlowCanvas 
                    onNodeClick={handleNodeSelect}
                    onEdgeClick={handleEdgeClick}
                    onPaneClick={handlePaneClick}
                    onNodeDoubleClick={handleOpenSandbox}
                    onDropOnCanvas={closePalette}
                />
            </Box>

            {/* Right Panels: Step Editor or Edge Editor */}
            <StepEditorPanel 
                key={`node-${selectedNodeId}`}
                selectedNodeId={selectedNodeId} 
                onClose={handleCloseAttempt}
                onOpenSandbox={handleOpenSandbox}
                isShaking={isPanelShaking}
                onValidationStateChange={setIsPanelErrorLocked}
                activeTab={activeEditorTab}
                onTabChange={setActiveEditorTab}
            />
            <EdgeEditorPanel
                key={`edge-${selectedEdgeId}`}
                selectedEdgeId={selectedEdgeId}
                onClose={() => setSelectedEdgeId(null)}
            />
          </Group>
        </Box>
      )}
    </PageContainer>
  );
}

export function FlowEditorPage() {
  return (
    <ReactFlowProvider>
      <FlowEditorPageContent />
    </ReactFlowProvider>
  );
}
