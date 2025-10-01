import { Accordion, ActionIcon, Badge, Button, Group, Paper, Stack, Text, TextInput, Tooltip, NumberInput, Switch } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { StepInstance } from '@allma/core-types';
import { EditableJsonView } from '@allma/ui-components';
import { useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { ALL_STEP_SCHEMA_KEYS } from '../../../flows/editor/zod-schema-mappers';

interface AdditionalParametersProps {
    form: UseFormReturnType<StepInstance>;
    readOnly: boolean;
}

export function AdditionalParameters({ form, readOnly }: AdditionalParametersProps) {
    const [newParamKey, setNewParamKey] = useState('');

    const additionalParams = useMemo(() => {
        if (!form.values) {
            return [];
        }
        // Filter out keys that are part of any known step schema, or have been "deleted" by setting their value to undefined.
        return Object.entries(form.values).filter(([key, value]) => 
            !ALL_STEP_SCHEMA_KEYS.has(key) && 
            value !== undefined
        );
    }, [form.values]);
    
    const handleAddParameter = () => {
        const key = newParamKey.trim();
        if (!key) {
            notifications.show({ title: 'Invalid Key', message: 'Parameter key cannot be empty.', color: 'red' });
            return;
        }
        if (form.values[key as keyof StepInstance] !== undefined || ALL_STEP_SCHEMA_KEYS.has(key)) {
            notifications.show({ title: 'Duplicate Key', message: `Parameter with key ""${key}"" already exists.`, color: 'red' });
            return;
        }
        form.setFieldValue(key as any, null); // Add new key with a null value
        setNewParamKey(''); // Reset input
    };

    const handleDeleteParameter = (keyToDelete: string) => {
        modals.openConfirmModal({
            title: 'Delete Parameter',
            centered: true,
            children: (<Text size="sm">Are you sure you want to delete the parameter &quot;<strong>{keyToDelete}</strong>&quot;?</Text>),
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: () => {
                form.setFieldValue(keyToDelete as any, undefined);
            },
        });
    };

    // Function to render the correct input based on the value's type
    const renderParameterInput = (key: string, value: any) => {
        switch (typeof value) {
            case 'string':
                return (
                    <TextInput
                        value={value}
                        onChange={(event) => form.setFieldValue(key as any, event.currentTarget.value)}
                        readOnly={readOnly}
                        styles={{ input: { fontFamily: 'monospace' } }}
                    />
                );
            case 'number':
                return (
                    <NumberInput
                        value={value}
                        onChange={(val) => form.setFieldValue(key as any, val === '' ? null : val)}
                        readOnly={readOnly}
                        allowDecimal
                        allowNegative
                    />
                );
            case 'boolean':
                return (
                    <Switch
                        checked={value}
                        onChange={(event) => form.setFieldValue(key as any, event.currentTarget.checked)}
                        readOnly={readOnly}
                        onLabel="ON"
                        offLabel="OFF"
                    />
                );
            case 'object': // This also handles null
                return (
                    <EditableJsonView
                        value={value}
                        onChange={(newValue) => form.setFieldValue(key as any, newValue)}
                        readOnly={readOnly}
                    />
                );
            default:
                // For 'undefined' or other unexpected types, show a placeholder
                return <Text c="dimmed" size="sm">Unsupported or undefined parameter type: {typeof value}</Text>;
        }
    };

    return (
        <Accordion.Item value="additional-params">
            <Accordion.Control>
                <Group gap="xs">
                    <Text>Additional Parameters</Text>
                    {additionalParams.length > 0 && <Badge variant="light" color="gray">{additionalParams.length}</Badge>}
                </Group>
            </Accordion.Control>
            <Accordion.Panel>
                <Stack>
                    <Text size="sm" c="dimmed">
                        Manage custom or less-common parameters for this step. Any parameter not shown in the specific fields above will appear here.
                    </Text>
                    {additionalParams.length > 0 ? (
                        additionalParams.map(([key, value]) => (
                            <Paper withBorder p="xs" key={key} radius="md">
                                <Stack gap="xs">
                                    <Group justify="space-between" wrap="nowrap">
                                        <Text fw={500} ff="monospace">{key}</Text>
                                        {!readOnly && (
                                            <Tooltip label={`Delete '${key}' parameter`}>
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
                        <Text size="sm" c="dimmed" ta="center" p="md">No additional parameters found.</Text>
                    )}
                    {!readOnly && (
                        <Paper withBorder p="sm" mt="lg" radius="md">
                            <Group>
                                <TextInput
                                    placeholder="New parameter key"
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
                                    Add Parameter
                                </Button>
                            </Group>
                        </Paper>
                    )}
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
}
