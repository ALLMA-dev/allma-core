import React from 'react';
import { useRoutes, Navigate } from 'react-router-dom';
import { Container, Paper, Title, Button, Loader, Group, Text } from '@mantine/core';
import { IconAlertCircle, IconGauge, IconListDetails, IconActivity, IconPrompt, IconTemplate } from '@tabler/icons-react';
import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react';
import { ADMIN_COGNITO_GROUP_NAME } from '@allma/core-sdk';
import { useAdminAuth } from './hooks/useAdminAuth';
import { AdminLayout } from './features/layout/AdminLayout';
import { AdminPermission } from '@allma/core-types';
import type { AllmaPlugin, PluginNavItem } from './types/plugin.ts';
import { DashboardPage } from './features/dashboard/DashboardPage.tsx';
import { StepDefinitionListPage } from './features/step-definitions/StepDefinitionListPage.tsx';
import { FlowListPage } from './features/flows/FlowListPage.tsx';
import { FlowEditorPage } from './features/flows/editor/FlowEditorPage.tsx';
import { FlowVersionListPage } from './features/flows/FlowVersionListPage.tsx';
import { ExecutionListPage } from './features/executions/ExecutionListPage.tsx';
import { ExecutionDetailPage } from './features/executions/ExecutionDetailPage.tsx';
import { PromptListPage } from './features/prompts/PromptListPage.tsx';
import { PromptEditPage } from './features/prompts/PromptEditPage.tsx';
import { PromptCreatePage } from './features/prompts/PromptCreatePage.tsx';
import { PromptVersionListPage } from './features/prompts/PromptVersionListPage.tsx';
import { PromptComparePage } from './features/prompts/PromptComparePage.tsx';
import { StepDefinitionCreatePage } from './features/step-definitions/StepDefinitionCreatePage.tsx';
import { StepDefinitionEditPage } from './features/step-definitions/StepDefinitionEditPage.tsx';

interface AuthenticatedAppProps {
  plugins: AllmaPlugin[];
}

// This component is rendered only when the user is authenticated by the <Authenticator> wrapper.
function ProtectedApp({ plugins }: AuthenticatedAppProps) {
  const { signOut } = useAuthenticator();
  const { isLoading, error, authContext } = useAdminAuth();

  if (isLoading) {
    return (
      <Container size="sm" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <Paper shadow="md" p="xl" withBorder>
          <Group justify="center">
            <Loader />
            <Text>Verifying access...</Text>
          </Group>
        </Paper>
      </Container>
    );
  }

  if (error || !authContext || !authContext.cognitoGroups.includes(ADMIN_COGNITO_GROUP_NAME)) {
    return (
      <Container size="sm" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <Paper shadow="md" p="xl" withBorder>
          <Title order={1} c="red.7" mb="md">
            <IconAlertCircle size="2.5rem" style={{ verticalAlign: 'middle', marginRight: '10px' }} />
            Access Denied
          </Title>
          <Text mb="lg">
            {error?.message || 'You do not have sufficient permissions to access the Admin Panel.'}
            <br />
            Please contact your administrator if you believe this is an error.
          </Text>
          <Button onClick={signOut} color="red" variant="outline">
            Sign Out
          </Button>
        </Paper>
      </Container>
    );
  }

  // --- Process plugins to build routes, nav items, and widgets ---
  const coreNavLinks: (PluginNavItem & { permission: AdminPermission, icon: React.ComponentType<{ size: string }> })[] = [
    { label: 'Dashboard', path: '/dashboard', icon: IconGauge, permission: AdminPermission.DASHBOARD_VIEW },
    { label: 'Step Definitions', path: '/step-definitions', icon: IconTemplate, permission: AdminPermission.DEFINITIONS_READ },
    { label: 'Flows', path: '/flows', icon: IconListDetails, permission: AdminPermission.DEFINITIONS_READ },
    { label: 'Executions', path: '/executions', icon: IconActivity, permission: AdminPermission.EXECUTIONS_READ },
    { label: 'Prompts', path: '/prompts', icon: IconPrompt, permission: AdminPermission.DEFINITIONS_READ },
  ];

  const pluginNavItems = plugins.flatMap(p => p.getNavItems ? p.getNavItems() : []);
  
  const allNavLinks = [...coreNavLinks, ...pluginNavItems];

  // Filter nav items based on user permissions
  const accessibleNavItems = allNavLinks.filter(item => 
    authContext.hasPermission((item as any).permission)
  );

  const AppRoutes = () => {
    const pluginRoutes = plugins.flatMap(p => p.getRoutes ? p.getRoutes() : []);

    const coreRoutes = [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/step-definitions', element: <StepDefinitionListPage /> },
      { path: '/step-definitions/create', element: <StepDefinitionCreatePage /> },
      { path: '/step-definitions/edit/:stepDefinitionId', element: <StepDefinitionEditPage /> },
      { path: '/flows', element: <FlowListPage /> },
      { path: 'flows/versions/:flowId', element: <FlowVersionListPage /> },
      { path: 'flows/edit/:flowId/:version', element: <FlowEditorPage /> },
      { path: '/executions', element: <ExecutionListPage /> },
      { path: '/executions/:flowExecutionId', element: <ExecutionDetailPage /> },
      { path: '/prompts', element: <PromptListPage /> },
      { path: 'prompts/versions/:promptId', element: <PromptVersionListPage /> },
      { path: 'prompts/create', element: <PromptCreatePage /> },
      { path: 'prompts/edit/:promptId/:versionNumber', element: <PromptEditPage /> },
      { path: 'prompts/compare/:promptId/:leftVersion/:rightVersion', element: <PromptComparePage /> },
    ];

    return useRoutes([...coreRoutes, ...pluginRoutes, { path: '*', element: <Navigate to="/dashboard" replace /> }]);
  };

  return (
    <AdminLayout navItems={accessibleNavItems}>
      <AppRoutes />
    </AdminLayout>
  );
}

/**
 * The main AuthenticatedApp component.
 * It uses the Amplify Authenticator component to handle the entire sign-in flow.
 * Once a user is authenticated, it renders the ProtectedApp which contains the
 * core application logic.
 */
export function AuthenticatedApp({ plugins }: AuthenticatedAppProps) {
  return (
    <Authenticator>
      <ProtectedApp plugins={plugins} />
    </Authenticator>
  );
}
