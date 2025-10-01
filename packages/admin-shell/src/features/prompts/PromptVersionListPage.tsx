import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Table, Group, Badge, Text, ActionIcon, Tooltip, Box, LoadingOverlay, Alert, Button, Modal } from '@mantine/core';
import { IconPencil, IconEye, IconAlertCircle, IconUpload, IconPlus, IconDownloadOff, IconTrash, IconGitCompare } from '@tabler/icons-react';
import { format } from 'date-fns';
import { PageContainer } from '@allma/ui-components';

import { useListPromptVersions, usePublishPromptVersion, useUnpublishPromptVersion, useCreatePromptVersion, useDeletePromptVersion, PromptVersionSummary } from '../../api/promptTemplateService';
import { useDisclosure } from '@mantine/hooks';
import { PromptsBreadcrumbs } from './components/PromptsBreadcrumbs';

export function PromptVersionListPage() {
  const { promptId } = useParams<{ promptId: string }>();
  const navigate = useNavigate();
  const [versionToModify, setVersionToModify] = useState<PromptVersionSummary | null>(null);
  
  const [publishModal, { open: openPublishModal, close: closePublishModal }] = useDisclosure(false);
  const [unpublishModal, { open: openUnpublishModal, close: closeUnpublishModal }] = useDisclosure(false);
  const [deleteModal, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const { data: promptVersions, isLoading, error } = useListPromptVersions(promptId);
  const publishMutation = usePublishPromptVersion();
  const unpublishMutation = useUnpublishPromptVersion();
  const createVersionMutation = useCreatePromptVersion();
  const deleteVersionMutation = useDeletePromptVersion();

  const { promptName, sortedPromptVersions } = useMemo(() => {
    if (!promptVersions || !promptId) return { promptName: 'Loading...', sortedPromptVersions: [] };
    // The API returns only versions for the given promptId
    const sorted = [...promptVersions].sort((a, b) => b.version - a.version);
    return {
      promptName: sorted[0]?.name || promptId, // Use name from the latest version if available
      sortedPromptVersions: sorted,
    };
  }, [promptVersions, promptId]);

  const handleActionClick = (version: PromptVersionSummary, action: 'publish' | 'unpublish' | 'delete') => {
    setVersionToModify(version);
    if (action === 'publish') openPublishModal();
    if (action === 'unpublish') openUnpublishModal();
    if (action === 'delete') openDeleteModal();
  };

  const handleCreateNewVersion = () => {
    if (promptId) {
      createVersionMutation.mutate({ promptId, data: { sourceVersion: 'latest' }}, {
        onSuccess: (newVersion) => {
          navigate(`/prompts/edit/${newVersion.id}/${newVersion.version}`);
        }
      });
    }
  };

  const confirmPublish = () => {
    if (versionToModify) {
      publishMutation.mutate({ promptId: versionToModify.id, version: versionToModify.version }, { onSuccess: closePublishModal });
    }
  };
  
  const confirmUnpublish = () => {
    if (versionToModify) {
      unpublishMutation.mutate({ promptId: versionToModify.id, version: versionToModify.version }, { onSuccess: closeUnpublishModal });
    }
  };

  const confirmDelete = () => {
    if (versionToModify) {
      deleteVersionMutation.mutate({ promptId: versionToModify.id, version: versionToModify.version }, { onSuccess: closeDeleteModal });
    }
  };

  const rows = sortedPromptVersions.map((version, index) => {
    // The list is sorted descending, so the previous version is at the next index.
    const previousVersion = sortedPromptVersions[index + 1];
    return (
        <Table.Tr key={version.version}>
            <Table.Td>
                <Text component={Link} to={`/prompts/edit/${version.id}/${version.version}`} fw={500} c="blue.6">
                    Version {version.version}
                </Text>
            </Table.Td>
            <Table.Td><Badge color={version.isPublished ? 'green' : 'gray'}>{version.isPublished ? 'Published' : 'Draft'}</Badge></Table.Td>
            <Table.Td>{version.updatedAt ? format(new Date(version.updatedAt), 'yyyy-MM-dd HH:mm') : '-'}</Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <Tooltip label={version.isPublished ? 'View Prompt' : 'Edit Prompt'}>
                        <ActionIcon component={Link} to={`/prompts/edit/${version.id}/${version.version}`} variant="subtle">
                            {version.isPublished ? <IconEye size="1rem" /> : <IconPencil size="1rem" />}
                        </ActionIcon>
                    </Tooltip>
                    
                    <Tooltip label="Compare with previous version">
                        <ActionIcon
                            component={Link}
                            to={`/prompts/compare/${version.id}/${previousVersion?.version ?? 0}/${version.version}`}
                            variant="subtle"
                            color="blue"
                            disabled={!previousVersion}
                        >
                            <IconGitCompare size="1rem" />
                        </ActionIcon>
                    </Tooltip>

                    {!version.isPublished && (
                        <Tooltip label="Publish this version">
                            <ActionIcon variant="subtle" color="green" onClick={() => handleActionClick(version, 'publish')}>
                                <IconUpload size="1rem" />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    
                    {version.isPublished && (
                        <Tooltip label="Unpublish this version">
                            <ActionIcon variant="subtle" color="orange" onClick={() => handleActionClick(version, 'unpublish')}>
                                <IconDownloadOff size="1rem" />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    
                    {!version.isPublished && (
                        <Tooltip label="Delete this draft">
                            <ActionIcon variant="subtle" color="red" onClick={() => handleActionClick(version, 'delete')}>
                                <IconTrash size="1rem" />
                            </ActionIcon>
                        </Tooltip>
                    )}
                </Group>
            </Table.Td>
        </Table.Tr>
    );
  });

  return (
    <>
      <PageContainer title={`Manage Versions: ${promptName}`} breadcrumb={<PromptsBreadcrumbs promptId={promptId} promptName={promptName} />} rightSection={<Button onClick={handleCreateNewVersion} leftSection={<IconPlus size="1rem" />} loading={createVersionMutation.isPending}>Create New Version</Button>}>
        <Box pos="relative">
          <LoadingOverlay visible={isLoading} />
          {error && <Alert color="red" title="Error" icon={<IconAlertCircle />}>Could not load prompt versions: {error.message}</Alert>}
          {!isLoading && sortedPromptVersions.length === 0 && <Text c="dimmed" ta="center" p="xl">No versions found for this prompt.</Text>}
          {sortedPromptVersions.length > 0 && <Table.ScrollContainer minWidth={600}><Table striped highlightOnHover verticalSpacing="sm"><Table.Thead><Table.Tr><Table.Th>Version</Table.Th><Table.Th>Status</Table.Th><Table.Th>Last Updated</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rows}</Table.Tbody></Table></Table.ScrollContainer>}
        </Box>
      </PageContainer>
      <Modal opened={publishModal} onClose={closePublishModal} title="Confirm Publish" centered><Text>Are you sure you want to publish <Text span fw={700}>version {versionToModify?.version}</Text> of <Text span fw={700}>&quot;{promptName}&quot;</Text>?</Text><Text c="dimmed" size="sm" mt="sm">This will become the active version. Any other published version will be unpublished.</Text><Group justify="flex-end" mt="xl"><Button variant="default" onClick={closePublishModal}>Cancel</Button><Button color="green" onClick={confirmPublish} loading={publishMutation.isPending}>Publish Version</Button></Group></Modal>
      <Modal opened={unpublishModal} onClose={closeUnpublishModal} title="Confirm Unpublish" centered><Text>Are you sure you want to unpublish <Text span fw={700}>version {versionToModify?.version}</Text>?</Text><Text c="dimmed" size="sm" mt="sm">This will remove the &quot;Published&quot; status, and no version will be active until a new one is published.</Text><Group justify="flex-end" mt="xl"><Button variant="default" onClick={closeUnpublishModal}>Cancel</Button><Button color="orange" onClick={confirmUnpublish} loading={unpublishMutation.isPending}>Unpublish</Button></Group></Modal>
      <Modal opened={deleteModal} onClose={closeDeleteModal} title="Confirm Delete" centered><Text>Are you sure you want to delete <Text span fw={700}>version {versionToModify?.version}</Text>?</Text><Text c="dimmed" size="sm" mt="sm">This action cannot be undone and only applies to draft versions.</Text><Group justify="flex-end" mt="xl"><Button variant="default" onClick={closeDeleteModal}>Cancel</Button><Button color="red" onClick={confirmDelete} loading={deleteVersionMutation.isPending}>Delete Draft</Button></Group></Modal>
    </>
  );
}
