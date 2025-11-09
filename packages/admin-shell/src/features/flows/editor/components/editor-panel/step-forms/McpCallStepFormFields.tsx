import { Select, Stack, Text, Loader, Alert, JsonInput } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { StepDefinition, StepInstance } from '@allma/core-types';
import { DiscoverToolResponse } from '@allma/core-types';
type McpToolDefinition = DiscoverToolResponse[number];
import { useGetMcpConnections, useDiscoverTools } from '../../../../../../api/mcpConnectionService';
import { useState, useMemo, useEffect } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';

interface McpCallStepFormFieldsProps {
    form: UseFormReturnType<StepInstance | Partial<StepDefinition>>;
    readOnly: boolean;
}

export function McpCallStepFormFields({ form, readOnly }: McpCallStepFormFieldsProps) {
    const { data: connections, isLoading: isLoadingConnections } = useGetMcpConnections();
    const discoverToolsMutation = useDiscoverTools();

    const [discoveredTools, setDiscoveredTools] = useState<McpToolDefinition[] | null>(null);

    const connectionOptions = useMemo(() => {
        return connections?.map(c => ({ value: c.id, label: c.name })) || [];
    }, [connections]);

    const toolOptions = useMemo(() => {
        if (!discoveredTools) return [];
        return discoveredTools.map(t => ({ value: t.name, label: t.name }));
    }, [discoveredTools]);

    const selectedTool = useMemo(() => {
        const toolName = form.values.toolName;
        if (!discoveredTools || !toolName) return null;
        return discoveredTools.find(t => t.name === toolName) || null;
    }, [form.values.toolName, discoveredTools]);

    const handleConnectionChange = (value: string | null) => {
        form.setFieldValue('mcpConnectionId', value as any);
        form.setFieldValue('toolName', null as any);
        setDiscoveredTools(null);

        if (value) {
            discoverToolsMutation.mutate(value, {
                onSuccess: (data) => {
                    setDiscoveredTools(data);
                },
            });
        }
    };

    // EFFECT: When the component loads with a pre-selected connectionId,
    // fetch the tools for that connection.
    useEffect(() => {
        const connectionId = (form.values as any).mcpConnectionId;
        // If a connection is set from the loaded data, but we haven't fetched the tools for it yet...
        if (typeof connectionId === 'string' && connectionId && !discoveredTools && !discoverToolsMutation.isPending) {
            discoverToolsMutation.mutate(connectionId, {
                onSuccess: (data) => {
                    setDiscoveredTools(data);
                },
                // onError is handled globally by the useMutation hook, no need to repeat here.
            });
        }
    }, [discoveredTools, discoverToolsMutation, form.values]);

    return (
        <Stack>
            <Select
                label="MCP Connection"
                placeholder="Select a connection"
                data={connectionOptions}
                disabled={readOnly || isLoadingConnections}
                {...form.getInputProps('mcpConnectionId')}
                onChange={handleConnectionChange}
            />

            <Select
                label="Tool Name"
                placeholder={discoverToolsMutation.isPending ? 'Discovering...' : 'Select a tool'}
                data={toolOptions}
                disabled={readOnly || !form.values.mcpConnectionId || discoverToolsMutation.isPending || !discoveredTools}
                {...form.getInputProps('toolName')}
            />

            {discoverToolsMutation.isPending && <Loader size="sm" />}

            {discoverToolsMutation.isError && (
                <Alert icon={<IconAlertCircle size="1rem" />} color="red">
                    {discoverToolsMutation.error.message}
                </Alert>
            )}

            {selectedTool && (
                <Stack gap="xs" mt="md">
                    <Text size="sm" fw={500}>Tool Details</Text>
                    {selectedTool.description && <Text size="sm" c="dimmed">{selectedTool.description}</Text>}
                    <JsonInput
                        label="Input Schema"
                        value={JSON.stringify(selectedTool.input_schema, null, 2)}
                        readOnly
                        minRows={7}
                        maxRows={20}
                        autosize={true}
                    />
                    <Text size="xs" c="dimmed">
                        Use this schema as a guide for configuring the &lsquo;Input Mappings&rsquo; and &lsquo;Literals&rsquo; below.
                    </Text>
                </Stack>
            )}
        </Stack>
    );
}
