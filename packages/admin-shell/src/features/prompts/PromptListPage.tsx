import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Table, Button, LoadingOverlay, ActionIcon, Group, Text, Modal, Tooltip,
  Badge, Box, Stack, TextInput, Textarea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSettings, IconPlus, IconCopy } from '@tabler/icons-react';
import { useGetPrompts, useCreatePrompt, useClonePrompt } from '../../api/promptTemplateService';
import { PageContainer, CopyableText } from '@allma/ui-components';
import { CreatePromptTemplateInput, CreatePromptTemplateInputSchema, ClonePromptInput, ClonePromptInputSchema, PromptTemplateMetadataStorageItem } from '@allma/core-types';
import { useForm, zodResolver } from '@mantine/form';
import { ImportModal } from '../shared/ImportModal';
import { ExportModal } from '../shared/ExportModal';

export function PromptListPage() {
  const navigate = useNavigate();
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [cloneModalOpened, { open: openCloneModal, close: closeCloneModal }] = useDisclosure(false);
  const [importModalOpened, { open: openImportModal, close: closeImportModal }] = useDisclosure(false);
  const [exportModalOpened, { open: openExportModal, close: closeExportModal }] = useDisclosure(false);
  const [promptToClone, setPromptToClone] = useState<PromptTemplateMetadataStorageItem | null>(null);
  
  const { data: allMasterPrompts, isLoading, error } = useGetPrompts();
  const createPromptMutation = useCreatePrompt();
  const clonePromptMutation = useClonePrompt();

  const createForm = useForm({
    initialValues: { name: '', description: '' },
    validate: zodResolver(CreatePromptTemplateInputSchema),
  });

  const cloneForm = useForm({
    initialValues: { name: '' },
    validate: zodResolver(ClonePromptInputSchema),
  });

  const handleCreatePrompt = async (values: CreatePromptTemplateInput) => {
    createPromptMutation.mutate(values, {
      onSuccess: (data) => {
        closeCreateModal();
        createForm.reset();
        navigate(`/prompts/versions/${data.id}`);
      },
    });
  };

  const handleCloneClick = (prompt: PromptTemplateMetadataStorageItem) => {
    setPromptToClone(prompt);
    cloneForm.setFieldValue('name', `Copy of ${prompt.name}`);
    openCloneModal();
  };

  const handleClonePrompt = async (values: ClonePromptInput) => {
    if (!promptToClone) return;
    clonePromptMutation.mutate({ promptId: promptToClone.id, data: values }, {
      onSuccess: (data) => {
        closeCloneModal();
        cloneForm.reset();
        navigate(`/prompts/versions/${data.id}`);
      },
    });
  };

  const displayPrompts = useMemo((): PromptTemplateMetadataStorageItem[] => {
    if (!allMasterPrompts) return [];
    return [...allMasterPrompts].sort((a, b) => a.name.localeCompare(b.name));
  }, [allMasterPrompts]);

  const rows = displayPrompts.map((prompt) => (
    <Table.Tr key={prompt.id}>
      <Table.Td>
        <Text component={Link} to={`/prompts/versions/${prompt.id}`} fw={500} c="blue.6">
          {prompt.name}
        </Text>
        <CopyableText text={prompt.id} />
      </Table.Td>
      <Table.Td><Text truncate maw={400}>{prompt.description || '-'}</Text></Table.Td>
      <Table.Td>{prompt.publishedVersion ? <Badge color="green" variant='light'>v{prompt.publishedVersion} Published</Badge> : <Badge color="gray">No Published Version</Badge>}</Table.Td>
      <Table.Td><Text ta="center">{prompt.latestVersion}</Text></Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Tooltip label="Manage Versions"><ActionIcon component={Link} to={`/prompts/versions/${prompt.id}`} variant="subtle"><IconSettings size="1rem" /></ActionIcon></Tooltip>
          <Tooltip label="Clone Prompt"><ActionIcon variant="subtle" color="gray" onClick={() => handleCloneClick(prompt)}><IconCopy size="1rem" /></ActionIcon></Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <PageContainer
        title="Prompt Templates"
        rightSection={
          <Group>
            <Button onClick={openImportModal} variant="default">Import</Button>
            <Button onClick={openExportModal} variant="default">Export</Button>
            <Button onClick={openCreateModal} leftSection={<IconPlus size="1rem" />}>Create New Prompt</Button>
          </Group>
        }
      >
        <Box pos="relative">
          <LoadingOverlay visible={isLoading} />
          {error && <Text c="red">Error loading prompts: {error.message}</Text>}
          {!isLoading && displayPrompts.length === 0 && (<Text c="dimmed" ta="center" p="xl">No prompts found. Create one to get started!</Text>)}
          {displayPrompts.length > 0 && (
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name / ID</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Published Version</Table.Th>
                    <Table.Th ta="center">Total Versions</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Box>
      </PageContainer>
      <Modal opened={createModalOpened} onClose={closeCreateModal} title="Create New Prompt" centered>
        <form onSubmit={createForm.onSubmit(handleCreatePrompt)}>
          <Stack>
            <TextInput withAsterisk label="Prompt Name" placeholder="e.g., Customer Service Initial Greeting" {...createForm.getInputProps('name')} />
            <Textarea label="Description" placeholder="e.g., The first prompt used to greet a user and ask for their issue." {...createForm.getInputProps('description')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeCreateModal}>Cancel</Button>
              <Button type="submit" loading={createPromptMutation.isPending}>Create Prompt</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <Modal opened={cloneModalOpened} onClose={closeCloneModal} title={`Clone Prompt: ${promptToClone?.name}`} centered>
        <form onSubmit={cloneForm.onSubmit(handleClonePrompt)}>
          <Stack>
            <TextInput withAsterisk label="New Prompt Name" placeholder="Enter name for the cloned prompt" {...cloneForm.getInputProps('name')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeCloneModal}>Cancel</Button>
              <Button type="submit" loading={clonePromptMutation.isPending}>Clone Prompt</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <ImportModal opened={importModalOpened} onClose={closeImportModal} />
      <ExportModal
        opened={exportModalOpened}
        onClose={closeExportModal}
        items={displayPrompts}
        itemType="prompt"
      />
    </>
  );
}