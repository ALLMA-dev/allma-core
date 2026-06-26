import { Badge, Box, Group, Paper, Progress, Stack, Text, Tooltip } from '@mantine/core';
import { IconClockPause, IconSubtask } from '@tabler/icons-react';
import { ExecutionProgressNode } from '@allma/core-types';
import { useGetExecutionProgress } from '../../../api/executionService';

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'];

const KIND_LABELS: Record<string, string> = {
    SYNC_SUBFLOW: 'Sync sub-flow',
    ASYNC_SUBFLOW: 'Async sub-flow',
    PARALLEL_BRANCH: 'Parallel branch',
};

interface ExecutionProgressBarProps {
    flowExecutionId: string;
}

function nodeTitle(node: ExecutionProgressNode): string {
    return (
        node.currentCheckpoint?.label ??
        node.currentStep?.displayName ??
        node.currentStep?.stepInstanceId ??
        (node.status === 'COMPLETED' ? 'Completed' : node.status)
    );
}

/**
 * Renders one execution node (its current stage, percentage and waiting state) and recursively
 * renders any nested sub-flow / branch nodes beneath it, each with its own bar. Child nodes are
 * indented with a left border so the tree structure is visible at a glance.
 */
function ProgressNodeView({ node, depth }: { node: ExecutionProgressNode; depth: number }) {
    const isTerminal = TERMINAL_STATUSES.includes(node.status);
    const isFailed = node.status === 'FAILED' || node.status === 'TIMED_OUT' || node.status === 'CANCELLED';
    const color = isFailed ? 'red' : node.status === 'COMPLETED' ? 'green' : 'blue';

    const stepsLabel =
        node.totalCheckpoints && node.totalCheckpoints > 0
            ? `Stage ${node.currentCheckpoint?.ordinal ?? 0} of ${node.totalCheckpoints}`
            : node.totalStepCount && node.totalStepCount > 0
                ? `${node.completedStepCount} of ${node.totalStepCount} steps`
                : `${node.completedStepCount} steps done`;

    const kindLabel = depth > 0 && node.executionKind ? KIND_LABELS[node.executionKind] : undefined;

    return (
        <Box
            style={
                depth > 0
                    ? { borderLeft: '2px solid var(--mantine-color-default-border)', paddingLeft: 'var(--mantine-spacing-md)' }
                    : undefined
            }
        >
            <Paper withBorder p="sm" radius="md" mb="sm">
                <Group justify="space-between" mb={6} wrap="nowrap">
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                        {kindLabel && (
                            <Tooltip label={kindLabel}>
                                <Badge color="grape" variant="light" leftSection={<IconSubtask size={12} />}>
                                    {kindLabel}
                                </Badge>
                            </Tooltip>
                        )}
                        <Text fw={600} size="sm" truncate>
                            {nodeTitle(node)}
                        </Text>
                        {node.isWaiting && (
                            <Tooltip label="Paused waiting for an external event or long-running poll">
                                <Badge color="yellow" variant="light" leftSection={<IconClockPause size={12} />}>
                                    Waiting
                                </Badge>
                            </Tooltip>
                        )}
                        {!isTerminal && !node.isWaiting && (
                            <Badge color="blue" variant="light">
                                Running
                            </Badge>
                        )}
                    </Group>
                    <Text fw={700} size="sm" c={color} style={{ flexShrink: 0 }}>
                        {node.progressPercent}%
                    </Text>
                </Group>
                <Progress
                    value={node.progressPercent}
                    color={color}
                    striped={!isTerminal}
                    animated={!isTerminal && !node.isWaiting}
                    radius="xl"
                />
                <Group justify="space-between" mt={6}>
                    <Text size="xs" c="dimmed">
                        {stepsLabel}
                    </Text>
                    {node.currentStep && !isTerminal && (
                        <Text size="xs" c="dimmed" truncate>
                            Current: {node.currentStep.displayName ?? node.currentStep.stepInstanceId}
                        </Text>
                    )}
                </Group>
            </Paper>

            {node.children.length > 0 && (
                <Stack gap={0}>
                    {node.children.map((child) => (
                        <ProgressNodeView key={child.flowExecutionId} node={child} depth={depth + 1} />
                    ))}
                </Stack>
            )}
        </Box>
    );
}

/**
 * Self-refreshing progress indicator for an execution and its sub-flow tree. Fetches in `tree`
 * mode so nested sync/async sub-flow nodes are shown beneath the root, each with its own bar and
 * current-step line. Polling stops on terminal status, so this renders a static final state once
 * the execution finishes.
 */
export function ExecutionProgressBar({ flowExecutionId }: ExecutionProgressBarProps) {
    const { data, isLoading } = useGetExecutionProgress(flowExecutionId, 'tree');

    // Nothing to show until the first response arrives (avoids a layout flash).
    if (isLoading || !data) return null;

    return (
        <Box mb="md">
            <ProgressNodeView node={data.root} depth={0} />
        </Box>
    );
}
