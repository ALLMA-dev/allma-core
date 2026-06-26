import { Badge, Group, Paper, Progress, Text, Tooltip } from '@mantine/core';
import { IconClockPause } from '@tabler/icons-react';
import { useGetExecutionProgress } from '../../../api/executionService';

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'];

interface ExecutionProgressBarProps {
    flowExecutionId: string;
}

/**
 * Compact, self-refreshing progress indicator for a running execution. Shows the current
 * step / checkpoint stage, a percentage, and a "waiting" badge when the flow is paused on an
 * external event or long poll. Polling is handled by the underlying query and stops on terminal
 * status, so this renders a static final state once the execution finishes.
 */
export function ExecutionProgressBar({ flowExecutionId }: ExecutionProgressBarProps) {
    const { data, isLoading } = useGetExecutionProgress(flowExecutionId);

    // Nothing to show until the first response arrives (avoids a layout flash).
    if (isLoading || !data) return null;

    const { root, headline } = data;
    const isTerminal = TERMINAL_STATUSES.includes(root.status);
    const isFailed = root.status === 'FAILED' || root.status === 'TIMED_OUT' || root.status === 'CANCELLED';

    const stepsLabel =
        root.totalCheckpoints && root.totalCheckpoints > 0
            ? `Stage ${root.currentCheckpoint?.ordinal ?? 0} of ${root.totalCheckpoints}`
            : root.totalStepCount && root.totalStepCount > 0
                ? `${root.completedStepCount} of ${root.totalStepCount} steps`
                : `${root.completedStepCount} steps done`;

    const color = isFailed ? 'red' : root.status === 'COMPLETED' ? 'green' : 'blue';

    return (
        <Paper withBorder p="sm" radius="md" mb="md">
            <Group justify="space-between" mb={6} wrap="nowrap">
                <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                    <Text fw={600} size="sm" truncate>
                        {headline.label}
                    </Text>
                    {root.isWaiting && (
                        <Tooltip label="Paused waiting for an external event or long-running poll">
                            <Badge color="yellow" variant="light" leftSection={<IconClockPause size={12} />}>
                                Waiting
                            </Badge>
                        </Tooltip>
                    )}
                    {!isTerminal && !root.isWaiting && (
                        <Badge color="blue" variant="light">
                            Running
                        </Badge>
                    )}
                </Group>
                <Text fw={700} size="sm" c={color} style={{ flexShrink: 0 }}>
                    {root.progressPercent}%
                </Text>
            </Group>
            <Progress
                value={root.progressPercent}
                color={color}
                striped={!isTerminal}
                animated={!isTerminal && !root.isWaiting}
                radius="xl"
            />
            <Group justify="space-between" mt={6}>
                <Text size="xs" c="dimmed">
                    {stepsLabel}
                </Text>
                {root.currentStep && !isTerminal && (
                    <Text size="xs" c="dimmed" truncate>
                        Current: {root.currentStep.displayName ?? root.currentStep.stepInstanceId}
                    </Text>
                )}
            </Group>
        </Paper>
    );
}
