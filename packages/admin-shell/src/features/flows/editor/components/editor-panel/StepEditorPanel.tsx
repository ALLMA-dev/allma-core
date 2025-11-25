import { Paper, Title, Group, Tooltip, ActionIcon, Text, Box, LoadingOverlay, ScrollArea, Tabs, ColorPicker, SimpleGrid, SegmentedControl, Select, Alert, Button, Stack, Popover } from '@mantine/core';
import { useForm } from '@mantine/form';
import useFlowEditorStore from '../../hooks/useFlowEditorStore.js';
import { IconX, IconSettings, IconDatabase, IconAlertCircle, IconPlayerPlay } from '@tabler/icons-react';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { SandboxStepInput, StepExecutionResult, StepInstance } from '@allma/core-types';
import { useDisclosure } from '@mantine/hooks';
import { PromptInFlowPreviewModal } from '../../../../prompts/components/PromptInFlowPreviewModal.js';
import { StepConfigurationForm, StepConfigurationFormHandle } from '../../../../shared/step-form/StepConfigurationForm.js';
import { modals } from '@mantine/modals';
import { useGetStepDefinition } from '../../../../../api/stepDefinitionService.js';
import { useGetFlowExecutions, useGetExecutionDetail } from '../../../../../api/executionService.js';
import { EditableJsonView } from '@allma/ui-components';
import { useSandboxStep } from '../../../../../api/flowControlService.js';
import { SandboxResultModal } from './SandboxResultModal.js';
import { notifications } from '@mantine/notifications';


interface StepEditorPanelProps {
    selectedNodeId: string | null;
    onClose: () => void;
    onOpenSandbox: (nodeId: string) => void;
    isShaking: boolean;
    onValidationStateChange: (hasError: boolean) => void;
    activeTab: 'configuration' | 'sandbox';
    onTabChange: (tab: 'configuration' | 'sandbox') => void;
}

