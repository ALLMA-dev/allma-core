import { useState, useMemo } from 'react';
import { Table, TextInput, MultiSelect, Group, Badge, Text, ActionIcon, Tooltip, Box, LoadingOverlay, Button, Modal, Stack, Textarea } from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { IconSearch, IconTag, IconSettings, IconPlus, IconCopy } from '@tabler/icons-react';
import { PageContainer, CopyableText } from '@allma/ui-components';
import { useGetFlows, useCreateFlow, useCloneFlow } from '../../api/flowService';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, zodResolver } from '@mantine/form';
import { CreateFlowInputSchema, CloneFlowInputSchema, CloneFlowInput, FlowMetadataStorageItem } from '@allma/core-types';
import { ImportModal } from '../shared/ImportModal';
import { ExportModal } from '../shared/ExportModal';

export function FlowListPage() {
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [debouncedSearch] = useDebouncedValue(searchText, 300);
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [cloneModalOpened, { open: openCloneModal, close: closeCloneModal }] = useDisclosure(false);
  const [importModalOpened, { open: openImportModal, close: closeImportModal }] = useDisclosure(false);
  const [exportModalOpened, { open: openExportModal, close: closeExportModal }] = useDisclosure(false);
  const [flowToClone, setFlowToClone] = useState<FlowMetadataStorageItem | null>(null);
  
  const navigate = useNavigate();

  const { data: masterFlows, isLoading, error } = useGetFlows({
    searchText: debouncedSearch,
    tag: selectedTags.length > 0 ? selectedTags[0] : undefined, // API currently supports one tag
  });
  
  const createFlowMutation = useCreateFlow();
  const cloneFlowMutation = useCloneFlow();

  const createForm = useForm({
    initialValues: { name: '', description: '' },
    validate: zodResolver(CreateFlowInputSchema),
  });

  const cloneForm = useForm({
    initialValues: { name: '' },
    validate: zodResolver(CloneFlowInputSchema),
  });

  const handleCreateFlow = async (values: { name: string, description: string }) => {
    createFlowMutation.mutate(values, {
      onSuccess: (data) => {
        closeCreateModal();
        createForm.reset();
        navigate(`/flows/versions/${data.id}`);
      },
    });
  };

  const handleCloneClick = (flow: FlowMetadataStorageItem) => {
    setFlowToClone(flow);
    cloneForm.setFieldValue('name', `Copy of ${flow.name}`);
    openCloneModal();
  };

  const handleCloneFlow = async (values: CloneFlowInput) => {
    if (!flowToClone) return;
    cloneFlowMutation.mutate({ flowId: flowToClone.id, data: values }, {
      onSuccess: (data) => {
        closeCloneModal();
        cloneForm.reset();
        navigate(`/flows/versions/${data.id}`);
      },
    });
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    masterFlows?.forEach(flow => {
      flow.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [masterFlows]);


  const rows = masterFlows?.map(flow => (
    <Table.Tr key={flow.id}>
      <Table.Td>
        <Text component={Link} to={`/flows/versions/${flow.id}`} fw={500} c="blue.6">
          {flow.name}
        </Text>
        <CopyableText text={flow.id} />
      </Table.Td>
      <Table.Td><Text truncate maw={400}>{flow.description || '-'}</Text></Table.Td>
      <Table.Td>
        <Group gap="xs">
            {flow.tags?.map(tag => <Badge key={tag} variant="light">{tag}</Badge>)}
        </Group>
      </Table.Td>
      <Table.Td>{flow.publishedVersion ? <Badge color="green" variant='light'>v{flow.publishedVersion}</Badge> : <Badge color="gray">No Published Version</Badge>}</Table.Td>
      <Table.Td><Text ta="center">{flow.latestVersion}</Text></Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Tooltip label="Manage Versions & Settings"><ActionIcon component={Link} to={`/flows/versions/${flow.id}`} variant="subtle"><IconSettings size="1rem" /></ActionIcon></Tooltip>
          <Tooltip label="Clone Flow"><ActionIcon onClick={() => handleCloneClick(flow)} variant="subtle" color="gray"><IconCopy size="1rem" /></ActionIcon></Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <PageContainer
        title="Allma Flows"
        rightSection={
          <Group>
            <Button onClick={openImportModal} variant="default">Import</Button>
            <Button onClick={openExportModal} variant="default">Export</Button>
            <Button onClick={openCreateModal} leftSection={<IconPlus size="1rem" />}>Create New Flow</Button>
          </Group>
        }
      >
        <Group mb="md"><TextInput placeholder="Search by name or description..." leftSection={<IconSearch size="1rem" />} value={searchText} onChange={(event) => setSearchText(event.currentTarget.value)} style={{ flex: 1 }} /><MultiSelect placeholder="Filter by tags" leftSection={<IconTag size="1rem" />} data={allTags} value={selectedTags} onChange={setSelectedTags} clearable /></Group>
        <Box pos="relative"><LoadingOverlay visible={isLoading} />{error && <Text c="red">Error loading flows: {error.message}</Text>}{!isLoading && masterFlows?.length === 0 && (<Text c="dimmed" ta="center" p="xl">No flows found matching your criteria.</Text>)}{masterFlows && masterFlows.length > 0 && (<Table.ScrollContainer minWidth={800}><Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead><Table.Tr><Table.Th>Name / ID</Table.Th><Table.Th>Description</Table.Th><Table.Th>Tags</Table.Th><Table.Th>Published Version</Table.Th><Table.Th ta="center">Total Versions</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rows}</Table.Tbody></Table></Table.ScrollContainer>)}</Box>
      </PageContainer>
      <Modal opened={createModalOpened} onClose={closeCreateModal} title="Create New Flow" centered>
        <form onSubmit={createForm.onSubmit(handleCreateFlow)}>
          <Stack>
            <TextInput withAsterisk label="Flow Name" placeholder="e.g., Customer Onboarding" {...createForm.getInputProps('name')} />
            <Textarea label="Description" placeholder="e.g., Handles the initial welcome and setup for new users." {...createForm.getInputProps('description')} />
            <Group justify="flex-end" mt="md"><Button variant="default" onClick={closeCreateModal}>Cancel</Button><Button type="submit" loading={createFlowMutation.isPending}>Create Flow</Button></Group>
          </Stack>
        </form>
      </Modal>
      <Modal opened={cloneModalOpened} onClose={closeCloneModal} title={`Clone Flow: ${flowToClone?.name}`} centered>
        <form onSubmit={cloneForm.onSubmit(handleCloneFlow)}>
          <Stack>
            <TextInput withAsterisk label="New Flow Name" placeholder="Enter name for the cloned flow" {...cloneForm.getInputProps('name')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeCloneModal}>Cancel</Button>
              <Button type="submit" loading={cloneFlowMutation.isPending}>Clone Flow</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <ImportModal opened={importModalOpened} onClose={closeImportModal} />
      <ExportModal
        opened={exportModalOpened}
        onClose={closeExportModal}
        items={masterFlows || []}
        itemType="flow"
      />
    </>
  );
}
