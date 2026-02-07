import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Title, Group, Button, Tabs, Text, Skeleton, ActionIcon, Card, SimpleGrid, Badge, Progress, Box, Alert, Menu } from '@mantine/core';
import { IconPlus, IconCopy, IconRefresh, IconPencil, IconFileText, IconPackage, IconCircleCheck, IconAlertCircle, IconCurrencyEuro, IconAlertTriangle, IconClock, IconPlayerPlay, IconDotsVertical, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, Legend, Bar } from 'recharts';
import { format } from 'date-fns';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';

import { useApiView, useApiCommand } from '@/hooks/useApi';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { ProjectSummaryViewModel, BOMPart, ProjectSummary } from '@optiroq/types';
import { PartsListTable } from '@/features/projects/PartsListTable';
import { useProjectActions } from '@/hooks/useProjectActions';


// Helper to get status badge styling
const getStatusConfig = (status: string, t: Function) => {
  const config: Record<ProjectSummary['status'], { color: string; label: string }> = {
    'ACTIVE': { color: 'green', label: t('status:ACTIVE') },
    'COMPLETED': { color: 'blue', label: t('status:COMPLETED') },
    'PENDING_REVIEW': { color: 'yellow', label: t('status:PENDING_REVIEW') },
    'DRAFT_AWAITING_REVIEW': { color: 'yellow', label: t('status:DRAFT_AWAITING_REVIEW') },
    'DRAFT': { color: 'gray', label: t('status:DRAFT') },
    'ARCHIVED': { color: 'indigo', label: t('status:ARCHIVED') },
    'DRAFT_PROCESSING': { color: 'grape', label: t('status:DRAFT_PROCESSING') },
    'DRAFT_FAILED': { color: 'red', label: t('status:DRAFT_FAILED') },
  };
  return config[status as keyof typeof config] || { color: 'gray', label: status };
};


