import { Table, Group, Badge, Text, ActionIcon, Tooltip, Box, LoadingOverlay, Alert } from '@mantine/core';
import { IconEye, IconAlertCircle, IconPlayerPlay } from '@tabler/icons-react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { FlowExecutionSummary } from '@allma/core-types';
import { modals } from '@mantine/modals';
import { useFlowRedrive } from '../../../api/flowService';
import { formatFuzzyDurationWithDetail } from '../../../utils/formatters';
import { getStatusColor } from '../utils';

interface ExecutionsTableProps {
    executions: FlowExecutionSummary[];
    isLoading: boolean;
    isRefetching: boolean;
    flowId: string;
    error?: Error | null;
    onRedriveSuccess?: (newExecutionId: string) => void;
}

export function ExecutionsTable({ executions, isLoading, isRefetching, flowId, error, onRedriveSuccess }: ExecutionsTableProps) {
    const navigate = useNavigate();
    const flowRedriveMutation = useFlowRedrive();

    const handleFlowRedrive = (exec: FlowExecutionSummary) => {
        modals.openConfirmModal({
            title: 'Confirm Flow Redrive',
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to redrive execution {exec.flowExecutionId.substring(0, 8)}...? A new execution will start using the original input.
                </Text>
            ),
            labels: { confirm: 'Redrive Flow', cancel: 'Cancel' },
            confirmProps: { color: 'green' },
            onConfirm: () => {
                flowRedriveMutation.mutate({ executionId: exec.flowExecutionId }, {
                    onSuccess: (data) => {
                        if (onRedriveSuccess) {
                            onRedriveSuccess(data.newFlowExecutionId);
                        } else {
                            // Default behavior: navigate after a short delay
                            setTimeout(() => navigate(`/executions/${data.newFlowExecutionId}`), 1000);
                        }
                    }
                });
            },
        });
    };

    const rows = executions.map((exec: FlowExecutionSummary) => (
        <Table.Tr key={exec.flowExecutionId}>
            <Table.Td>
                <Link to={`/executions/${exec.flowExecutionId}`}>
                    <Text variant="link" c="blue.6" size="sm" ff="monospace">{exec.flowExecutionId}</Text>
                </Link>
            </Table.Td>
            <Table.Td>
                <Badge variant="light" color="cyan">v{exec.flowDefinitionVersion}</Badge>
            </Table.Td>
            <Table.Td>
                <Badge color={getStatusColor(exec.status)} variant="filled">{exec.status}</Badge>
            </Table.Td>
            <Table.Td>{format(new Date(exec.startTime), 'yyyy-MM-dd HH:mm:ss')}</Table.Td>
            <Table.Td>
                {exec.endTime ? formatFuzzyDurationWithDetail(exec.startTime, exec.endTime) : 'In-progress'}
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <Tooltip label="View Details">
                        <ActionIcon component={Link} to={`/executions/${exec.flowExecutionId}`} variant="subtle">
                            <IconEye size="1rem" />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Redrive Flow">
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => handleFlowRedrive(exec)}
                            loading={flowRedriveMutation.isPending && flowRedriveMutation.variables?.executionId === exec.flowExecutionId}
                        >
                            <IconPlayerPlay size="1rem" />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Box pos="relative" mt="xs">
            <LoadingOverlay visible={(isLoading && !isRefetching)} />
            {error && <Alert color="red" title="Error" icon={<IconAlertCircle />}>Could not load executions: {error.message}</Alert>}
            
            {!isLoading && executions.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" p="md">
                    No executions found for the current filters.
                </Text>
            )}
            
            {executions.length > 0 && (
                <Table.ScrollContainer minWidth={800}>
                    <Table striped highlightOnHover verticalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Execution ID</Table.Th>
                                <Table.Th>Version</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Start Time</Table.Th>
                                <Table.Th>Duration</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            )}
        </Box>
    );
}