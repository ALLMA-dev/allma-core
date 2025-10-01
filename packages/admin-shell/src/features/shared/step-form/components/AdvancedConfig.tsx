import { Accordion, Box, Paper, Text } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { StepInstance } from '@allma/core-types';
import { EditableJsonView } from '@allma/ui-components';

interface AdvancedConfigProps {
    form: UseFormReturnType<StepInstance>;
}

export function AdvancedConfig({ form }: AdvancedConfigProps) {
    return (
        <Accordion.Item value="advanced">
            <Accordion.Control>Advanced: Full JSON Configuration</Accordion.Control>
            <Accordion.Panel>
                <Box>
                    <Text size="sm" fw={500}>Full Step Configuration</Text>
                    <Text size="xs" c="dimmed" mb="xs">View the complete JSON for this step. Edits must be made in the fields above.</Text>
                    <Paper withBorder p="sm" radius="md" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        <EditableJsonView value={form.values} readOnly />
                    </Paper>
                </Box>
            </Accordion.Panel>
        </Accordion.Item>
    );
}