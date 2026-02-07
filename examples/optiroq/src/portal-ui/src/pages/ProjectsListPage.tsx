// allma-core/examples/optiroq/src/portal-ui/src/pages/ProjectsListPage.tsx
import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card, Text, Badge, Progress,
  SimpleGrid, Title, TextInput, Box, Menu, ActionIcon, Group, Button, Skeleton
} from '@mantine/core';
import {
  IconPlus, IconUpload, IconCirclePlus, IconChevronDown,
  IconSearch, IconTrendingUp, IconClock, IconCheck, IconAlertCircle, IconRefresh, IconLoader, IconArchive, IconDotsVertical, IconTrash
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { useDebounce } from 'use-debounce';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import { AppShell } from '../components/layout/AppShell';
import { ErrorAlert } from '../components/shared/ErrorAlert';
import { useApiView, useApiCommand } from '../hooks/useApi';
import { ProjectsListViewModel, ProjectSummary } from '../types';
import { PageContainer } from '../components/layout/PageContainer';
import { useProjectActions } from '@/hooks/useProjectActions';

const statusConfig: Record<ProjectSummary['status'], { color: string; icon: React.FC<any> }> = {
  ACTIVE: { color: 'green', icon: IconCheck },
  COMPLETED: { color: 'blue', icon: IconCheck },
  PENDING_REVIEW: { color: 'yellow', icon: IconClock },
  DRAFT_AWAITING_REVIEW: { color: 'yellow', icon: IconClock },
  DRAFT: { color: 'gray', icon: IconAlertCircle },
  DRAFT_PROCESSING: { color: 'grape', icon: IconLoader },
  DRAFT_FAILED: { color: 'red', icon: IconAlertCircle },
  ARCHIVED: { color: 'indigo', icon: IconArchive },
};

const getStatusColor = (status: ProjectSummary['status']) => statusConfig[status]?.color || 'gray';

export function ProjectsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['projects_dashboard', 'actions', 'status', 'common']);
  const queryClient = useQueryClient();
  const [visibleProjectsCount, setVisibleProjectsCount] = useState(4);
  const [statusFilter, setStatusFilter] = useState<'All' | ProjectSummary['status']>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const prevProjectsRef = useRef<ProjectSummary[]>([]);
  const { openDeleteModal } = useProjectActions();

  const { data, isLoading, isFetching, refetch, error } = useApiView<ProjectsListViewModel>(
    'projects-list',
    null,
    {
      // Poll every 5 seconds ONLY if there are projects currently processing.
      refetchInterval: (query) => (query.state.data?.projects.some(p => p.status === 'DRAFT_PROCESSING') ? 5000 : false),
    }
  );

  const { mutate: deleteProject } = useApiCommand('project', null);

  useEffect(() => {
    const prevProjects = prevProjectsRef.current;
    if (data?.projects && prevProjects.length > 0) {
      // Check if any project has transitioned *out of* the processing state.
      data.projects.forEach(current => {
        const previous = prevProjects.find(p => p.projectId === current.projectId);
        if (previous && previous.status === 'DRAFT_PROCESSING' && current.status !== 'DRAFT_PROCESSING') {
          const isSuccess = current.status !== 'DRAFT_FAILED';
          notifications.show({
            title: isSuccess ? t('common:Success') : t('common:Error'),
            message: t(isSuccess ? 'projectProcessingSuccess' : 'projectProcessingFailed', { projectId: current.projectId }),
            color: isSuccess ? 'green' : 'red',
          });
          // Invalidate all view queries to ensure data consistency across the app.
          queryClient.invalidateQueries({ queryKey: ['view'] });
        }
      });
    }
    // Update the ref with the latest data for the next check.
    if (data?.projects) {
      prevProjectsRef.current = data.projects;
    }
  }, [data, queryClient, t]);

  const filteredProjects = useMemo(() => {
    if (!data?.projects) return [];
    return data.projects
      .filter(p => statusFilter === 'All' || p.status === statusFilter)
      .filter(p => {
        const query = debouncedSearchQuery.toLowerCase();
        if (!query) return true;
        return (
          p.projectId.toLowerCase().includes(query) ||
          (p.projectName && p.projectName.toLowerCase().includes(query))
        );
      });
  }, [data, statusFilter, debouncedSearchQuery]);

  const visibleProjects = filteredProjects.slice(0, visibleProjectsCount);
  const hasMoreProjects = visibleProjectsCount < filteredProjects.length;

  const handleFilterChange = (filter: typeof statusFilter) => {
    setStatusFilter(filter);
    setVisibleProjectsCount(4); // Reset pagination on filter change
  };
  
  const handleDelete = (project: ProjectSummary) => {
    openDeleteModal(project, () => {
      deleteProject(
        { command: 'deleteProject', idOverride: project.projectId, suppressNotification: true },
        {
          onSuccess: (response: any) => {
            notifications.show({
              title: t('common:Success'),
              message: response.message,
              color: 'green',
            });
            refetch();
          },
        }
      );
    });
  };

  const stats = useMemo(() => {
    const allProjects = data?.projects ?? [];
    return {
      total: allProjects.length,
      active: allProjects.filter(p => p.status === 'ACTIVE').length,
      pending: allProjects.filter(p => p.status === 'PENDING_REVIEW' || p.status === 'DRAFT_AWAITING_REVIEW' || p.status === 'DRAFT_PROCESSING').length,
      completed: allProjects.filter(p => p.status === 'COMPLETED').length,
      draft: allProjects.filter(p => p.status === 'DRAFT').length,
      archived: allProjects.filter(p => p.status === 'ARCHIVED').length,
    };
  }, [data]);

  return (
    <AppShell>
      <PageContainer
        title={t('Projects Dashboard')}
        rightSection={
          <Group>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button leftSection={<IconPlus size={14} />}>{t('actions:New Project')}</Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t('actions:Choose a method')}</Menu.Label>
                <Menu.Item leftSection={<IconUpload size={14} />} onClick={() => navigate('/projects/new/upload')}>
                  {t('actions:Upload BOM')}
                </Menu.Item>
                <Menu.Item leftSection={<IconCirclePlus size={14} />} onClick={() => navigate('/projects/initiation')}>
                  {t('actions:From Scratch')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => refetch()}
              loading={isFetching && !isLoading}
              title={t('refreshProjects')}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Group>
        }
      >
        <Title order={3} mb="md">{t('Current Projects')}</Title>
        <TextInput
          placeholder={t('Search by project number or name...')}
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          mb="md"
        />

        <SimpleGrid cols={{ base: 1, xs: 2, md: 6 }} mb="md">
          <Card withBorder radius="md" p="sm" onClick={() => handleFilterChange('All')} style={{ cursor: 'pointer' }} data-active={statusFilter === 'All' || undefined}>
            <Group><IconTrendingUp /><Text>{t('Total')}: {stats.total}</Text></Group>
          </Card>
          <Card withBorder radius="md" p="sm" onClick={() => handleFilterChange('ACTIVE')} style={{ cursor: 'pointer' }} data-active={statusFilter === 'ACTIVE' || undefined}>
            <Group><IconCheck color="green" /><Text>{t('Active')}: {stats.active}</Text></Group>
          </Card>
          <Card withBorder radius="md" p="sm" onClick={() => handleFilterChange('PENDING_REVIEW')} style={{ cursor: 'pointer' }} data-active={statusFilter === 'PENDING_REVIEW' || undefined}>
            <Group><IconClock color="orange" /><Text>{t('Pending')}: {stats.pending}</Text></Group>
          </Card>
          <Card withBorder radius="md" p="sm" onClick={() => handleFilterChange('COMPLETED')} style={{ cursor: 'pointer' }} data-active={statusFilter === 'COMPLETED' || undefined}>
            <Group><IconCheck color="blue" /><Text>{t('Completed')}: {stats.completed}</Text></Group>
          </Card>
          <Card withBorder radius="md" p="sm" onClick={() => handleFilterChange('DRAFT')} style={{ cursor: 'pointer' }} data-active={statusFilter === 'DRAFT' || undefined}>
            <Group><IconAlertCircle color="gray" /><Text>{t('Draft')}: {stats.draft}</Text></Group>
          </Card>
          <Card withBorder radius="md" p="sm" onClick={() => handleFilterChange('ARCHIVED')} style={{ cursor: 'pointer' }} data-active={statusFilter === 'ARCHIVED' || undefined}>
            <Group><IconArchive color="indigo" /><Text>{t('Archived')}: {stats.archived}</Text></Group>
          </Card>
        </SimpleGrid>

        {error && <ErrorAlert title="Failed to load projects" message={error.message} />}

        {isLoading &&
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={150} radius="md" />)}
          </SimpleGrid>
        }

        {!isLoading && filteredProjects.length === 0 &&
          <Card withBorder p="xl" style={{ textAlign: 'center' }}>
            <Text>{t('No projects found matching your criteria.')}</Text>
            <Button variant="outline" mt="md" onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}>{t('Clear Filters')}</Button>
          </Card>
        }

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {visibleProjects.map((project) => {
            const isProcessing = project.status === 'DRAFT_PROCESSING';
            const isFailed = project.status === 'DRAFT_FAILED';
            const isArchived = project.status === 'ARCHIVED';
            const isClickable = !isProcessing && !isFailed;
            const linkTo = project.status === 'DRAFT' || project.status === 'DRAFT_AWAITING_REVIEW'
              ? `/projects/edit/${project.projectId}`
              : `/projects/${project.projectId}`;

            const CardComponent = isClickable ? Link : 'div';
            const cardProps = isClickable ? { to: linkTo } : {};

            return (
              <Card
                key={project.projectId}
                withBorder
                radius="md"
                p="md"
                component={CardComponent as any}
                {...cardProps}
                style={{
                  cursor: isClickable ? 'pointer' : 'not-allowed',
                  opacity: (isProcessing || isArchived) ? 0.7 : 1,
                  transition: 'opacity 0.2s ease-in-out',
                }}
              >
                <Group justify="space-between" mb="xs">
                  <Text fw={500} size="sm" component="div">{project.projectName ?? t('Untitled Project')}</Text>
                  <Group gap="xs" wrap="nowrap">
                    <Badge
                      color={getStatusColor(project.status)}
                      variant="light"
                      tt="capitalize"
                      leftSection={isProcessing ? <IconLoader size={14} className="animate-spin" /> : undefined}
                    >
                      {t(`status:${project.status}`)}
                    </Badge>
                    {!isArchived && (
                      <Menu shadow="md" width={200} position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon variant="subtle" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(project); }}>
                            {t('actions:Delete Project')}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    )}
                  </Group>
                </Group>
                <Text size="xs" c="dimmed" mb="sm">{t('projectIdentifier', { projectId: project.projectId, customerName: project.customerName ?? t('common:N/A') })}</Text>

                <Group justify="space-between" mb={5}>
                  <Text size="xs" c="dimmed">{t('Progress')}</Text>
                  <Text size="xs" c="dimmed">{isProcessing ? '' : `${project.progressPercentage ?? 0}%`}</Text>
                </Group>
                <Progress
                  value={isProcessing ? 100 : project.progressPercentage ?? 0}
                  size="sm"
                  radius="xl"
                  striped={isProcessing}
                  animated={isProcessing}
                  color={isFailed ? 'red' : undefined}
                />

                <Group justify="space-between" mt="md">
                  <Text size="xs" c="dimmed">{project.supplierCount ?? 0} {t('suppliers')}</Text>
                  <Text size="xs" c="dimmed">{t('Due')}: {project.deadlineDate ? format(new Date(project.deadlineDate), 'PP') : t('common:N/A')}</Text>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>

        {hasMoreProjects && (
          <Group justify="center" mt="xl">
            <Button
              variant="default"
              onClick={() => setVisibleProjectsCount(c => c + 4)}
              rightSection={<IconChevronDown size={14} />}
            >
              {t('See more ({{count}} remaining)', { count: filteredProjects.length - visibleProjectsCount })}
            </Button>
          </Group>
        )}
      </PageContainer>
    </AppShell>
  );
}