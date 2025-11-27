import { Paper, Title, SimpleGrid, Box, Text, Badge, Stack } from '@mantine/core';
import { format, formatDistanceToNow } from 'date-fns';
import { EditableJsonView } from '@allma/ui-components';
import { AllmaFlowExecutionRecord } from '@allma/core-types';
import { getStatusColor } from '../utils';
import { Link } from 'react-router-dom';

interface ExecutionSummaryProps {
    metadata: AllmaFlowExecutionRecord;
}

export function ExecutionSummary({ metadata }: ExecutionSummaryProps) {
    return (
        <Paper withBorder p="lg" mb="xl" shadow="sm">
            <Title order={3} mb="md">Execution Summary</Title>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
                <Box>
                    <Text size="xs" c="dimmed">Flow Definition</Text>
                    <Text fw={500} component={Link} to={`/flows/edit/${metadata.flowDefinitionId}/${metadata.flowDefinitionVersion}`} c="blue.6">
                        {metadata.flowDefinitionId} (v{metadata.flowDefinitionVersion})
                    </Text>
                </Box>
                <Box>
                    <Text size="xs" c="dimmed">Status</Text>
                    <Badge color={getStatusColor(metadata.status)} variant="filled" size="lg">{metadata.status}</Badge>
                </Box>
                <Box>
                    <Text size="xs" c="dimmed">Started</Text>
                    <Text fw={500}>{formatDistanceToNow(new Date(metadata.startTime), { addSuffix: true })}</Text>
                    <Text size="xs" c="dimmed">{format(new Date(metadata.startTime), 'yyyy-MM-dd HH:mm:ss.SSS')}</Text>
                </Box>
                <Box>
                    <Text size="xs" c="dimmed">Trigger Source</Text>
                    <Text fw={500}>{metadata.triggerSource || 'N/A'}</Text>
                </Box>
            </SimpleGrid>
            {metadata.errorInfo && (
                <Stack gap="xs" mt="md">
                    <Text fw={500} c="red">Flow Error Details</Text>
                    <EditableJsonView value={metadata.errorInfo} readOnly />
                </Stack>
            )}
        </Paper>
    );
}