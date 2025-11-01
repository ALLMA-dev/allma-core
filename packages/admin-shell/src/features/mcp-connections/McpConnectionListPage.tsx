import { Table, ActionIcon, Group, Button, Anchor } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useGetMcpConnections, useDeleteMcpConnection } from '../../api/mcpConnectionService';
import { PageContainer } from '@allma/ui-components';
import { modals } from '@mantine/modals';
import { McpConnectionMetadataStorageItem as McpConnectionSummary } from '@allma/core-types/src/mcp/connections';

export function McpConnectionListPage() {
    const navigate = useNavigate();
    const { data: connections, isLoading } = useGetMcpConnections();
    const deleteMutation = useDeleteMcpConnection();

    const openDeleteModal = (connection: McpConnectionSummary) =>
        modals.openConfirmModal({
            title: 'Delete MCP Connection',
            centered: true,
            children: (
                <p>Are you sure you want to delete the &ldquo;{connection.name}&rdquo; connection? This action is irreversible.</p>
            ),
            labels: { confirm: 'Delete Connection', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: () => deleteMutation.mutate(connection.id),
        });

    const rows = connections?.map((connection) => (
        <Table.Tr key={connection.id}>
            <Table.Td>
                <Anchor component={Link} to={`/mcp-connections/edit/${connection.id}`}>
                    {connection.name}
                </Anchor>
            </Table.Td>
            <Table.Td>{connection.id}</Table.Td>
            <Table.Td>
                <Group gap="xs" justify="flex-end">
                    <ActionIcon component={Link} to={`/mcp-connections/edit/${connection.id}`} variant="default" aria-label="Edit">
                        <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon onClick={() => openDeleteModal(connection)} variant="default" color="red" aria-label="Delete">
                        <IconTrash size={16} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <PageContainer
            title="MCP Connections"
            loading={isLoading}
            rightSection={
                <Button onClick={() => navigate('/mcp-connections/create')}>
                    Create New Connection
                </Button>
            }
        >
            <Table>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>ID</Table.Th>
                        <Table.Th />
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
            </Table>
        </PageContainer>
    );
}
