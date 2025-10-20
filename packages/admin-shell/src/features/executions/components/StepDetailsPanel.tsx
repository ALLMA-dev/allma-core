import { Accordion, Button, Group, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import { IconGitCompare, IconPlayerPlay, IconSettings } from "@tabler/icons-react";
import { AllmaStepExecutionRecord, MappingEvent } from '@allma/core-types';
import { EditableJsonView } from "@allma/ui-components";
import { MappingEventsDisplay } from "./MappingEventsDisplay";
import { StepMetadataDisplay } from "./StepMetadataDisplay";

const ContextAccordionItem = ({ title, data, value }: { title: string; data: any; value: string }) => {
    if (!data) return null;
    return (
        <Accordion.Item value={value}>
            <Accordion.Control>{title}</Accordion.Control>
            <Accordion.Panel>
                <EditableJsonView value={data} readOnly />
            </Accordion.Panel>
        </Accordion.Item>
    );
};

interface StepDetailsPanelProps {
    step: AllmaStepExecutionRecord;
    onOpenDiff: () => void;
    onOpenConfig: () => void;
    onRedrive: () => void;
    isSandbox?: boolean;
}

export function StepDetailsPanel({ step, onOpenDiff, onOpenConfig, onRedrive, isSandbox = false }: StepDetailsPanelProps) {
    const fullStepRecord = step as any;
    const mappingEvents = fullStepRecord.mappingEvents as MappingEvent[] | undefined;
    const logDetails = fullStepRecord.logDetails as Record<string, any> | undefined;
    const inputContext = fullStepRecord.inputMappingContext;
    const outputContext = fullStepRecord.outputMappingContext;

    return (
        <Stack>
            {!isSandbox && (
                <Group justify="flex-end">
                    <Tooltip label="View the step's configuration from this flow version">
                        <Button
                            variant="default"
                            size="xs"
                            onClick={onOpenConfig}
                            leftSection={<IconSettings size="1rem" />}
                        >
                            View Configuration
                        </Button>
                    </Tooltip>
                    <Tooltip label="Restart the flow from this step, with the option to modify its input context">
                        <Button
                            variant="light"
                            size="xs"
                            onClick={onRedrive}
                            leftSection={<IconPlayerPlay size="1rem" />}
                        >
                            Redrive from this Step
                        </Button>
                    </Tooltip>
                </Group>
            )}
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                <Stack gap="xs">
                    <Group justify="space-between" align="center">
                        <Text fw={500}>Step Input Context</Text>
                        <Tooltip label="Compare Step Input Context with Final Context After Step">
                            <Button
                                variant="default"
                                size="xs"
                                onClick={onOpenDiff}
                                leftSection={<IconGitCompare size="1rem" />}
                                disabled={!outputContext}
                            >
                                Diff
                            </Button>
                        </Tooltip>
                    </Group>
                    <Text size="xs" c="dimmed">The state of the entire flow *before* this step ran.</Text>
                    <EditableJsonView value={inputContext || {}} readOnly />
                </Stack>
    
                <Stack gap="xs">
                    <Text fw={500}>Final Context After Step</Text>
                    <Text size="xs" c="dimmed">The state of the entire flow *after* this step&apos;s output was merged.</Text>
                    <EditableJsonView value={outputContext ?? {}} readOnly />
                </Stack>
            </SimpleGrid>
    
            {fullStepRecord.errorInfo && (
                <Stack gap="xs" mt="md">
                    <Text fw={500} c="red">Error Info</Text>
                    <EditableJsonView value={fullStepRecord.errorInfo} readOnly />
                </Stack>
            )}
            
            <Accordion variant="separated" mt="md" multiple>
                <Accordion.Item value="data-contexts">
                    <Accordion.Control>Data Contexts & Mappings</Accordion.Control>
                    <Accordion.Panel>
                        <Accordion variant="contained" multiple>
                            <ContextAccordionItem title="Input Mapping Result" data={fullStepRecord.inputMappingResult} value="input-mapping-result" />
                            <ContextAccordionItem title="Output Mapping Result (Raw Step Output)" data={fullStepRecord.outputData} value="output-mapping-result" />
                            <ContextAccordionItem title="Template Mapping Context" data={fullStepRecord.templateContextMappingContext} value="template-context" />
                        </Accordion>
                    </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="mapping-events">
                    <Accordion.Control>Mapping Events ({mappingEvents?.length || 0})</Accordion.Control>
                    <Accordion.Panel>
                        <MappingEventsDisplay events={mappingEvents} />
                    </Accordion.Panel>
                </Accordion.Item>
                {logDetails && (
                     <Accordion.Item value="step-metadata">
                        <Accordion.Control>Step Metadata</Accordion.Control>
                        <Accordion.Panel>
                            <StepMetadataDisplay metadata={logDetails} />
                        </Accordion.Panel>
                    </Accordion.Item>
                )}
            </Accordion>
        </Stack>
    );
}
