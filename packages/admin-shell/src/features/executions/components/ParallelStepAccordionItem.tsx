// packages/allma-admin-shell/src/features/executions/components/ParallelStepAccordionItem.tsx
import { useState, useMemo } from 'react';
import { Accordion, Alert, Badge, Group, Loader, Stack, Text, useMantineTheme, useMantineColorScheme, Tabs, Tooltip, ThemeIcon } from '@mantine/core';
import { IconAlertCircle, IconClock, IconSitemap, IconAlertTriangle, IconBinaryTree } from '@tabler/icons-react';
import { AllmaStepExecutionRecord, BranchExecutionGroup, MappingEventStatus } from '@allma/core-types';
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
 * This is used to display a warning icon on the UI.
 * @param step The step execution record.
 * @returns True if a warning is found, false otherwise.
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
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    
    const { data: branchSteps, isLoading, error } = useGetBranchSteps({
        flowExecutionId,
        parentStepInstanceId: step.stepInstanceId,
        parentStepStartTime: step.startTime,
    }, isExpanded); // The query is only enabled when the accordion is expanded

    // Check for warnings on the manager step itself.
    const managerHasWarning = stepHasWarning(step);

    // Check for warnings within any of the child branches.
    const branchesHaveWarning = useMemo(() => {
        if (!branchSteps) return false;
        return Object.values(branchSteps).some(group => 
            group.steps.some(stepHasWarning)
        );
    }, [branchSteps]);

    // The overall step has a warning if the manager or any branch has one.
    const showOverallWarning = managerHasWarning || branchesHaveWarning;

    const sortedBranchExecutions: [string, BranchExecutionGroup][] = useMemo(() => {
        if (!branchSteps) return [];
        return (Object.entries(branchSteps) as [string, BranchExecutionGroup][]).sort(([, groupA], [, groupB]) => {
            const startTimeA = groupA.steps[0]?.startTime || '';
            const startTimeB = groupB.steps[0]?.startTime || '';
            return startTimeA.localeCompare(startTimeB);
        });
    }, [branchSteps]);

    const branchCount = useMemo(() => (step as any).outputData?.executedBranchCount ?? (branchSteps ? sortedBranchExecutions.length : '?'), [step, branchSteps, sortedBranchExecutions]);
    const branchCountText = String(branchCount);

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
                                    <Tooltip label="This step or one of its branches has warnings.">
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
                        <Badge color={getStatusColor(step.status)} leftSection={<IconSitemap size="1rem"/>}>PARALLEL ({branchCountText} branches)</Badge>
                        <Badge leftSection={<IconClock size="0.8rem" />} variant="light" color="gray">
                            {formatPreciseDuration(step.durationMs)}
                        </Badge>
                    </Group>
                </Group>
            </Accordion.Control>
            <Accordion.Panel>
                <Tabs defaultValue="summary" keepMounted={false}>
                    <Tabs.List>
                        <Tabs.Tab value="summary" leftSection={<IconBinaryTree size="1rem" />}>
                            Summary & I/O
                        </Tabs.Tab>
                        {sortedBranchExecutions.map(([executionId, group], index) => {
                             const branchHasWarning = group.steps.some(stepHasWarning);
                             return (
                                <Tabs.Tab 
                                    key={executionId} 
                                    value={executionId} 
                                    leftSection={branchHasWarning ? (
                                        <Tooltip label="One or more steps in this branch have warnings.">
                                            <IconAlertTriangle color={theme.colors.yellow[6]} size="1rem" />
                                        </Tooltip>
                                    ) : undefined}
                                >
                                    {group.branchId} (#{index + 1})
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

                    {isLoading && isExpanded && <Tabs.Panel value="loading"><Group justify="center" p="md"><Loader size="sm" /> <Text size="sm">Loading branch steps...</Text></Group></Tabs.Panel>}
                    {error && <Tabs.Panel value="error"><Alert color="red" icon={<IconAlertCircle />} title="Error Loading Branches">{error.message}</Alert></Tabs.Panel>}
                    
                    {branchSteps && sortedBranchExecutions.map(([executionId, group]) => (
                        <Tabs.Panel key={executionId} value={executionId} pt="md">
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

                    {branchSteps && sortedBranchExecutions.length === 0 && (
                        <Tabs.Panel value={sortedBranchExecutions[0]?.[0] || 'summary'}>
                           <Text size="sm" c="dimmed" p="md">No steps were executed in any branches for this run.</Text>
                        </Tabs.Panel>
                    )}
                </Tabs>
            </Accordion.Panel>
        </Accordion.Item>
    );
}
