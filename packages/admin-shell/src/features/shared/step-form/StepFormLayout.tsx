import { Stack, Accordion, Group, Text, ScrollArea } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { StepDefinition, StepInstance } from '@allma/core-types';
import React from 'react';
import { CommonMappings, ErrorHandling, AdditionalParameters } from './components/index.js';
import { EditableJsonView } from '@allma/ui-components';
import { DocPopup } from '../../../components/index.js';
import useFlowEditorStore from '../../flows/editor/hooks/useFlowEditorStore.js';

interface StepFormLayoutProps {
    form: UseFormReturnType<StepInstance | Partial<StepDefinition>>;
    readOnly: boolean;
    isFieldInherited?: (key: string) => boolean;
    appliedDefinition: StepDefinition | null;
    children: React.ReactNode;
    variant: 'instance' | 'create-definition' | 'edit-definition';
    onDelete?: () => void;
    customConfigDoc?: string;
    createChangeHandler: (key: string) => (newValue: any) => void;
    customConfigError?: React.ReactNode | null;
    commonMappingsErrors: {
        inputMappings: React.ReactNode | null;
        outputMappings: React.ReactNode | null;
        literals: React.ReactNode | null;
    };
    onErrorError: React.ReactNode | null;
}

function LayoutWithHooks(props: StepFormLayoutProps) {
    const allNodes = useFlowEditorStore(state => state.nodes);
    const allEdges = useFlowEditorStore(state => state.edges);
    const { form, readOnly, isFieldInherited, appliedDefinition, children, variant, onDelete, customConfigDoc, createChangeHandler, customConfigError, commonMappingsErrors, onErrorError } = props;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <ScrollArea style={{ flex: 1 }}>
                <Stack p="md" gap="lg">
                    {children}
                    <Accordion variant="separated" multiple>
                        <CommonMappings
                            form={form as any}
                            readOnly={readOnly}
                            nodes={allNodes}
                            edges={allEdges}
                            errors={commonMappingsErrors}
                            appliedDefinition={appliedDefinition}
                            hideTransitions={variant !== 'instance'}
                        />
                        <Accordion.Item value="custom-config">
                            <Accordion.Control>
                                <Group gap="xs">
                                    {variant === 'instance' ? 'Instance Overrides (Custom Config)' : 'Custom Config'}
                                    <DocPopup content={customConfigDoc} />
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Stack gap={2}>
                                    <Text size="sm" c="dimmed" mb="xs">
                                        {variant === 'instance'
                                            ? 'Override module-specific or advanced provider settings for this step instance.'
                                            : 'Module-specific or advanced provider settings.'}
                                    </Text>
                                    <EditableJsonView
                                        value={(form.values as any).customConfig}
                                        onChange={createChangeHandler('customConfig')}
                                        readOnly={readOnly}
                                        displayVariant={isFieldInherited?.('customConfig') ? 'inherited' : 'default'}
                                        error={customConfigError}
                                    />
                                </Stack>
                            </Accordion.Panel>
                        </Accordion.Item>
                        <ErrorHandling form={form as any} readOnly={readOnly} error={onErrorError} appliedDefinition={appliedDefinition} />
                        <AdditionalParameters form={form as any} readOnly={readOnly} />
                    </Accordion>
                </Stack>
            </ScrollArea>
        </div>
    );
}

export function StepFormLayout(props: StepFormLayoutProps) {
    if (props.variant === 'instance') {
        return <LayoutWithHooks {...props} />;
    }

    // Render a version without the hooks for non-instance variants
    const { form, readOnly, isFieldInherited, appliedDefinition, children, variant, customConfigDoc, createChangeHandler, customConfigError, commonMappingsErrors, onErrorError } = props;
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <ScrollArea style={{ flex: 1 }}>
                <Stack p="md" gap="lg">
                    {children}
                    <Accordion variant="separated" multiple>
                        <CommonMappings
                            form={form as any}
                            readOnly={readOnly}
                            nodes={[]}
                            edges={[]}
                            errors={commonMappingsErrors}
                            appliedDefinition={appliedDefinition}
                            hideTransitions={true}
                        />
                        <Accordion.Item value="custom-config">
                            <Accordion.Control>
                                <Group gap="xs">
                                    {'Custom Config'}
                                    <DocPopup content={customConfigDoc} />
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Stack gap={2}>
                                    <Text size="sm" c="dimmed" mb="xs">
                                        {'Module-specific or advanced provider settings.'}
                                    </Text>
                                    <EditableJsonView
                                        value={(form.values as any).customConfig}
                                        onChange={createChangeHandler('customConfig')}
                                        readOnly={readOnly}
                                        displayVariant={isFieldInherited?.('customConfig') ? 'inherited' : 'default'}
                                        error={customConfigError}
                                    />
                                </Stack>
                            </Accordion.Panel>
                        </Accordion.Item>
                        <ErrorHandling form={form as any} readOnly={readOnly} error={onErrorError} appliedDefinition={appliedDefinition} />
                        <AdditionalParameters form={form as any} readOnly={readOnly} />
                    </Accordion>
                </Stack>
            </ScrollArea>
        </div>
    );
}