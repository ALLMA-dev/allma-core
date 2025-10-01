// packages/allma-admin-shell/src/features/executions/components/StepMetadataDisplay.tsx
import { Accordion, Badge, Code, Group, Paper, Stack, Text } from "@mantine/core";
import { EditableJsonView } from "@allma/ui-components";
import { TransitionEvaluationEvent } from '@allma/core-types';
import { IconArrowRight, IconCheck, IconCircleX } from "@tabler/icons-react";

/**
 * Renders a resolved value from a transition condition, using a JSON viewer
 * for objects/arrays and a code block for primitives.
 */
const renderResolvedValue = (value: any) => {
    if (value === undefined || value === null) {
        return <Code>null/undefined</Code>;
    }
    if (typeof value === 'object') {
        // Use a smaller, more compact JSON view for this context
        return <EditableJsonView value={value} readOnly />;
    }
    return <Code>{String(value)}</Code>;
};


export function StepMetadataDisplay({ metadata }: { metadata: Record<string, any> }) {
    const {
        tokenUsage,
        llmInvocationParameters,
        llmPrompt,
        llmRawResponse,
        templateContextMappingResult,
        transitionEvaluation,
        ...otherMetadata
    } = metadata as { transitionEvaluation?: TransitionEvaluationEvent } & Record<string, any>;

    const hasOtherMetadata = Object.keys(otherMetadata).length > 0;

    return (
        <Stack>
            {transitionEvaluation && (
                <Paper withBorder p="md" radius="sm">
                    <Text fw={500} size="sm" mb="md">Transition Outcome</Text>
                    <Stack gap="sm">
                        {transitionEvaluation.type === 'CONDITION' && (
                            <>
                                <Group wrap="nowrap">
                                    <Text size="sm" w={150} c="dimmed">Condition:</Text>
                                    <Code>{transitionEvaluation.condition}</Code>
                                </Group>
                                <Group wrap="nowrap" align="flex-start">
                                    <Text size="sm" w={150} c="dimmed">Resolved Value:</Text>
                                    <div style={{ flex: 1 }}>
                                        {renderResolvedValue(transitionEvaluation.resolvedValue)}
                                    </div>
                                </Group>
                                 <Group wrap="nowrap">
                                    <Text size="sm" w={150} c="dimmed">Result:</Text>
                                    {transitionEvaluation.result ? 
                                        <Badge color="green" variant="light" leftSection={<IconCheck size="0.8rem" />}>Condition Met</Badge> 
                                        : <Badge color="orange" variant="light" leftSection={<IconCircleX size="0.8rem" />}>Condition NOT Met</Badge>
                                    }
                                </Group>
                            </>
                        )}
                         {transitionEvaluation.type === 'DEFAULT' && (
                             <Text size="sm" c="dimmed">No transition conditions were met. Proceeded via default path.</Text>
                         )}
                         {transitionEvaluation.type === 'END_OF_PATH' && (
                             <Text size="sm" c="dimmed">End of path reached. No further transitions defined.</Text>
                         )}
                        {transitionEvaluation.chosenNextStepId && (
                            <Group>
                                <Text size="sm" fw={500} w={150}>Next Step:</Text>
                                <Badge variant="outline" color="blue" leftSection={<IconArrowRight size="0.8rem" />}>{transitionEvaluation.chosenNextStepId}</Badge>
                            </Group>
                        )}
                    </Stack>
                </Paper>
            )}

            {tokenUsage && (
                <Paper withBorder p="xs" radius="sm">
                    <Text fw={500} size="sm" mb="xs">Token Usage</Text>
                    <Group>
                        <Badge variant="light">Input: {tokenUsage.inputTokens ?? 'N/A'}</Badge>
                        <Badge variant="light">Output: {tokenUsage.outputTokens ?? 'N/A'}</Badge>
                    </Group>
                </Paper>
            )}
            <Accordion variant="separated" multiple defaultValue={['llm-invocation-parameters', 'llm-prompt', 'llm-response', 'template-context', 'other-meta']}>
                {llmInvocationParameters && (
                    <Accordion.Item value="llm-invocation-parameters">
                        <Accordion.Control>LLM Invocation Parameters</Accordion.Control>
                        <Accordion.Panel>
                            <EditableJsonView value={llmInvocationParameters} readOnly />
                        </Accordion.Panel>
                    </Accordion.Item>
                )}
                {llmPrompt && (
                    <Accordion.Item value="llm-prompt">
                        <Accordion.Control>LLM Prompt</Accordion.Control>
                        <Accordion.Panel>
                            <Code block style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                                {llmPrompt}
                            </Code>
                        </Accordion.Panel>
                    </Accordion.Item>
                )}
                {llmRawResponse && (
                    <Accordion.Item value="llm-response">
                        <Accordion.Control>LLM Raw Response</Accordion.Control>
                        <Accordion.Panel>
                             <Code block style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                                {llmRawResponse}
                            </Code>
                        </Accordion.Panel>
                    </Accordion.Item>
                )}
                {templateContextMappingResult && (
                    <Accordion.Item value="template-context">
                        <Accordion.Control>Template Context Mapping Result</Accordion.Control>
                        <Accordion.Panel>
                            <EditableJsonView value={templateContextMappingResult} readOnly />
                        </Accordion.Panel>
                    </Accordion.Item>
                )}
                {hasOtherMetadata && (
                    <Accordion.Item value="other-meta">
                        <Accordion.Control>Other Metadata</Accordion.Control>
                        <Accordion.Panel>
                            <EditableJsonView value={otherMetadata} readOnly />
                        </Accordion.Panel>
                    </Accordion.Item>
                )}
            </Accordion>
        </Stack>
    );
}