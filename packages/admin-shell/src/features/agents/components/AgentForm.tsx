import { TextInput, Textarea, Group, Button, Stack, Switch, MultiSelect, LoadingOverlay, Accordion } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { CreateAgentInput } from '@allma/core-types';
import { useMemo } from 'react';
import { useGetFlows } from '../../../api/flowService';
import { FlowVariablesEditor } from '../../flows/components/FlowVariablesEditor';

interface AgentFormProps {
    form: UseFormReturnType<CreateAgentInput>;
    onSubmit: (values: CreateAgentInput) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export function AgentForm({ form, onSubmit, onCancel, isSubmitting }: AgentFormProps) {
    const { data: flows, isLoading: isLoadingFlows } = useGetFlows({});

    const flowOptions = useMemo(() => {
        if (!flows) return [];
        return flows.map(flow => ({ value: flow.id, label: `${flow.name} (${flow.id})` }));
    }, [flows]);

    return (
        <form onSubmit={form.onSubmit(onSubmit)}>
            <Stack pos="relative">
                <LoadingOverlay visible={isLoadingFlows} />
                <TextInput
                    label="Agent Name"
                    placeholder="e.g., Customer Support Agent"
                    withAsterisk
                    {...form.getInputProps('name')}
                />
                <Textarea
                    label="Description"
                    placeholder="A brief description of the agent's purpose"
                    {...form.getInputProps('description')}
                />
                <Switch
                    label="Enabled"
                    description="If disabled, flows associated with this agent (and not other enabled agents) will not be triggered by schedules or webhooks."
                    {...form.getInputProps('enabled', { type: 'checkbox' })}
                />
                <MultiSelect
                    label="Associated Flows"
                    placeholder="Select flows to include in this agent"
                    data={flowOptions}
                    searchable
                    clearable
                    disabled={isLoadingFlows}
                    {...form.getInputProps('flowIds')}
                />
                <Accordion variant="contained" radius="md">
                    <Accordion.Item value="flow-variables">
                        <Accordion.Control>Shared Flow Variables</Accordion.Control>
                        <Accordion.Panel>
                            <FlowVariablesEditor form={form as any} readOnly={isSubmitting} />
                        </Accordion.Panel>
                    </Accordion.Item>
                </Accordion>
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={isSubmitting}>
                        Save Agent
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}