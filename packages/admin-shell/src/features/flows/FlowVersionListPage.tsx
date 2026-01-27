import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Accordion, Stack, Title, Text, Group, Button } from '@mantine/core';
import { PageContainer, CopyableText } from '@allma/ui-components';
import { IconSettings, IconPlus } from '@tabler/icons-react';
import { useGetFlowConfig, useCreateFlowVersion } from '../../api/flowService';
import { FlowsBreadcrumbs } from './FlowsBreadcrumbs';
import { FlowSettingsForm } from './components/FlowSettingsForm';
import { FlowVersionList } from './components/FlowVersionList';
import { FlowExecutionsList } from './../executions/components/FlowExecutionsList';

export function FlowVersionListPage() {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const { data: flowConfig, isLoading: isConfigLoading } = useGetFlowConfig(flowId);
  const createVersionMutation = useCreateFlowVersion();

  const titleComponent = useMemo(() => (
    <Stack gap={0} align="flex-start">
      <Title order={2}>
        {`Flow: ${flowConfig?.name || '...'}`}
      </Title>
      {flowId && <CopyableText text={flowId} size="sm" />}
    </Stack>
    // Depend on the primitive 'name' property to prevent re-renders from unstable object references.
  ), [flowConfig?.name, flowId]);

  const breadcrumbComponent = useMemo(() => (
    <FlowsBreadcrumbs flowId={flowId} flowName={flowConfig?.name} />
  ), [flowId, flowConfig?.name]);

  const handleCreateNewVersion = () => {
    if (flowId) {
      createVersionMutation.mutate({ flowId, data: { sourceVersion: 'latest' }}, {
        onSuccess: (newVersion) => {
          navigate(`/flows/edit/${newVersion.id}/${newVersion.version}`);
        }
      });
    }
  };

  if (!flowId) {
    return <PageContainer title="Error"><Alert color="red">Flow ID is missing.</Alert></PageContainer>;
  }

  return (
    <PageContainer
      title={titleComponent}
      breadcrumb={breadcrumbComponent}
      rightSection={
        <Button
          onClick={handleCreateNewVersion}
          leftSection={<IconPlus size="1rem" />}
          loading={createVersionMutation.isPending}
        >
          Create New Version
        </Button>
      }
    >
      <Accordion variant="separated" mb="xl">
        <Accordion.Item value="settings">
            <Accordion.Control icon={<IconSettings size="1.2rem" />}>
                <Stack gap={0}>
                    <Text fw={500} size="md">Flow Settings</Text>
                    <Text size="xs" c="dimmed">Edit the name, description, tags, and shared variables for this flow.</Text>
                </Stack>
            </Accordion.Control>
          <Accordion.Panel>
            <FlowSettingsForm flowId={flowId} flowConfig={flowConfig} isLoading={isConfigLoading} />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      
      <Title order={3} mb="md">Versions</Title>
      <FlowVersionList flowId={flowId} />

      <FlowExecutionsList flowId={flowId} />
    </PageContainer>
  );
}