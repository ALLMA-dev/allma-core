import { Accordion, Alert, Button, Group, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import { IconAlertTriangle, IconGitCompare, IconPlayerPlay, IconSettings } from "@tabler/icons-react";
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

/**
 * Renders a context object, distinguishing three cases so the UI never silently shows an
 * empty `{}` when context is actually unavailable:
 *  - `undefined`/`null`  -> the context was not recorded for this step (e.g. a step that
 *    failed before its output context was produced, or whose detailed record could not be loaded).
 *  - an empty object     -> rendered as-is (the context genuinely was empty).
 *  - a populated object  -> rendered via the JSON viewer.
 */
const ContextView = ({ value, missingLabel }: { value: unknown; missingLabel: string }) => {
    if (value === undefined || value === null) {
        return (
            <Alert color="gray" variant="light" icon={<IconAlertTriangle size="1rem" />}>
                {missingLabel}
            </Alert>
        );
    }
    return <EditableJsonView value={value} readOnly />;
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
    // Set by the backend when the full step record could not be hydrated from S3. Surfaced here so a
    // partially-loaded step explains itself instead of silently showing empty context sections.
    const s3Error = fullStepRecord._s3_error as string | undefined;

    return (
        <Stack>
            {s3Error && !fullStepRecord._large_payload_link && (
                <Alert color="orange" title="Some step details could not be loaded" icon={<IconAlertTriangle size="1rem" />}>
                    {s3Error}
                </Alert>
            )}
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
                    <ContextView value={inputContext} missingLabel="No input context was recorded for this step." />
                </Stack>

                <Stack gap="xs">
                    <Text fw={500}>Final Context After Step</Text>
                    <Text size="xs" c="dimmed">The state of the entire flow *after* this step&apos;s output was merged.</Text>
                    <ContextView value={outputContext} missingLabel="No output context was recorded — the step did not complete successfully." />
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
