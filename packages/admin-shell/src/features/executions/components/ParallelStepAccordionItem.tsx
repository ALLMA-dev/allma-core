import { useState, useMemo, useEffect } from 'react';
import { Accordion, Alert, Badge, Group, Loader, Stack, Text, useMantineTheme, useMantineColorScheme, Tabs, Tooltip, ThemeIcon, Pagination, Box, ScrollArea, LoadingOverlay } from '@mantine/core';
import { IconAlertCircle, IconClock, IconSitemap, IconAlertTriangle, IconBinaryTree } from '@tabler/icons-react';
import { AllmaStepExecutionRecord, MappingEventStatus } from '@allma/core-types';
import { useGetBranchSteps } from '../../../api/executionService';
import { getStatusColor } from '../utils';
import { formatPreciseDuration } from '../../../utils/formatters';
import { StandardStepAccordionItem } from './StandardStepAccordionItem';
import { StepDetailsPanel } from './StepDetailsPanel';

interface ParallelStepAccordionItemProps {
    flowExecutionId: string;
    step: AllmaStepExecutionRecord;
    stepNumber: number;
    onOpenDiff: (step: AllmaStepExecutionRecord) => void;
    onOpenConfig: (step: AllmaStepExecutionRecord) => void;
    onRedrive: (step: AllmaStepExecutionRecord) => void;
}

/**
 * Checks if a step record contains any mapping events with a 'WARN' status.
 */
const stepHasWarning = (step: AllmaStepExecutionRecord): boolean => {
    const fullStepRecord = step as any;
    if (Array.isArray(fullStepRecord.mappingEvents)) {
        return fullStepRecord.mappingEvents.some(
            (event: any) => event.status === MappingEventStatus.WARN
        );
    }
    return false;
};

