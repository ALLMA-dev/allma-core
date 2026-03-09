import { Accordion, Badge, Group, Stack, Text, Tooltip, useMantineColorScheme, useMantineTheme, ThemeIcon, Loader, Alert, Button } from "@mantine/core";
import { format } from "date-fns";
import { AllmaStepExecutionRecord, MappingEventStatus } from '@allma/core-types';
import { formatPreciseDuration } from "../../../utils/formatters";
import { getStatusColor, getStatusIcon } from "../utils";
import { StepDetailsPanel } from "./StepDetailsPanel";
import { IconClock, IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";
import { useGetStepRecordDetails } from '../../../api/executionService';

interface StandardStepAccordionItemProps {
    step: AllmaStepExecutionRecord;
    stepNumber: number;
    onOpenDiff: (step: AllmaStepExecutionRecord) => void;
    onOpenConfig: (step: AllmaStepExecutionRecord) => void;
    onRedrive: (step: AllmaStepExecutionRecord) => void;
    isSandbox?: boolean;
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

export function StandardStepAccordionItem({ step, stepNumber, onOpenDiff, onOpenConfig, onRedrive, isSandbox = false }: StandardStepAccordionItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    
    // Detect if details were omitted
    const isDetailsOmitted = (step as any)._detailsOmittedForSize;

    const { data: fetchedStepData, isLoading: isFetchingDetails, error: fetchError } = useGetStepRecordDetails({
        flowExecutionId: step.flowExecutionId,
        stepInstanceId: step.stepInstanceId,
        attemptNumber: step.attemptNumber,
        branchExecutionId: step.branchExecutionId,
    }, isExpanded && isDetailsOmitted);

    const displayStep = fetchedStepData || step;
    const hasWarning = stepHasWarning(displayStep);
    
    const itemValue = `${displayStep.stepInstanceId}-${displayStep.startTime}`;

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
                                <Text fw={700}>{displayStep.stepInstanceId}</Text>
                            </Group>
                            <Text size="xs" c="dimmed">Type: {displayStep.stepType}</Text>
                        </Stack>
                    </Group>
                    <Group>
                        {(displayStep.attemptNumber && displayStep.attemptNumber > 1) && (
                            <Badge color="gray" variant="outline">Attempt {displayStep.attemptNumber}</Badge>
                        )}
                        <Badge
                            color={getStatusColor(displayStep.status)}
                            leftSection={getStatusIcon(displayStep.status)}
                            pr={displayStep.status === 'COMPLETED' ? 'xs' : undefined}
                        >
                            {displayStep.status === 'COMPLETED' ? 'OK' : displayStep.status}
                        </Badge>
                        <Tooltip label={`Started: ${format(new Date(displayStep.startTime), 'HH:mm:ss.SSS')}\nEnded: ${displayStep.endTime ? format(new Date(displayStep.endTime), 'HH:mm:ss.SSS') : 'N/A'}`}>
                            <Badge leftSection={<IconClock size="0.8rem" />} variant="light" color="gray">
                                {formatPreciseDuration(displayStep.durationMs)}
                            </Badge>
                        </Tooltip>
                    </Group>
                </Group>
            </Accordion.Control>
            <Accordion.Panel>
                {isDetailsOmitted && isFetchingDetails ? (
                    <Group justify="center" p="xl"><Loader size="sm" /><Text size="sm" c="dimmed">Loading large step details...</Text></Group>
                ) : fetchError ? (
                    <Alert color="red" title="Failed to load details">{fetchError.message}</Alert>
                ) : (displayStep as any)._large_payload_link ? (
                     <Alert color="blue" title="Step Record Too Large">
                        <Text size="sm" mb="sm">{(displayStep as any)._s3_error}</Text>
                        <Button component="a" href={(displayStep as any)._large_payload_link} target="_blank" rel="noopener noreferrer" size="xs" variant="light">
                            Download Raw Step Record
                        </Button>
                     </Alert>
                ) : (
                    <StepDetailsPanel
                        step={displayStep}
                        onOpenDiff={() => onOpenDiff(displayStep)}
                        onOpenConfig={() => onOpenConfig(displayStep)}
                        onRedrive={() => onRedrive(displayStep)}
                        isSandbox={isSandbox}
                    />
                )}
            </Accordion.Panel>
        </Accordion.Item>
    );
}