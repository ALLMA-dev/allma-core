import { SimpleGrid, Paper, Title, Text, Group, Alert, useMantineTheme, Table } from '@mantine/core';
import { PageContainer } from '@allma/ui-components';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useGetDashboardStats } from '../../api/dashboardService';
import { IconAlertCircle, IconCheck, IconClock, IconPlayerPlay, IconX } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatusBreakdown } from '@allma/core-types';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color?: string }) => (
  <Paper withBorder p="md" radius="md">
    <Group justify="space-between">
      <Text c="dimmed">{title}</Text>
      {icon}
    </Group>
    <Text fz={36} fw={700} c={color}>{value}</Text>
  </Paper>
);

const statusColors: Record<keyof StatusBreakdown, string> = {
    COMPLETED: '#3dc200ff', // green
    FAILED: '#fa5252', // red
    RUNNING: '#15aabf', // cyan
    TIMED_OUT: '#fd7e14', // orange
    CANCELLED: '#868e96', // gray
};

export function DashboardPage() {
  const { authContext } = useAdminAuth();
  const theme = useMantineTheme();
  const { data, isLoading, error } = useGetDashboardStats();

  const recentFailureRows = data?.recentFailures.map((failure) => (
    <Table.Tr key={failure.flowExecutionId}>
      <Table.Td>
        <Link to={`/executions/${failure.flowExecutionId}`}>
            <Text variant="link" c="blue.6" size="sm" ff="monospace">{failure.flowExecutionId.substring(0,8)}...</Text>
        </Link>
      </Table.Td>
      <Table.Td><Text size="sm">{failure.flowDefinitionId} (v{failure.flowDefinitionVersion})</Text></Table.Td>
      <Table.Td><Text size="sm" c="red">{failure.errorName}</Text></Table.Td>
      <Table.Td><Text size="sm">{format(new Date(failure.startTime), 'yyyy-MM-dd HH:mm')}</Text></Table.Td>
    </Table.Tr>
  ));

  const chartData = data ? [
    {
      name: 'Status Breakdown (7 Days)',
      ...data.last7Days.statusBreakdown
    }
  ] : [];

  return (
    <PageContainer title={`Welcome, ${authContext?.username || 'Admin'}!`} loading={isLoading}>
      {error && (
         <Alert color="red" title="Failed to Load Dashboard" icon={<IconAlertCircle />}>
          {error.message}
        </Alert>
      )}
      {data && (
        <>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
                <StatCard title="Executions (24h)" value={data.last24Hours.totalExecutions} icon={<IconPlayerPlay />} />
                <StatCard title="Successful (24h)" value={data.last24Hours.statusBreakdown.COMPLETED} icon={<IconCheck color={theme.colors.green[6]}/>} color={theme.colors.green[6]}/>
                <StatCard title="Failed (24h)" value={data.last24Hours.statusBreakdown.FAILED} icon={<IconX color={theme.colors.red[6]} />} color={theme.colors.red[6]}/>
                <StatCard title="Avg Duration (24h)" value={`${(data.last24Hours.averageDurationMs / 1000).toFixed(2)}s`} icon={<IconClock />} />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
                <Paper withBorder p="md" radius="md">
                <Title order={4} mb="md">Execution Status (Last 7 Days)</Title>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={10} tick={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} />
                    <Legend />
                    <Bar dataKey="COMPLETED" stackId="a" fill={statusColors.COMPLETED} name="Completed" />
                    <Bar dataKey="FAILED" stackId="a" fill={statusColors.FAILED} name="Failed" />
                    <Bar dataKey="RUNNING" stackId="a" fill={statusColors.RUNNING} name="Running" />
                    <Bar dataKey="TIMED_OUT" stackId="a" fill={statusColors.TIMED_OUT} name="Timed Out" />
                    </BarChart>
                </ResponsiveContainer>
                </Paper>

                <Paper withBorder p="md" radius="md">
                    <Title order={4} mb="md">Recent Failures</Title>
                    {data.recentFailures.length > 0 ? (
                        <Table.ScrollContainer minWidth={400}>
                            <Table verticalSpacing="xs" striped>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Execution ID</Table.Th>
                                        <Table.Th>Flow</Table.Th>
                                        <Table.Th>Error</Table.Th>
                                        <Table.Th>Time</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>{recentFailureRows}</Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                    ) : (
                        <Text c="dimmed" size="sm" ta="center" p="md">No failed executions in the recent past.</Text>
                    )}
                </Paper>
            </SimpleGrid>
        </>
      )}
    </PageContainer>
  );
}