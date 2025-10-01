import { useMemo, useState } from 'react';
import { Table, Group, Badge, Text, ActionIcon, Tooltip, Box, LoadingOverlay, Alert, Button, Modal } from '@mantine/core';
import { IconPencil, IconEye, IconPlayerPlay, IconAlertCircle, IconUpload, IconDownloadOff } from '@tabler/icons-react';
import { format } from 'date-fns';
import { useGetFlowConfig, useListFlowVersions, usePublishFlowVersion, useUnpublishFlowVersion, FlowVersionSummary } from '../../../api/flowService';
import { useDisclosure } from '@mantine/hooks';

interface FlowVersionListProps {
  flowId: string;
}

export function FlowVersionList({ flowId }: FlowVersionListProps) {
  const [versionToModify, setVersionToModify] = useState<FlowVersionSummary | null>(null);
  const [publishModal, { open: openPublishModal, close: closePublishModal }] = useDisclosure(false);
  const [unpublishModal, { open: openUnpublishModal, close: closeUnpublishModal }] = useDisclosure(false);

  const { data: flowConfig } = useGetFlowConfig(flowId);
  const { data: flowVersions, isLoading, error } = useListFlowVersions(flowId);
  const publishMutation = usePublishFlowVersion();
  const unpublishMutation = useUnpublishFlowVersion();

  const handleActionClick = (version: FlowVersionSummary, action: 'publish' | 'unpublish') => {
    setVersionToModify(version);
    if (action === 'publish') openPublishModal();
    if (action === 'unpublish') openUnpublishModal();
  };

  const confirmPublish = () => {
    if (versionToModify) {
      publishMutation.mutate({ flowId: versionToModify.id, version: versionToModify.version }, { onSuccess: closePublishModal });
    }
  };

  const confirmUnpublish = () => {
    if (versionToModify) {
      unpublishMutation.mutate({ flowId: versionToModify.id, version: versionToModify.version }, { onSuccess: closeUnpublishModal });
    }
  };

  const sortedVersions = useMemo(() => {
    return [...(flowVersions || [])].sort((a, b) => b.version - a.version)
  }, [flowVersions]);

  const rows = sortedVersions.map(version => (
    <Table.Tr key={version.version}>
      <Table.Td>
        <Text component="a" href={`/flows/edit/${version.id}/${version.version}`} fw={500} c="blue.6">
          Version {version.version}
        </Text>
      </Table.Td>
      <Table.Td><Badge color={version.isPublished ? 'green' : 'gray'}>{version.isPublished ? 'Published' : 'Draft'}</Badge></Table.Td>
      <Table.Td>{version.updatedAt ? format(new Date(version.updatedAt), 'yyyy-MM-dd HH:mm') : '-'}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Tooltip label={version.isPublished ? 'View Flow (Published)' : 'Edit Flow'}><ActionIcon component="a" href={`/flows/edit/${version.id}/${version.version}`} variant="subtle">{version.isPublished ? <IconEye size="1rem" /> : <IconPencil size="1rem" />}</ActionIcon></Tooltip>
          {!version.isPublished && <Tooltip label="Publish this version"><ActionIcon variant="subtle" color="green" onClick={() => handleActionClick(version, 'publish')}><IconUpload size="1rem" /></ActionIcon></Tooltip>}
          {version.isPublished && <Tooltip label="Unpublish this version"><ActionIcon variant="subtle" color="orange" onClick={() => handleActionClick(version, 'unpublish')}><IconDownloadOff size="1rem" /></ActionIcon></Tooltip>}
          <Tooltip label="Run Test Execution"><ActionIcon variant="subtle" color="gray"><IconPlayerPlay size="1rem" /></ActionIcon></Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
        <Box pos="relative">
          <LoadingOverlay visible={isLoading} />
          {error && <Alert color="red" title="Error" icon={<IconAlertCircle />}>Could not load flow versions: {error.message}</Alert>}
          {!isLoading && sortedVersions.length === 0 && <Text c="dimmed" ta="center" p="xl">No versions found for this flow.</Text>}
          {sortedVersions.length > 0 && <Table.ScrollContainer minWidth={600}><Table striped highlightOnHover verticalSpacing="sm"><Table.Thead><Table.Tr><Table.Th>Version</Table.Th><Table.Th>Status</Table.Th><Table.Th>Last Updated</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rows}</Table.Tbody></Table></Table.ScrollContainer>}
        </Box>
      <Modal opened={publishModal} onClose={closePublishModal} title="Confirm Publish" centered><Text>Are you sure you want to publish <Text span fw={700}>version {versionToModify?.version}</Text> of the flow <Text span fw={700}>&quot;{flowConfig?.name}&quot;</Text>?</Text><Text c="dimmed" size="sm" mt="sm">This will become the active version for all new executions. If another version is currently published, it will be unpublished.</Text><Group justify="flex-end" mt="xl"><Button variant="default" onClick={closePublishModal}>Cancel</Button><Button color="green" onClick={confirmPublish} loading={publishMutation.isPending}>Publish Version</Button></Group></Modal>
      <Modal opened={unpublishModal} onClose={closeUnpublishModal} title="Confirm Unpublish" centered><Text>Are you sure you want to unpublish <Text span fw={700}>version {versionToModify?.version}</Text>?</Text><Text c="dimmed" size="sm" mt="sm">This will remove the &quot;Published&quot; status, and there will be no active version for this flow until a new one is published.</Text><Group justify="flex-end" mt="xl"><Button variant="default" onClick={closeUnpublishModal}>Cancel</Button><Button color="orange" onClick={confirmUnpublish} loading={unpublishMutation.isPending}>Unpublish</Button></Group></Modal>
    </>
  );
}
