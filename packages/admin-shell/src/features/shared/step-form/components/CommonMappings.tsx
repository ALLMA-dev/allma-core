import { Accordion, Group, Select, Stack, Text, Paper, ActionIcon, Tooltip, TextInput, Badge } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { StepInstance, StepDefinition } from '@allma/core-types';
import { EditableJsonView } from '@allma/ui-components';
import { STEP_DOCUMENTATION } from '../../../flows/editor/step-documentation';
import { DocPopup } from '../../../../components';
import { AllmaStepNode, AllmaTransitionEdge } from '../../../flows/editor/types';
import { IconArrowRight, IconTrash } from '@tabler/icons-react';
import useFlowEditorStore from '../../../flows/editor/hooks/useFlowEditorStore';
import React, { useCallback } from 'react';
import { isEqual } from 'lodash-es';

interface CommonMappingsProps {
    form: UseFormReturnType<StepInstance>;
    readOnly: boolean;
    nodes: AllmaStepNode[];
    edges: AllmaTransitionEdge[];
    hideTransitions?: boolean;
    errors?: {
        inputMappings?: React.ReactNode;
        outputMappings?: React.ReactNode;
        literals?: React.ReactNode;
    }
    appliedDefinition: StepDefinition | null;
}

export function CommonMappings({ form, readOnly, nodes, edges, hideTransitions = false, errors, appliedDefinition }: CommonMappingsProps) {
    const deleteEdgeById = useFlowEditorStore(state => state.deleteEdgeById);

    const nodeOptions = nodes
        .filter(node => node.id !== form.values.stepInstanceId)
        .map(node => ({ value: node.id, label: `${node.data.label} (${node.id})` }));
    
    const createChangeHandler = useCallback((key: keyof StepInstance & string) => {
        return (newValue: any) => {
            const baseValue = appliedDefinition ? (appliedDefinition as any)[key] : undefined;
            if (isEqual(newValue, baseValue)) {
                form.setFieldValue(key as any, undefined);
            } else {
                form.setFieldValue(key, newValue);
            }
        };
    }, [appliedDefinition, form]);

    return (
        <Accordion.Item value="mappings">
            <Accordion.Control>
                <Group gap="xs">Common Mappings & Transitions <DocPopup content={STEP_DOCUMENTATION.common.mappings.general} /></Group>
            </Accordion.Control>
            <Accordion.Panel>
                <Stack gap="lg">
                    {!hideTransitions && (
                        <>
                            <Select
                                label={<Group gap="xs">Default Next Step <DocPopup content={STEP_DOCUMENTATION.common.mappings.fields.defaultNextStepInstanceId} /></Group>}
                                description="The next step if no conditional transitions are met."
                                placeholder="Select a step..."
                                data={nodeOptions}
                                {...form.getInputProps('defaultNextStepInstanceId')}
                                readOnly={readOnly}
                                searchable clearable
                            />
                            <Stack gap="xs">
                                <Text size="sm" fw={500}>Conditional Transitions</Text>
                                {(form.values.transitions && form.values.transitions.length > 0) ? (
                                    form.values.transitions.map((transition: { condition: string; nextStepInstanceId: string }, index: number) => {
                                        const edge = edges.find(e => 
                                            e.source === form.values.stepInstanceId && 
                                            e.target === transition.nextStepInstanceId && 
                                            e.data?.edgeType === 'conditional'
                                        );
                                        const targetNode = nodes.find(n => n.id === transition.nextStepInstanceId);

                                        return (
                                            <Paper withBorder p="xs" key={index} radius="md">
                                                <Stack gap="xs">
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <Group gap="xs">
                                                            <IconArrowRight size="1rem" />
                                                            <Text size="sm">To:</Text>
                                                            <Badge variant="light">{targetNode?.data.label || transition.nextStepInstanceId}</Badge>
                                                        </Group>
                                                        {!readOnly && edge && (
                                                            <Tooltip label="Delete Transition">
                                                                <ActionIcon color="red" variant="subtle" onClick={() => deleteEdgeById(edge.id)}>
                                                                    <IconTrash size="1rem" />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        )}
                                                    </Group>
                                                    <TextInput
                                                        label="Condition (JSONPath)"
                                                        placeholder="e.g., $.steps_output.check_user.is_eligible"
                                                        readOnly={readOnly}
                                                        {...form.getInputProps(`transitions.${index}.condition`)}
                                                    />
                                                </Stack>
                                            </Paper>
                                        );
                                    })
                                ) : (
                                    <Text size="xs" c="dimmed" ta="center" p="sm">
                                        No conditional transitions. Drag a new connection from this step to create one.
                                    </Text>
                                )}
                            </Stack>
                        </>
                    )}
                    
                    <Stack gap={2}>
                        <Text size="sm" fw={500}>Input Mappings <DocPopup content={STEP_DOCUMENTATION.common.mappings.fields.inputMappings} /></Text>
                        <EditableJsonView value={form.values.inputMappings} onChange={createChangeHandler('inputMappings')} readOnly={readOnly} error={errors?.inputMappings} />
                    </Stack>
                    <Stack gap={2}>
                        <Text size="sm" fw={500}>Output Mappings <DocPopup content={STEP_DOCUMENTATION.common.mappings.fields.outputMappings} /></Text>
                        <EditableJsonView value={form.values.outputMappings} onChange={createChangeHandler('outputMappings')} readOnly={readOnly} error={errors?.outputMappings} />
                    </Stack>
                    <Stack gap={2}>
                        <Text size="sm" fw={500}>Literals <DocPopup content={STEP_DOCUMENTATION.common.mappings.fields.literals} /></Text>
                        <EditableJsonView value={form.values.literals} onChange={createChangeHandler('literals')} readOnly={readOnly} error={errors?.literals} />
                    </Stack>
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
}