export function ProjectSummaryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['project_summary', 'projects_dashboard', 'actions', 'status', 'common']);

  const { data, isLoading, isFetching, refetch, error } = useApiView<ProjectSummaryViewModel>(
    'project-summary',
    projectId!
  );
  
  const { mutate: deleteProject } = useApiCommand('project', projectId);
  const { openDeleteModal } = useProjectActions();

  const { mutate: createRfq, isPending: isCreatingRfq } = useApiCommand('project', projectId);

  const handleDelete = () => {
    if (!data?.project) return;
    openDeleteModal(data.project, () => {
      deleteProject({
        command: 'deleteProject',
        suppressNotification: true
      }, {
        onSuccess: (response: any) => {
          notifications.show({
            title: t('common:Success'),
            message: response.message,
            color: 'green',
          });
          navigate('/projects');
        }
      });
    });
  };

  const stats = useMemo(() => {
    if (!data) return null;
    const { project, bomParts } = data;

    const existingParts = bomParts.filter(p => p.partStatus === 'EXISTING');
    const newParts = bomParts.filter(p => p.partStatus === 'NEW');

    const existingPartsCost = existingParts.reduce((sum, p) => {
      const price = typeof p.existingPartDetails?.currentPrice === 'number' ? p.existingPartDetails.currentPrice : 0;
      return sum + price * (p.quantity || 0);
    }, 0);

    const completedNewParts = newParts.filter(p => p.rfqStatus === 'COMPLETED');
    const completedNewPartsCost = completedNewParts.reduce((sum, p) => {
        const price = typeof p.bestQuotePrice === 'number' ? p.bestQuotePrice : 0;
        return sum + price * (p.quantity || 0);
    }, 0);

    const totalKnownCost = existingPartsCost + completedNewPartsCost;

    const rfqNotStarted = newParts.filter(p => !p.rfqStatus || p.rfqStatus === 'NOT_STARTED').length;
    const rfqInProgress = newParts.filter(p => p.rfqStatus === 'IN_PROGRESS').length;
    const rfqCompleted = newParts.filter(p => p.rfqStatus === 'COMPLETED').length;

    return {
      totalParts: bomParts.length,
      existingPartsCount: existingParts.length,
      newPartsCount: newParts.length,
      existingPartsCost,
      completedNewPartsCost,
      totalKnownCost,
      hasPendingRfqs: rfqNotStarted + rfqInProgress > 0,
      rfqNotStarted,
      rfqInProgress,
      rfqCompleted,
    };
  }, [data]);

  const handleRfqAction = (part: BOMPart, action: 'start' | 'review' | 'view_summary') => {
    if (action === 'start') {
        createRfq({
            command: 'createRfq',
            payload: { parts: [part.partName] }, // Start with one part
            suppressNotification: true,
        }, {
            onSuccess: (response: any) => {
                notifications.show({
                    title: t('rfqCreatedTitle'),
                    message: t('rfqCreatedMessage', { rfqId: response.rfqId }),
                    color: 'green',
                });
                navigate(`/rfqs/${response.rfqId}/edit`);
            },
        });
    } else { // 'review' or 'view_summary'
        if (part.rfqId) {
            navigate(`/rfqs/${part.rfqId}/edit`);
        } else {
            notifications.show({
                title: t('common:Error'),
                message: t('rfqIdMissingError'),
                color: 'red',
            });
        }
    }
  };


  if (isLoading || !stats) {
    return (
      <AppShell>
        <PageContainer title={<Skeleton height={30} width="60%" />} loading>
          <SimpleGrid cols={4}><Skeleton height={80} /><Skeleton height={80} /><Skeleton height={80} /><Skeleton height={80} /></SimpleGrid>
          <Skeleton height={300} mt="md" />
          <Skeleton height={200} mt="md" />
        </PageContainer>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <PageContainer title={t('common:Error')}>
          <ErrorAlert title={t('errorLoadingTitle')} message={error?.message} />
        </PageContainer>
      </AppShell>
    );
  }

  const { project, bomParts, quoteDetails } = data; // Assuming `quoteDetails` has master fields for the table
  const statusConfig = getStatusConfig(project.status, t);

  return (
    <AppShell>
      <PageContainer
        title={project.projectName}
        loading={isFetching && !isLoading}
        rightSection={
          <Group>
            <Button leftSection={<IconPencil size={14} />} variant="default" onClick={() => navigate(`/projects/edit/${projectId}`)}>
              {t('actions:Edit Project')}
            </Button>
            <Button leftSection={<IconPlus size={14} />} variant="default">{t('actions:Create RFQ')}</Button>
            <ActionIcon variant="default" size="lg" onClick={() => refetch()} loading={isFetching && !isLoading} title={t('refreshProject')}>
              <IconRefresh size={18} />
            </ActionIcon>
            <Menu shadow="md" width={200} position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="default" size="lg" aria-label={t('More options')}><IconDotsVertical size={18} /></ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconCopy size={14} />}>{t('actions:Clone Project')}</Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={handleDelete}>
                  {t('actions:Delete Project')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        }
      >
        <Tabs defaultValue="summary">
          <Tabs.List>
            <Tabs.Tab value="summary">{t('projectSummary')}</Tabs.Tab>
            <Tabs.Tab value="comparison">{t('comparisonBoard')}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="summary" pt="lg">
            <SimpleGrid cols={{ base: 1, md: 4 }} mb="md">
                <Card withBorder p="md"><Group><IconPackage size={28} className="text-blue-600"/><Box><Text size="xl" fw={700}>{stats.totalParts}</Text><Text size="sm" c="dimmed">{t('totalParts')}</Text></Box></Group></Card>
                <Card withBorder p="md"><Group><IconCircleCheck size={28} className="text-green-600"/><Box><Text size="xl" fw={700}>{stats.existingPartsCount}</Text><Text size="sm" c="dimmed">{t('existingParts')}</Text></Box></Group></Card>
                <Card withBorder p="md"><Group><IconAlertCircle size={28} className="text-orange-600"/><Box><Text size="xl" fw={700}>{stats.newPartsCount}</Text><Text size="sm" c="dimmed">{t('newParts')}</Text></Box></Group></Card>
                <Card withBorder p="md"><Group><IconCurrencyEuro size={28} className={stats.hasPendingRfqs ? "text-yellow-600" : "text-green-600"}/><Box><Text size="xl" fw={700}>{(stats.totalKnownCost / 1_000_000).toFixed(2)}M</Text><Text size="sm" c="dimmed">{t(stats.hasPendingRfqs ? 'totalKnownCost' : 'totalCost')}</Text></Box></Group></Card>
            </SimpleGrid>

            <Card withBorder p="lg" mb="md">
              <Group justify="space-between" align="flex-start">
                  <Box>
                      <Title order={3}>{t('projectDetails')}</Title>
                      <Text c="dimmed">{t('projects_dashboard:projectIdentifier', {projectId: project.projectId, customerName: project.customerName})}</Text>
                  </Box>
                  <Badge color={statusConfig.color} variant="light" size="lg">{statusConfig.label}</Badge>
              </Group>

              <SimpleGrid cols={{base: 1, sm: 3}} mt="md">
                  <Box><Text size="xs" c="dimmed" tt="uppercase">{t('platform')}</Text><Text>{project.platformName || 'N/A'}</Text></Box>
                  <Box><Text size="xs" c="dimmed" tt="uppercase">{t('commodity')}</Text><Text>{project.commodity || 'N/A'}</Text></Box>
                  <Box><Text size="xs" c="dimmed" tt="uppercase">{t('deadline')}</Text><Text>{project.deadlineDate ? format(new Date(project.deadlineDate), 'PP') : 'N/A'}</Text></Box>
              </SimpleGrid>
            </Card>
            
            <Card withBorder p="lg" mb="md">
              <Title order={4} mb="md">{t('costAnalysis')}</Title>
              {stats.hasPendingRfqs && <Alert color="yellow" icon={<IconAlertTriangle size={16}/>} title={t('incompleteCostTitle')} mb="md">{t('incompleteCostMessage', { count: stats.rfqInProgress + stats.rfqNotStarted })}</Alert>}
              {/* Cost charts would go here */}
            </Card>

            <Card withBorder p="lg" mb="md">
              <Title order={4} mb="md">{t('rfqStatusSummary')}</Title>
              <SimpleGrid cols={{base: 1, sm: 3}}>
                <Box><Group><IconPlayerPlay size={20} className="text-gray-500"/><Text fw={500}>{t('notStarted')}:</Text><Text>{stats.rfqNotStarted}</Text></Group></Box>
                <Box><Group><IconClock size={20} className="text-blue-500"/><Text fw={500}>{t('inProgress')}:</Text><Text>{stats.rfqInProgress}</Text></Group></Box>
                <Box><Group><IconCircleCheck size={20} className="text-green-500"/><Text fw={500}>{t('completed')}:</Text><Text>{stats.rfqCompleted}</Text></Group></Box>
              </SimpleGrid>
              <Progress.Root size="lg" mt="md">
                <Progress.Section value={(stats.rfqCompleted / stats.newPartsCount) * 100} color="green" />
                <Progress.Section value={(stats.rfqInProgress / stats.newPartsCount) * 100} color="blue" />
              </Progress.Root>
            </Card>

            <Card withBorder p="lg">
              <Title order={4} mb="md">{t('partsList')}</Title>
              {/* The master fields required by the table should come from the view model */}
              <PartsListTable parts={bomParts} partFields={quoteDetails?.uiPayload || []} variant="summary" onRfqAction={handleRfqAction} />
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="comparison" pt="lg">
            <Text>{t('comparisonBoardContent')}</Text>
          </Tabs.Panel>
        </Tabs>
      </PageContainer>
    </AppShell>
  );
}