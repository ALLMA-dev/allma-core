import { Link } from 'react-router-dom';
import { Table, Button, LoadingOverlay, ActionIcon, Group, Text, Box, Badge } from '@mantine/core';
import { IconSettings, IconPlus, IconTrash, IconTemplate } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { PageContainer, CopyableText } from '@allma/ui-components';
import { useGetStepDefinitions, useDeleteStepDefinition } from '../../api/stepDefinitionService';
import { StepDefinition } from '@allma/core-types';
import { useDisclosure } from '@mantine/hooks';
import { ImportModal } from '../shared/ImportModal';
import { ExportModal } from '../shared/ExportModal';

export function StepDefinitionListPage() {
  const { data: stepDefs, isLoading, error } = useGetStepDefinitions();
  const deleteMutation = useDeleteStepDefinition();
  const [importModalOpened, { open: openImportModal, close: closeImportModal }] = useDisclosure(false);
  const [exportModalOpened, { open: openExportModal, close: closeExportModal }] = useDisclosure(false);

  const openDeleteModal = (stepDef: StepDefinition) => modals.openConfirmModal({
    title: 'Delete Step Definition',
    centered: true,
    children: (<Text size="sm">Are you sure you want to delete &quot;<strong>{stepDef.name}</strong>&quot;? This action is irreversible.</Text>),
    labels: { confirm: 'Delete', cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm: () => deleteMutation.mutate(stepDef.id),
  });

  const rows = stepDefs?.map(def => (
    <Table.Tr key={def.id}>
      <Table.Td>
        <Text component={Link} to={`/step-definitions/edit/${def.id}`} fw={500} c="blue.6">
          {def.name}
        </Text>
        <CopyableText text={def.id} />
      </Table.Td>
      <Table.Td><Badge variant="light" leftSection={<IconTemplate size="1rem" />}>{def.stepType}</Badge></Table.Td>
      <Table.Td><Text truncate maw={400}>{def.description || '-'}</Text></Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon component={Link} to={`/step-definitions/edit/${def.id}`} variant="subtle"><IconSettings size="1rem" /></ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => openDeleteModal(def)}><IconTrash size="1rem" /></ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <PageContainer
        title="Step Definitions"
        rightSection={
          <Group>
            <Button onClick={openImportModal} variant="default">Import</Button>
            <Button onClick={openExportModal} variant="default">Export</Button>
            <Button component={Link} to="/step-definitions/create" leftSection={<IconPlus size="1rem" />}>Create New</Button>
          </Group>
        }
      >
        <Box pos="relative">
          <LoadingOverlay visible={isLoading} />
        {error && <Text c="red">Error: {error.message}</Text>}
        {!isLoading && stepDefs?.length === 0 && (<Text c="dimmed" ta="center" p="xl">No custom step definitions found. Create one to get started.</Text>)}
        {stepDefs && stepDefs.length > 0 && (
          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name / ID</Table.Th>
                  <Table.Th>Step Type</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
        </Box>
      </PageContainer>
      <ImportModal opened={importModalOpened} onClose={closeImportModal} />
      <ExportModal
        opened={exportModalOpened}
        onClose={closeExportModal}
        items={stepDefs || []}
        itemType="step"
      />
    </>
  );
}