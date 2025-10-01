import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Accordion, Stack, Title } from '@mantine/core';
import { PageContainer, CopyableText } from '@allma/ui-components';
import { useGetFlowConfig } from '../../api/flowService';
import { FlowsBreadcrumbs } from './FlowsBreadcrumbs';
import { FlowSettingsForm } from './components/FlowSettingsForm';
import { FlowVersionList } from './components/FlowVersionList';

export function FlowVersionListPage() {
  const { flowId } = useParams<{ flowId: string }>();
  const { data: flowConfig, isLoading: isConfigLoading } = useGetFlowConfig(flowId);

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

  if (!flowId) {
    return <PageContainer title="Error"><Alert color="red">Flow ID is missing.</Alert></PageContainer>
  }

  return (
    <PageContainer title={titleComponent} breadcrumb={breadcrumbComponent}>
      <Accordion mb="xl">
        <Accordion.Item value="settings">
          <Accordion.Control>Flow Settings</Accordion.Control>
          <Accordion.Panel>
            <FlowSettingsForm flowId={flowId} flowConfig={flowConfig} isLoading={isConfigLoading} />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      <Title order={3} mb="md">Versions</Title>
      <FlowVersionList flowId={flowId} />
    </PageContainer>
  );
}
