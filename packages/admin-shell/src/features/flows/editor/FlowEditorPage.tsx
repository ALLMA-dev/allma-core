import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Group, Alert, ActionIcon, Tooltip, Paper, Stack, Title, Badge, Text, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconDeviceFloppy, IconLock, IconLayoutSidebarLeftCollapse, IconPlus, IconDownloadOff, IconCode } from '@tabler/icons-react';
import { ReactFlowProvider, useReactFlow } from 'reactflow';

import { PageContainer, CopyableText } from '@allma/ui-components';
import { useGetFlowByVersion, useUpdateFlowVersion, useUnpublishFlowVersion, useUnlockFlowForVisualEditing } from '../../../api/flowService';
import useFlowEditorStore from './hooks/useFlowEditorStore';
import { flowDefinitionToElements } from './flow-utils';
import { FlowCanvas } from './components/FlowCanvas';
import { FlowsBreadcrumbs } from '../FlowsBreadcrumbs';
import { StepPalette } from './components/editor-panel/StepPalette';
import { StepEditorPanel } from './components/editor-panel/StepEditorPanel';
import { EdgeEditorPanel } from './components/editor-panel/EdgeEditorPanel';
import { useGetFlowConfig } from '../../../api/flowService';
import { resolveEditorReadOnly } from './read-only';

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
  const unpublishMutation = useUnpublishFlowVersion();
  const unlockMutation = useUnlockFlowForVisualEditing();

  const [paletteVisible, { close: closePalette, toggle: togglePalette }] = useDisclosure(false);
  const [unpublishModalOpened, { open: openUnpublishModal, close: closeUnpublishModal }] = useDisclosure(false);
  const [unlockModalOpened, { open: openUnlockModal, close: closeUnlockModal }] = useDisclosure(false);
  
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

  const handleSaveAndClose = () => {
    if (flowFromStore) {
      updateFlowMutation.mutate({ flowDef: flowFromStore }, {
        onSuccess: () => {
          clearDirtyState();
          navigate(`/flows/versions/${flowId}`);
        },
      });
    }
  };

  const handleSaveOnly = () => {
    if (flowFromStore) {
      updateFlowMutation.mutate({ flowDef: flowFromStore }, {
        onSuccess: () => {
          clearDirtyState();
          // Do not navigate, just clear the dirty state
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

  const handleUnpublish = () => {
    if (flowFromStore) {
        unpublishMutation.mutate(
            { flowId: flowFromStore.id, version: flowFromStore.version },
            {
                onSuccess: () => {
                    closeUnpublishModal();
                    // React Query will automatically invalidate the 'flowDetail' query,
                    // causing this component to re-render with the updated isPublished status.
                }
            }
        );
    }
  };

  const handleUnlock = () => {
    if (flowFromStore) {
        unlockMutation.mutate(
            { flowDef: flowFromStore },
            { onSuccess: () => closeUnlockModal() },
        );
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
  
  const { readOnly: isReadOnly, reason: readOnlyReason, isCodeOwned } = resolveEditorReadOnly(flowFromStore);

  const titleComponent = (
    <Stack gap={0} align="flex-start">
      <Group gap="xs" align="center">
        <Title order={2}>
            {isReadOnly ? `Viewing Flow: ${flowFromStore?.name || '...'}` : `Editing Flow: ${flowFromStore?.name || '...'}`}
        </Title>
        {readOnlyReason === 'published' && (
            <Tooltip label="This version is published and cannot be edited directly. Unpublish or create a new version to make changes." withArrow>
                <Badge color="orange" variant="light" leftSection={<IconLock size={12} />} style={{ cursor: 'help' }}>Read-Only</Badge>
            </Tooltip>
        )}
        {isCodeOwned && (
            <Tooltip label="This flow is managed in code. Edit the source and redeploy, or unlock it for visual editing." withArrow>
                <Badge color="blue" variant="light" leftSection={<IconCode size={12} />} style={{ cursor: 'help' }}>Managed in code</Badge>
            </Tooltip>
        )}
      </Group>
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
          {readOnlyReason === 'published' ? (
            <>
                <Button
                    variant="subtle"
                    color="orange"
                    leftSection={<IconDownloadOff size="1rem" />}
                    onClick={openUnpublishModal}
                    loading={unpublishMutation.isPending}
                >
                    Unpublish
                </Button>
                <Button variant="default" onClick={handleClose}>
                    Back to Versions
                </Button>
            </>
          ) : readOnlyReason === 'code' ? (
            <>
                <Button
                    variant="subtle"
                    color="blue"
                    leftSection={<IconCode size="1rem" />}
                    onClick={openUnlockModal}
                    loading={unlockMutation.isPending}
                >
                    Unlock for visual editing
                </Button>
                <Button variant="default" onClick={handleClose}>
                    Back to Versions
                </Button>
            </>
          ) : (
            <>
                <Button
                    onClick={handleSaveOnly}
                    loading={updateFlowMutation.isPending}
                    disabled={!isDirty}
                >
                    Save
                </Button>
                <Button
                    leftSection={<IconDeviceFloppy size="1rem"/>}
                    onClick={handleSaveAndClose}
                    loading={updateFlowMutation.isPending}
                    disabled={!isDirty}
                >
                    Save & Close
                </Button>
                <Button variant="default" onClick={handleClose}>
                    Close
                </Button>
            </>
          )}
        </Group>
      }
      loading={isLoading || !flowFromStore}
    >
      {error && <Alert color="red" title="Failed to load flow" icon={<IconAlertCircle />}>{error.message}</Alert>}

      {isCodeOwned && (
        <Alert color="blue" title="Managed in code" icon={<IconCode size={16} />} mb="sm">
          This flow is managed in code. Edit the source and redeploy. You can still view it and run
          steps in the Sandbox here. To take over editing in the canvas, unlock it for visual editing.
        </Alert>
      )}

      {flowFromStore && (
        <Box style={{ 
          height: `calc(100vh - ${isReadOnly ? 24 : 24}vh)`, // Adjusted height since Alert is gone
          display: 'flex', 
          flexDirection: 'column' 
        }}>
          <Group wrap="nowrap" align="stretch" gap={0} style={{ flex: 1, minHeight: 0 }}>
            {/* Left-side panel for the Step Palette */}
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

      {/* Unpublish Confirmation Modal */}
      <Modal opened={unpublishModalOpened} onClose={closeUnpublishModal} title="Confirm Unpublish" centered>
        <Text>Are you sure you want to unpublish <Text span fw={700}>version {flowFromStore?.version}</Text>?</Text>
        <Text c="dimmed" size="sm" mt="sm">This will remove the &ldquo;Published&rdquo; status, and there will be no active version for this flow until a new one is published.</Text>
        <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={closeUnpublishModal}>Cancel</Button>
            <Button color="orange" onClick={handleUnpublish} loading={unpublishMutation.isPending}>Unpublish</Button>
        </Group>
      </Modal>

      {/* Unlock-for-visual-editing Confirmation Modal */}
      <Modal opened={unlockModalOpened} onClose={closeUnlockModal} title="Unlock for visual editing" centered>
        <Text>This flow is currently managed in code. Unlocking hands ownership to the Visual Editor so you can edit <Text span fw={700}>version {flowFromStore?.version}</Text> in the canvas.</Text>
        <Text c="dimmed" size="sm" mt="sm">This is a one-way transfer: the next deploy of the code source will report drift until you re-eject the flow or remove it from code. Continue?</Text>
        <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={closeUnlockModal}>Cancel</Button>
            <Button color="blue" onClick={handleUnlock} loading={unlockMutation.isPending}>Unlock</Button>
        </Group>
      </Modal>
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