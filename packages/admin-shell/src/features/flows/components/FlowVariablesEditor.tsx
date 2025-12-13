import { ActionIcon, Button, Group, Paper, Stack, Text, TextInput, Tooltip, NumberInput, Switch } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { EditableJsonView } from '@allma/ui-components';
import { useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { UpdateFlowConfigInput } from '@allma/core-types';

interface FlowVariablesEditorProps {
    form: UseFormReturnType<UpdateFlowConfigInput>;
    readOnly: boolean;
}

export function FlowVariablesEditor({ form, readOnly }: FlowVariablesEditorProps) {
    const [newParamKey, setNewParamKey] = useState('');

    const flowVariables = useMemo(() => {
        return Object.entries(form.values.flowVariables || {});
    }, [form.values.flowVariables]);
    
    const handleAddParameter = () => {
        const key = newParamKey.trim();
        if (!key) {
            notifications.show({ title: 'Invalid Key', message: 'Parameter key cannot be empty.', color: 'red' });
            return;
        }
        if (form.values.flowVariables?.[key] !== undefined) {
            notifications.show({ title: 'Duplicate Key', message: `Parameter with key "${key}" already exists.`, color: 'red' });
            return;
        }
        form.setFieldValue(`flowVariables.${key}`, null);
        setNewParamKey(''); // Reset input
    };

    const handleDeleteParameter = (keyToDelete: string) => {
        modals.openConfirmModal({
            title: 'Delete Variable',
            centered: true,
            children: (<Text size="sm">Are you sure you want to delete the variable &quot;<strong>{keyToDelete}</strong>&quot;?</Text>),
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: () => {
                const currentVars = { ...form.values.flowVariables };
                delete currentVars[keyToDelete];
                form.setFieldValue('flowVariables', currentVars);
            },
        });
    };

    const renderParameterInput = (key: string, value: any) => {
        switch (typeof value) {
            case 'string':
                return (
                    <TextInput
                        value={value}
                        onChange={(event) => form.setFieldValue(`flowVariables.${key}`, event.currentTarget.value)}
                        readOnly={readOnly}
                        styles={{ input: { fontFamily: 'monospace' } }}
                    />
                );
            case 'number':
                return (
                    <NumberInput
                        value={value}
                        onChange={(val) => form.setFieldValue(`flowVariables.${key}`, val === '' ? null : val)}
                        readOnly={readOnly}
                        allowDecimal
                        allowNegative
                    />
                );
            case 'boolean':
                return (
                    <Switch
                        checked={value}
                        onChange={(event) => form.setFieldValue(`flowVariables.${key}`, event.currentTarget.checked)}
                        readOnly={readOnly}
                        onLabel="ON"
                        offLabel="OFF"
                    />
                );
            case 'object':
                return (
                    <EditableJsonView
                        value={value}
                        onChange={(newValue) => form.setFieldValue(`flowVariables.${key}`, newValue)}
                        readOnly={readOnly}
                        allowStringFallback={true}
                    />
                );
            default:
                // For 'undefined', null, or other types, default to the editable JSON view
                return (
                    <EditableJsonView
                        value={value}
                        onChange={(newValue) => form.setFieldValue(`flowVariables.${key}`, newValue)}
                        readOnly={readOnly}
                        allowStringFallback={true}
                    />
                );
        }
    };

    return (
        <Stack>
            <Text size="sm" c="dimmed">
                Define default variables for this flow. They will be available in the context at <code>$.flow_variables</code> and can be overridden by trigger-time data.
            </Text>
            {flowVariables.length > 0 ? (
                flowVariables.map(([key, value]) => (
                    <Paper withBorder p="xs" key={key} radius="md">
                        <Stack gap="xs">
                            <Group justify="space-between" wrap="nowrap">
                                <Text fw={500} ff="monospace">{key}</Text>
                                {!readOnly && (
                                    <Tooltip label={`Delete '${key}' variable`}>
                                        <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteParameter(key)}>
                                            <IconTrash size="1rem" />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </Group>
                            {renderParameterInput(key, value)}
                        </Stack>
                    </Paper>
                ))
            ) : (
                <Text size="sm" c="dimmed" ta="center" p="md">No flow variables defined.</Text>
            )}
            {!readOnly && (
                <Paper withBorder p="sm" mt="lg" radius="md">
                    <Group>
                        <TextInput
                            placeholder="New variable key"
                            value={newParamKey}
                            onChange={(e) => setNewParamKey(e.currentTarget.value)}
                            style={{ flex: 1 }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddParameter(); } }}
                        />
                        <Button
                            leftSection={<IconPlus size="1rem" />}
                            onClick={handleAddParameter}
                            disabled={!newParamKey.trim()}
                        >
                            Add Variable
                        </Button>
                    </Group>
                </Paper>
            )}
        </Stack>
    );
}