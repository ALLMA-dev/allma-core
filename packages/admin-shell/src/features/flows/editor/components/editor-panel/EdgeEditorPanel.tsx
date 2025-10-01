import { Paper, Title, Stack, ScrollArea, Group, Text, Tooltip, ActionIcon, TextInput, Badge, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import useFlowEditorStore from '../../hooks/useFlowEditorStore';
import { IconDeviceFloppy, IconTrash, IconX } from '@tabler/icons-react';
import { useMemo } from 'react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

interface EdgeEditorPanelProps {
    selectedEdgeId: string | null;
    onClose: () => void;
}

export function EdgeEditorPanel({ selectedEdgeId, onClose }: EdgeEditorPanelProps) {
    const edges = useFlowEditorStore(state => state.edges);
    const nodes = useFlowEditorStore(state => state.nodes);
    const flowDefinition = useFlowEditorStore(state => state.flowDefinition);
    const updateEdgeCondition = useFlowEditorStore(state => state.updateEdgeCondition);
    const deleteEdgeById = useFlowEditorStore(state => state.deleteEdgeById);

    const selectedEdge = useMemo(() => edges.find(e => e.id === selectedEdgeId), [edges, selectedEdgeId]);

    const form = useForm({
        // The key prop on the component in FlowEditorPage ensures this hook re-runs
        // with fresh initial values whenever selectedEdgeId changes, preventing state sync issues.
        initialValues: {
            condition: selectedEdge?.data?.edgeType === 'conditional'
                ? selectedEdge.data.condition || ''
                : '',
        },
    });
    
    // The problematic useEffect for syncing form state has been removed to fix the infinite render loop.
    // The component now relies solely on the `key` prop for re-initialization.

    if (!selectedEdgeId || !selectedEdge) {
        return null;
    }

    const { data: edgeData, source, target } = selectedEdge;
    const isReadOnly = flowDefinition?.isPublished ?? false;
    const isConditional = edgeData?.edgeType === 'conditional';
    
    const sourceNode = nodes.find(n => n.id === source);
    const targetNode = nodes.find(n => n.id === target);

    const handleSaveChanges = (values: { condition: string }) => {
        if (isConditional && selectedEdgeId) {
            updateEdgeCondition(selectedEdgeId, values.condition);
            notifications.show({
                title: 'Transition Saved',
                message: 'The transition condition has been updated.',
                color: 'green',
                icon: <IconDeviceFloppy size="1.1rem" />,
            });
            form.resetDirty();
        }
    };

    const handleDelete = () => {
        if (!selectedEdgeId) return;
        modals.openConfirmModal({
            title: 'Delete Transition',
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to delete this transition? This action cannot be undone.
                </Text>
            ),
            labels: { confirm: 'Delete transition', cancel: "Cancel" },
            confirmProps: { color: 'red' },
            onConfirm: () => {
                deleteEdgeById(selectedEdgeId);
                onClose();
            },
        });
    };
    
    const edgeTypeDisplay = (type?: string) => {
        if (!type) return 'default';
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    return (
        <Paper
            shadow="md"
            withBorder
            style={{
                width: 'clamp(500px, 35%, 800px)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Group justify="space-between" p="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                <Title order={4}>Transition Details</Title>
                <Tooltip label="Close Panel">
                    <ActionIcon variant="default" size="lg" onClick={onClose}>
                        <IconX />
                    </ActionIcon>
                </Tooltip>
            </Group>

            <form onSubmit={form.onSubmit(handleSaveChanges)} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <ScrollArea style={{ flex: 1 }}>
                    <Stack p="md" gap="lg">
                        <Group>
                            <Text size="sm" w={50}>From:</Text>
                            <Badge variant="light">{sourceNode?.data.label || source}</Badge>
                        </Group>
                         <Group>
                            <Text size="sm" w={50}>To:</Text>
                            <Badge variant="light">{targetNode?.data.label || target}</Badge>
                        </Group>
                         <Group>
                            <Text size="sm" w={50}>Type:</Text>
                            <Badge variant="outline">{edgeTypeDisplay(edgeData?.edgeType)}</Badge>
                        </Group>

                        {isConditional ? (
                            <TextInput
                                label="Condition (JSONPath)"
                                description="The flow will follow this path if the JSONPath expression resolves to a truthy value."
                                placeholder="e.g., $.steps_output.check_user.is_eligible"
                                readOnly={isReadOnly}
                                {...form.getInputProps('condition')}
                            />
                        ) : (
                            <Text size="sm" c="dimmed" p="md">This is a default transition and does not have a condition.</Text>
                        )}
                    </Stack>
                </ScrollArea>

                <Group justify='space-between' p="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                    <Button
                        type="button"
                        color="red"
                        variant="outline"
                        leftSection={<IconTrash size="1rem" />}
                        onClick={handleDelete}
                        disabled={isReadOnly}
                    >
                        Delete Transition
                    </Button>
                    {isConditional && (
                        <Button type="submit" leftSection={<IconDeviceFloppy size="1rem" />} disabled={!form.isDirty() || isReadOnly}>
                            Save Changes
                        </Button>
                    )}
                </Group>
            </form>
        </Paper>
    );
}