export function StepEditorPanel({ selectedNodeId, onClose, isShaking, onValidationStateChange, activeTab, onTabChange }: StepEditorPanelProps) {
    const updateNodeConfig = useFlowEditorStore(state => state.updateNodeConfig);
    const flowDefinition = useFlowEditorStore(state => state.flowDefinition);
    const selectedNode = useFlowEditorStore(state => state.nodes.find(n => n.id === selectedNodeId));
    const deleteNodes = useFlowEditorStore(state => state.deleteNodes);
    const setStartNode = useFlowEditorStore(state => state.setStartNode);
    const [shakeClass, setShakeClass] = useState('');
    const formRef = useRef<StepConfigurationFormHandle>(null);
    
    const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false);
    const [previewPromptId, setPreviewPromptId] = useState<string | null>(null);

    // --- Sandbox State ---
    const [executionTypeFilter, setExecutionTypeFilter] = useState('COMPLETED');
    const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
    const [sandboxContext, setSandboxContext] = useState<Record<string, any> | null>(null);
    const [sandboxInput, setSandboxInput] = useState<SandboxStepInput | null>(null);
    const [sandboxResult, setSandboxResult] = useState<StepExecutionResult | null>(null);
    const [resultModalOpened, { open: openResultModal, close: closeResultModal }] = useDisclosure(false);
    
    const { data: executionsResponse, isLoading: isLoadingExecutions } = useGetFlowExecutions({
        flowId: flowDefinition?.id || '',
        limit: 25,
        status: executionTypeFilter,
    });
    const { data: executionDetail, isLoading: isLoadingDetail } = useGetExecutionDetail(selectedExecutionId || undefined);
    const sandboxMutation = useSandboxStep();
    // --- End Sandbox State ---

    const stepDefinitionId = selectedNode?.data.config.stepDefinitionId ?? undefined;
    const { data: resolvedAppliedDef, isLoading: isLoadingDef } = useGetStepDefinition(stepDefinitionId);

    const initialFormValues = useMemo(() => {
        return selectedNode?.data.config || ({} as StepInstance);
    }, [selectedNode]);


    const form = useForm<StepInstance>({
        initialValues: initialFormValues,
    });

    useEffect(() => {
        if (selectedNode) {
            const mergedConfig = {
                ...(resolvedAppliedDef || {}),
                ...selectedNode.data.config,
            };
            form.setValues(mergedConfig);
            form.resetDirty(mergedConfig);
        }
    }, [selectedNode?.id, JSON.stringify(selectedNode?.data.config), JSON.stringify(resolvedAppliedDef), form.setValues, form.resetDirty]);

    const debouncedUpdate = useDebouncedCallback(() => {
        if (!form.isDirty() || !selectedNodeId) return;
        
        const isValid = formRef.current?.validate();
        if (isValid) {
            updateNodeConfig(selectedNodeId, {
                config: form.values,
                label: form.values.displayName || selectedNodeId,
            });
            onValidationStateChange(false);
        } else {
            onValidationStateChange(true);
        }
    }, 500);

    useEffect(() => { debouncedUpdate(); }, [form.values, debouncedUpdate]);

    useEffect(() => {
        if (isShaking) {
            setShakeClass('shake-animation');
            const timer = setTimeout(() => setShakeClass(''), 500);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isShaking]);

    // --- Sandbox Logic ---
    const selectedStepHistory = useMemo(() => {
        if (!executionDetail || !selectedNodeId) return null;
        const stepRecords = executionDetail.steps.filter(s => s.stepInstanceId === selectedNodeId);
        const stepRecord = stepRecords[stepRecords.length - 1];
        if (!stepRecord) return null;
        
        const fullRecord = stepRecord as any;
        return {
            inputContext: fullRecord.inputMappingContext,
            outputData: fullRecord.outputData,
        };
    }, [executionDetail, selectedNodeId]);

    useEffect(() => {
        if (selectedStepHistory) {
            setSandboxContext(selectedStepHistory.inputContext);
        } else {
            setSandboxContext({});
        }
    }, [selectedStepHistory]);

    useEffect(() => {
        setSelectedExecutionId(null);
    }, [selectedNodeId]);

    const executionOptions = useMemo(() => {
        if (!executionsResponse?.items) {
            return [];
        }
        return executionsResponse.items.map(ex => ({
            value: ex.flowExecutionId,
            label: `[${ex.status}] ${ex.startTime} (${ex.flowExecutionId.substring(0, 8)})`
        }));
    }, [executionsResponse]);

    const handleRunSandbox = async () => {
        if (!flowDefinition || !selectedNodeId || !sandboxContext) return;

        const payload: SandboxStepInput = {
            flowDefinitionId: flowDefinition.id,
            flowDefinitionVersion: flowDefinition.version,
            stepInstanceId: selectedNodeId,
            contextData: sandboxContext,
        };
        setSandboxInput(payload);

        const result = await sandboxMutation.mutateAsync(payload);
        setSandboxResult(result);
        openResultModal();
    };
    // --- End Sandbox Logic ---
    
    if (!selectedNode) {
        return null;
    }

    const isReadOnly = flowDefinition?.isPublished ?? false;

    const handlePreviewPrompt = (promptId: string) => {
        setPreviewPromptId(promptId);
        openPreview();
    };

    const openDeleteModal = () => modals.openConfirmModal({
        title: 'Delete Step',
        centered: true,
        children: (<Text size="sm">Are you sure you want to delete this step? This action is irreversible.</Text>),
        labels: { confirm: 'Delete Step', cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onConfirm: () => {
            if (selectedNodeId) {
                deleteNodes([selectedNodeId]);
                onClose();
            }
        },
    });

    const handleSetStartNode = () => {
        if (selectedNodeId) {
            setStartNode(selectedNodeId);
            notifications.show({
                title: 'Start Step Updated',
                message: `Step "${form.values.displayName || selectedNodeId}" is now the start step.`,
                color: 'green',
                icon: <IconPlayerPlay size="1.1rem" />,
            });
        }
    };
    
    return (
        <>
            <Paper shadow="md" withBorder className={shakeClass} style={{ width: 'clamp(500px, 35%, 800px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Group justify="space-between" p="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                     <Group gap="xs">
                        <Popover withArrow shadow="md">
                            <Popover.Target>
                                <Box w={20} h={20} bg={form.values.fill || 'gray'} style={{ borderRadius: '4px', cursor: 'pointer' }} />
                            </Popover.Target>
                            <Popover.Dropdown>
                                <ColorPicker
                                    format="hex"
                                    value={form.values.fill}
                                    onChange={(color) => form.setFieldValue('fill', color)}
                                    swatches={['#25262b', '#868e96', '#fa5252', '#e64980', '#be4bdb', '#7950f2', '#4c6ef5', '#228be6', '#15aabf', '#12b886', '#40c057', '#82c91e', '#fab005', '#fd7e14']}
                                />
                            </Popover.Dropdown>
                        </Popover>
                        <Title order={4}>Step: {form.values.displayName || selectedNode.id}</Title>
                    </Group>
                    <Group>
                         <Tooltip label="Close Panel">
                            <ActionIcon variant="default" size="lg" onClick={onClose}>
                                <IconX />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
                
                <Tabs value={activeTab} onChange={(val) => onTabChange(val as any)} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <Tabs.List grow>
                        <Tabs.Tab value="configuration" leftSection={<IconSettings size="1rem" />} color={activeTab === 'configuration' ? 'blue' : 'gray'}>Configuration</Tabs.Tab>
                        <Tabs.Tab value="sandbox" leftSection={<IconDatabase size="1rem" />} color={activeTab === 'sandbox' ? 'blue' : 'gray'}>Live data & Sandbox</Tabs.Tab>
                    </Tabs.List>

                    <ScrollArea style={{ flex: 1 }}>
                        <Tabs.Panel value="configuration">
                                <Box pos="relative">
                                    <LoadingOverlay visible={isLoadingDef} zIndex={10} overlayProps={{ radius: 'sm', blur: 2 }}/>
                                    <StepConfigurationForm
                                        ref={formRef}
                                        form={form as any}
                                        onSubmit={() => {}}
                                        isSubmitting={false}
                                        isReadOnly={isReadOnly}
                                        onPreviewPrompt={handlePreviewPrompt}
                                        onDelete={openDeleteModal}
                                        onSetStartNode={handleSetStartNode}
                                        variant="instance"
                                        appliedDefinition={resolvedAppliedDef || null}
                                    />
                                </Box>
                        </Tabs.Panel>

                        <Tabs.Panel value="sandbox">
                                <Stack p="md" gap="lg">
                                    <Paper withBorder p="md">
                                        <Text fw={500}>1. Select a Past Execution</Text>
                                        <Text size="sm" c="dimmed" mb="md">Choose a recent execution to load its context and output for this step.</Text>
                                        <SegmentedControl fullWidth value={executionTypeFilter} onChange={setExecutionTypeFilter} data={[{ label: 'Successful Runs', value: 'COMPLETED' }, { label: 'Failed Runs', value: 'FAILED' }]} mb="sm" />
                                        <Select placeholder="Select an execution..." data={executionOptions} value={selectedExecutionId} onChange={setSelectedExecutionId} searchable clearable disabled={isLoadingExecutions} />
                                    </Paper>

                                    <Box pos="relative">
                                        <LoadingOverlay visible={isLoadingDetail} />
                                        {!selectedExecutionId && <Alert icon={<IconAlertCircle />}>Please select an execution to view its data, or manually build an input context below.</Alert>}
                                        {selectedExecutionId && !isLoadingDetail && !selectedStepHistory && (
                                            <Alert color="orange" title="Step Not Found">The step &apos;{selectedNodeId}&apos; was not found in the selected execution &apos;{selectedExecutionId.substring(0,8)}&apos;. It may have been skipped.</Alert>
                                        )}
                                        <SimpleGrid cols={selectedStepHistory ? 2 : 1} mt="md">
                                            <Stack>
                                                <Text fw={500}>Input Context for Sandbox</Text>
                                                <Text size="sm" c="dimmed" mt={-10}>This is the flow state that will be used as input for the sandbox run. Edit it to test different scenarios.</Text>
                                                <EditableJsonView value={sandboxContext} onChange={(newValue) => setSandboxContext(newValue as Record<string, any> | null)} />
                                            </Stack>
                                            {selectedStepHistory && (
                                                <Stack>
                                                    <Text fw={500}>Historical Step Output</Text>
                                                    <Text size="sm" c="dimmed" mt={-10}>This was the output produced by the step in the selected execution.</Text>
                                                    <EditableJsonView value={selectedStepHistory.outputData} readOnly />
                                                </Stack>
                                            )}
                                        </SimpleGrid>
                                    </Box>
                                    
                                    <Paper withBorder p="md">
                                        <Group justify="space-between">
                                            <div>
                                                <Text fw={500}>2. Run in Sandbox</Text>
                                                <Text size="sm" c="dimmed">Execute this step in isolation using the (potentially modified) input context from above.</Text>
                                            </div>
                                            <Button onClick={handleRunSandbox} disabled={!sandboxContext || sandboxMutation.isPending} loading={sandboxMutation.isPending}>Run Sandbox</Button>
                                        </Group>
                                    </Paper>
                                </Stack>
                        </Tabs.Panel>
                    </ScrollArea>
                </Tabs>
            </Paper>
            <PromptInFlowPreviewModal opened={previewOpened} onClose={closePreview} promptId={previewPromptId} />
            <SandboxResultModal opened={resultModalOpened} onClose={closeResultModal} result={sandboxResult} input={sandboxInput} />
        </>
    );
}