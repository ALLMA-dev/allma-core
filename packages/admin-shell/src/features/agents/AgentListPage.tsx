import { Table, ActionIcon, Group, Button, Anchor, Text, Switch, Badge, Tooltip } from '@mantine/core';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useGetAgents, useDeleteAgent, useUpdateAgent } from '../../api/agentService';
import { PageContainer } from '@allma/ui-components';
import { modals } from '@mantine/modals';
import { Agent } from '@allma/core-types';
import { useDisclosure } from '@mantine/hooks';
import { ImportModal } from '../shared/ImportModal';
import { ExportModal } from '../shared/ExportModal';

export function AgentListPage() {
    const navigate = useNavigate();
    const { data: agents, isLoading } = useGetAgents();
    const deleteMutation = useDeleteAgent();
    const updateMutation = useUpdateAgent();

    const [importModalOpened, { open: openImportModal, close: closeImportModal }] = useDisclosure(false);
    const [exportModalOpened, { open: openExportModal, close: closeExportModal }] = useDisclosure(false);

    const openDeleteModal = (agent: Agent) =>
        modals.openConfirmModal({
            title: 'Delete Agent',
            centered: true,
            children: (
                <p>Are you sure you want to delete the &ldquo;{agent.name}&rdquo; agent? This action is irreversible and may affect associated flows.</p>
            ),
            labels: { confirm: 'Delete Agent', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: () => deleteMutation.mutate(agent.id),
        });

    const handleToggleEnabled = (agent: Agent, checked: boolean) => {
        updateMutation.mutate({ agentId: agent.id, data: { enabled: checked } });
    };

    const rows = agents?.map((agent) => (
        <Table.Tr key={agent.id}>
            <Table.Td>
                <Anchor component={Link} to={`/agents/edit/${agent.id}`}>
                    {agent.name}
                </Anchor>
            </Table.Td>
            <Table.Td>
                <Text truncate maw={400}>{agent.description || '-'}</Text>
            </Table.Td>
            <Table.Td>
                <Badge>{agent.flowIds?.length || 0}</Badge>
            </Table.Td>
            <Table.Td>
                <Switch
                    checked={agent.enabled}
                    onChange={(event) => handleToggleEnabled(agent, event.currentTarget.checked)}
                    disabled={updateMutation.isPending}
                />
            </Table.Td>
            <Table.Td>
                <Group gap="xs" justify="flex-end">
                    <Tooltip label="Edit Agent">
                        <ActionIcon component={Link} to={`/agents/edit/${agent.id}`} variant="subtle" aria-label="Edit">
                            <IconPencil size={16} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete Agent">
                        <ActionIcon onClick={() => openDeleteModal(agent)} variant="subtle" color="red" aria-label="Delete">
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <>
            <PageContainer
                title="Agents"
                loading={isLoading}
                rightSection={
                    <Group>
                        <Button onClick={openImportModal} variant="default">Import</Button>
                        <Button onClick={openExportModal} variant="default">Export</Button>
                        <Button onClick={() => navigate('/agents/create')} leftSection={<IconPlus size="1rem" />}>
                            Create New Agent
                        </Button>
                    </Group>
                }
            >
                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Description</Table.Th>
                            <Table.Th>Flows</Table.Th>
                            <Table.Th>Enabled</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows}</Table.Tbody>
                </Table>
            </PageContainer>
            <ImportModal opened={importModalOpened} onClose={closeImportModal} />
            <ExportModal
                opened={exportModalOpened}
                onClose={closeExportModal}
                items={agents || []}
                itemType="agent"
            />
        </>
    );
}