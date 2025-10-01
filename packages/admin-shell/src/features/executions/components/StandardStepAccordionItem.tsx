// packages/allma-admin-shell/src/features/executions/components/StandardStepAccordionItem.tsx
import { Accordion, Badge, Group, Stack, Text, Tooltip, useMantineColorScheme, useMantineTheme, ThemeIcon } from "@mantine/core";
import { format } from "date-fns";
import { AllmaStepExecutionRecord, MappingEventStatus } from '@allma/core-types';
import { formatPreciseDuration } from "../../../utils/formatters";
import { getStatusColor, getStatusIcon } from "../utils";
import { StepDetailsPanel } from "./StepDetailsPanel";
import { IconClock, IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";

interface StandardStepAccordionItemProps {
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

export function StandardStepAccordionItem({ step, stepNumber, onOpenDiff, onOpenConfig, onRedrive }: StandardStepAccordionItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    const hasWarning = stepHasWarning(step);
    
    const itemValue = `${step.stepInstanceId}-${step.startTime}`;

    return (
        <Accordion.Item
            value={itemValue}
            key={itemValue}
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
                                {hasWarning && (
                                    <Tooltip label="This step has warnings. Check mapping events for details.">
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
                        {(step.attemptNumber && step.attemptNumber > 1) && (
                            <Badge color="gray" variant="outline">Attempt {step.attemptNumber}</Badge>
                        )}
                        <Badge
                            color={getStatusColor(step.status)}
                            leftSection={getStatusIcon(step.status)}
                            pr={step.status === 'COMPLETED' ? 'xs' : undefined}
                        >
                            {step.status === 'COMPLETED' ? 'OK' : step.status}
                        </Badge>
                        <Tooltip label={`Started: ${format(new Date(step.startTime), 'HH:mm:ss.SSS')}\nEnded: ${step.endTime ? format(new Date(step.endTime), 'HH:mm:ss.SSS') : 'N/A'}`}>
                            <Badge leftSection={<IconClock size="0.8rem" />} variant="light" color="gray">
                                {formatPreciseDuration(step.durationMs)}
                            </Badge>
                        </Tooltip>
                    </Group>
                </Group>
            </Accordion.Control>
            <Accordion.Panel>
                <StepDetailsPanel
                    step={step}
                    onOpenDiff={() => onOpenDiff(step)}
                    onOpenConfig={() => onOpenConfig(step)}
                    onRedrive={() => onRedrive(step)}
                />
            </Accordion.Panel>
        </Accordion.Item>
    );
}