export function ParallelStepAccordionItem({ flowExecutionId, step, stepNumber, onOpenDiff, onOpenConfig, onRedrive }: ParallelStepAccordionItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState<string | null>('summary');
    const [lastKnownTotal, setLastKnownTotal] = useState(0);

    const LIMIT = 30;
    const offset = (page - 1) * LIMIT;

    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();

    const { data: branchStepsResponse, isLoading, isFetching, error } = useGetBranchSteps({
        flowExecutionId,
        parentStepInstanceId: step.stepInstanceId,
        parentStepStartTime: step.startTime,
        limit: LIMIT,
        offset: offset,
    }, isExpanded); // The query is only enabled when the accordion is expanded

    // Cache the total branches so pagination doesn't flicker when changing pages
    useEffect(() => {
        if (branchStepsResponse?.totalBranches !== undefined) {
            setLastKnownTotal(branchStepsResponse.totalBranches);
        }
    }, [branchStepsResponse?.totalBranches]);

    const branchGroups = branchStepsResponse?.groups || [];
    const totalBranches = branchStepsResponse?.totalBranches ?? lastKnownTotal;
    const totalPages = Math.ceil(totalBranches / LIMIT);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        // Reset to summary when navigating to a new page to prevent trying to view an unmounted branch tab
        setActiveTab('summary');
    };

    // Check for warnings on the manager step itself.
    const managerHasWarning = stepHasWarning(step);

    // Check for warnings within any of the loaded child branches.
    const branchesHaveWarning = useMemo(() => {
        return branchGroups.some(group => group.steps.some(stepHasWarning));
    }, [branchGroups]);

    // The overall step has a warning if the manager or any loaded branch has one.
    const showOverallWarning = managerHasWarning || branchesHaveWarning;

    const branchCountText = (step as any).outputData?.executedBranchCount ?? (totalBranches > 0 ? String(totalBranches) : '?');

    return (
        <Accordion.Item
            value={`${step.stepInstanceId}-${step.startTime}`}
            key={`${step.stepInstanceId}-${step.startTime}`}
            style={{
                borderColor: isExpanded ? theme.colors.blue[5] : theme.colors.gray[3],
                backgroundColor: isExpanded
                    ? `rgba(${colorScheme === 'dark' ? '66, 153, 225' : '59, 130, 246'}, 0.1)`
                    : 'transparent',
            }}
        >
            <Accordion.Control onClick={() => setIsExpanded(prev => !prev)}>
                <Group justify="space-between">
                    <Group>
                        <Badge size="xl" variant="light" color="gray">#{stepNumber}</Badge>
                        <Stack gap={0}>
                            <Group gap="xs" wrap="nowrap">
                                {showOverallWarning && (
                                    <Tooltip label="This step or one of its visible branches has warnings.">
                                        <ThemeIcon color="yellow" variant="light" size="sm" radius="xl">
                                            <IconAlertTriangle style={{ width: '70%', height: '70%' }} />
                                        </ThemeIcon>
                                    </Tooltip>
                                )}
                                <Text fw={700}>{step.stepInstanceId}</Text>
                            </Group>
                            <Text size="xs" c="dimmed">Type: {step.stepType}</Text>
                        </Stack>
                    </Group>
                    <Group>
                        <Badge color={getStatusColor(step.status)} leftSection={<IconSitemap size="1rem" />}>PARALLEL ({branchCountText} branches)</Badge>
                        <Badge leftSection={<IconClock size="0.8rem" />} variant="light" color="gray">
                            {formatPreciseDuration(step.durationMs)}
                        </Badge>
                    </Group>
                </Group>
            </Accordion.Control>

            <Accordion.Panel>
                <Box mb="md">
                    <Group justify="space-between" align="center">
                        <Group gap="xs">
                            <Text size="sm" fw={600}>Branch Executions</Text>
                            {isFetching && <Loader size="xs" color="blue" />}
                        </Group>

                        {totalPages > 1 && (
                            <Group gap="xs">
                                <Text size="xs" c="dimmed">
                                    Showing {offset + 1} - {Math.min(offset + LIMIT, totalBranches)} of {totalBranches}
                                </Text>
                                <Pagination
                                    total={totalPages}
                                    value={page}
                                    onChange={handlePageChange}
                                    size="sm"
                                    disabled={isFetching}
                                />
                            </Group>
                        )}
                    </Group>
                </Box>

                <Box pos="relative">
                    <LoadingOverlay visible={isFetching && !isLoading} zIndex={10} overlayProps={{ radius: 'sm', blur: 2 }} />
                    <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
                        <Tabs.List>
                            <Tabs.Tab value="summary" leftSection={<IconBinaryTree size="1rem" />}>
                                Summary & I/O
                            </Tabs.Tab>
                            {branchGroups.map((group, index) => {
                                const branchHasWarning = group.steps.some(stepHasWarning);
                                const branchHasError = group.steps.some(s => s.status === 'FAILED');
                                return (
                                    <Tabs.Tab
                                        key={group.executionKey}
                                        value={group.executionKey}
                                        leftSection={
                                            branchHasError ? (
                                                <Tooltip label="This branch failed."><IconAlertCircle color="red" size="1rem" /></Tooltip>
                                            ) : branchHasWarning ? (
                                                <Tooltip label="One or more steps in this branch have warnings."><IconAlertTriangle color={theme.colors.yellow[6]} size="1rem" /></Tooltip>
                                            ) : undefined
                                        }
                                    >
                                        {group.branchId} (#{offset + index + 1})
                                    </Tabs.Tab>
                                );
                            })}
                        </Tabs.List>

                        <Tabs.Panel value="summary" pt="md">
                            <StepDetailsPanel
                                step={step}
                                onOpenDiff={() => onOpenDiff(step)}
                                onOpenConfig={() => onOpenConfig(step)}
                                onRedrive={() => onRedrive(step)}
                            />
                        </Tabs.Panel>

                        {error && (
                            <Tabs.Panel value={activeTab || ''} pt="md">
                                <Alert color="red" icon={<IconAlertCircle />} title="Error Loading Branches">
                                    {error.message}
                                </Alert>
                            </Tabs.Panel>
                        )}

                        {branchGroups.map((group) => (
                            <Tabs.Panel key={group.executionKey} value={group.executionKey} pt="md">
                                <Accordion variant="separated" multiple>
                                    {group.steps.map((branchStep: AllmaStepExecutionRecord, index: number) => (
                                        <StandardStepAccordionItem
                                            key={`${branchStep.stepInstanceId}-${branchStep.startTime}`}
                                            step={branchStep}
                                            stepNumber={index + 1}
                                            onOpenDiff={onOpenDiff}
                                            onOpenConfig={onOpenConfig}
                                            onRedrive={onRedrive}
                                        />
                                    ))}
                                </Accordion>
                            </Tabs.Panel>
                        ))}

                        {branchGroups.length === 0 && !isFetching && !error && (
                            <Tabs.Panel value={activeTab || ''} pt="md">
                                <Text size="sm" c="dimmed" ta="center">No steps were executed in any branches for this run.</Text>
                            </Tabs.Panel>
                        )}
                    </Tabs>
                </Box>
            </Accordion.Panel>
        </Accordion.Item>
    );
}