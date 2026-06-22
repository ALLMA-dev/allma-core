import { useMemo, useState } from 'react';
import { SimpleGrid, Paper, Title, Text, Group, Alert, Select, Table, Badge } from '@mantine/core';
import { PageContainer } from '@allma/ui-components';
import { IconAlertCircle, IconStack2, IconX, IconClock, IconCoin } from '@tabler/icons-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { StepType } from '@allma/core-types';
import { format } from 'date-fns';
import { useGetStepStats } from '../../api/stepStatsService';

const StatCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color?: string }) => (
  <Paper withBorder p="md" radius="md">
    <Group justify="space-between">
      <Text c="dimmed">{title}</Text>
      {icon}
    </Group>
    <Text fz={36} fw={700} c={color}>{value}</Text>
  </Paper>
);

const ALL_TYPES = '__ALL__';

const stepTypeOptions = [
  { value: ALL_TYPES, label: 'All step types' },
  ...Object.values(StepType).map((t) => ({ value: t, label: t })),
];

export function StatisticsPage() {
  const [stepType, setStepType] = useState<string>(ALL_TYPES);
  const filterStepType = stepType === ALL_TYPES ? undefined : stepType;
  const { data, isLoading, error } = useGetStepStats({ stepType: filterStepType });

  const byTypeChart = useMemo(
    () => (data?.last7Days.byStepType ?? []).map((b) => ({
      stepType: b.stepType,
      count: b.count,
      failCount: b.failCount,
    })),
    [data],
  );

  const perHourChart = useMemo(
    () => (data?.perHour ?? []).map((b) => ({ label: format(new Date(b.bucketStart), 'HH:mm'), count: b.count })),
    [data],
  );

  const perDayChart = useMemo(
    () => (data?.perDay ?? []).map((b) => ({ label: format(new Date(b.bucketStart), 'MM-dd'), count: b.count })),
    [data],
  );

  const tokens7d = useMemo(() => {
    const buckets = data?.last7Days.byStepType ?? [];
    return buckets.reduce(
      (acc, b) => ({ input: acc.input + b.inputTokens, output: acc.output + b.outputTokens }),
      { input: 0, output: 0 },
    );
  }, [data]);

  const fails7d = (data?.last7Days.byStepType ?? []).reduce((sum, b) => sum + b.failCount, 0);

  const flowRows = (data?.last7Days.byFlow ?? []).map((flow) => (
    <Table.Tr key={flow.flowDefinitionId}>
      <Table.Td><Text size="sm" ff="monospace">{flow.flowDefinitionId}</Text></Table.Td>
      <Table.Td><Text size="sm">{flow.count}</Text></Table.Td>
      <Table.Td>{flow.failCount > 0 ? <Badge color="red" variant="light">{flow.failCount}</Badge> : <Text size="sm" c="dimmed">0</Text>}</Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {flow.byStepType.slice(0, 3).map((t) => `${t.stepType} (${t.count})`).join(', ')}
          {flow.byStepType.length > 3 ? '…' : ''}
        </Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <PageContainer
      title="Step Statistics"
      loading={isLoading}
      rightSection={
        <Select
          data={stepTypeOptions}
          value={stepType}
          onChange={(v) => setStepType(v ?? ALL_TYPES)}
          searchable
          w={260}
          aria-label="Filter by step type"
        />
      }
    >
      {error && (
        <Alert color="red" title="Failed to Load Statistics" icon={<IconAlertCircle />}>
          {error.message}
        </Alert>
      )}
      {data && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
            <StatCard title="Steps (24h)" value={data.last24Hours.totalSteps} icon={<IconStack2 />} />
            <StatCard title="Steps (7d)" value={data.last7Days.totalSteps} icon={<IconClock />} />
            <StatCard title="Failures (7d)" value={fails7d} icon={<IconX />} color={fails7d > 0 ? 'red.6' : undefined} />
            <StatCard title="Tokens (7d) in / out" value={`${tokens7d.input} / ${tokens7d.output}`} icon={<IconCoin />} />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl" mb="xl">
            <Paper withBorder p="md" radius="md">
              <Title order={4} mb="md">Steps by Type (Last 7 Days)</Title>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={byTypeChart} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="stepType" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#15aabf" name="Executions" />
                  <Bar dataKey="failCount" fill="#fa5252" name="Failures" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Title order={4} mb="md">
                Volume per Hour (Last 24h){filterStepType ? ` — ${filterStepType}` : ''}
              </Title>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={perHourChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#7048e8" dot={false} name="Steps" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            <Paper withBorder p="md" radius="md">
              <Title order={4} mb="md">
                Volume per Day (Last 7 Days){filterStepType ? ` — ${filterStepType}` : ''}
              </Title>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={perDayChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#3dc200" name="Steps" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Title order={4} mb="md">Top Flows by Step Volume (Last 7 Days)</Title>
              {flowRows.length > 0 ? (
                <Table.ScrollContainer minWidth={400}>
                  <Table verticalSpacing="xs" striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Flow</Table.Th>
                        <Table.Th>Steps</Table.Th>
                        <Table.Th>Failures</Table.Th>
                        <Table.Th>Top step types</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{flowRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Text c="dimmed" size="sm" ta="center" p="md">No step executions in this window.</Text>
              )}
            </Paper>
          </SimpleGrid>
        </>
      )}
    </PageContainer>
  );
}
