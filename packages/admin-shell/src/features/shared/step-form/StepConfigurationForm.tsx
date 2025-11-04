import { useEffect, useMemo, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { UseFormReturnType } from '@mantine/form';
import { Button, Stack, TextInput, Select, Textarea, Group, Paper, Title, Text, Accordion, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { StepDefinition, StepInstance, StepType, StepInstanceSchema } from '@allma/core-types';
import { getStepSchema, STEP_SCHEMA_EXCLUDED_FIELDS } from '../../flows/editor/zod-schema-mappers.js';
import { getModuleIdentifierOptionsForStepType } from './moduleOptions.js';
import { PanelFooter } from './components/index.js';
import { EditableJsonView, CopyableText } from '@allma/ui-components';
import useFlowEditorStore from '../../flows/editor/hooks/useFlowEditorStore.js';
import { modals } from '@mantine/modals';
import { isEqual } from 'lodash-es';
import { useGetStepDefinitions, fetchStepDefinitionById, STEP_DEFINITION_DETAIL_QUERY_KEY } from '../../../api/stepDefinitionService.js';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { DocPopup } from '../../../components/index.js';
import { STEP_DOCUMENTATION } from '../../flows/editor/step-documentation.js';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StepFormRenderer } from './StepFormRenderer.js';
import { StepFormLayout } from './StepFormLayout.js';

type StepConfigFormValues = StepInstance | Partial<StepDefinition>;

interface StepConfigurationFormProps<T extends StepConfigFormValues> {
  form: UseFormReturnType<T>;
  onSubmit: (values: T) => void;
  isSubmitting: boolean;
  isReadOnly?: boolean;
  onPreviewPrompt?: (promptId: string) => void;
  onDelete?: () => void;
  submitButtonLabel?: string;
  variant: 'instance' | 'create-definition' | 'edit-definition';
  appliedDefinition: StepDefinition | null;
}

export interface StepConfigurationFormHandle {
  validate: () => boolean;
}

/**
 * A generic helper to find and format all validation errors for a nested JSON field
 * from the Mantine form's error object.
 * @param errors The `form.errors` object.
 * @param fieldName The name of the top-level field (e.g., 'inferenceParameters').
 * @returns A formatted string of errors or null if no errors.
 */
function getJsonFieldError(errors: Record<string, React.ReactNode>, fieldName: string): React.ReactNode | null {
    if (errors[fieldName]) {
        return errors[fieldName];
    }
    const nestedErrorKeys = Object.keys(errors).filter(key => key.startsWith(`${fieldName}.`));
    if (nestedErrorKeys.length > 0) {
        return nestedErrorKeys
            .map(key => `${key.substring(fieldName.length + 1)}: ${errors[key]}`)
            .join('; ');
    }
    return null;
}

export const StepConfigurationForm = forwardRef(function StepConfigurationForm<T extends StepConfigFormValues>({
    form,
    onSubmit,
    isSubmitting,
    isReadOnly = false,
    onPreviewPrompt = () => {},
    onDelete = () => {},
    submitButtonLabel,
    variant,
    appliedDefinition,
}: StepConfigurationFormProps<T>, ref: React.Ref<StepConfigurationFormHandle>) {
    
    const queryClient = useQueryClient();
    const stepDefSelectRef = useRef<HTMLInputElement>(null);
    const allNodes = useFlowEditorStore(state => state.nodes);
    const allEdges = useFlowEditorStore(state => state.edges);

    useImperativeHandle(ref, () => ({
        validate: () => {
            const result = form.validate();
            return !result.hasErrors;
        }
    }));

    const { data: allStepDefinitions, isLoading: isLoadingStepDefs } = useGetStepDefinitions();

    const currentStepType = (form.values as StepInstance).stepType;
    
    // Get the documentation content for the customConfig field.
    const customConfigDoc = STEP_DOCUMENTATION[currentStepType as StepType]?.fields.customConfig;

    useEffect(() => {
        if (variant !== 'create-definition') return;
        const { name, description } = form.values as Partial<StepDefinition>;
        form.setValues({
            name, description, stepType: currentStepType, customConfig: {}, inputMappings: {}, outputMappings: {}, literals: {}, onError: {},
        } as any);
        form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStepType, variant]);

    const stepSpecificSchema = useMemo(() => form.values.stepType ? getStepSchema(form.values.stepType) : null, [form.values.stepType]);
    const moduleIdentifierOptions = useMemo(() => form.values.stepType ? getModuleIdentifierOptionsForStepType(form.values.stepType) : [], [form.values.stepType]);
    

    const stepDefinitionOptions = useMemo(() => {
        if (!form.values.stepType || !allStepDefinitions) return [];
        return allStepDefinitions
            .filter(def => def.stepType === form.values.stepType && !def.id.startsWith('system-'))
            .map(def => ({ value: def.id, label: def.name }));
    }, [allStepDefinitions, form.values.stepType]);


    const isFieldInherited = useCallback((fieldName: string): boolean => {
        if (!appliedDefinition) return false;
        const instanceOnlyFields = ['stepInstanceId', 'displayName', 'position', 'fill', 'transitions', 'defaultNextStepInstanceId'];
        if (instanceOnlyFields.includes(fieldName)) return false;

        const formValue = (form.values as any)[fieldName];

        if (formValue === undefined) {
            return true;
        }

        const defValue = (appliedDefinition as any)[fieldName];
        return isEqual(formValue, defValue);
    }, [appliedDefinition, form.values]);

    const createChangeHandler = useCallback((key: string) => {
        return (newValue: any) => {
            const baseValue = appliedDefinition ? (appliedDefinition as any)[key] : undefined;
            if (isEqual(newValue, baseValue)) {
                form.setFieldValue(key, undefined as any);
            } else {
                form.setFieldValue(key, newValue);
            }
        };
    }, [appliedDefinition, form]);

    const handleStepDefChange = (selectedId: string | null) => {
        stepDefSelectRef.current?.blur();

        if (!selectedId) {
            modals.openConfirmModal({
                title: 'Detach Step Definition',
                centered: true,
                children: <Text size="sm">Do you want to detach this step from its definition? The current values will be kept as local overrides.</Text>,
                labels: { confirm: 'Detach', cancel: 'Cancel' },
                onConfirm: () => form.setFieldValue('stepDefinitionId' as any, null as any),
            });
            return;
        }

        const selectedDefSummary = allStepDefinitions?.find(def => def.id === selectedId);
        if (!selectedDefSummary) return;

        modals.openConfirmModal({
            title: `Apply ‘${selectedDefSummary.name}’?`,
            centered: true,
            children: <Text size="sm">This will replace this step&apos;s configuration with the values from the selected definition. Any local overrides will be lost. Do you want to continue?</Text>,
            labels: { confirm: 'Apply Definition', cancel: 'Cancel' },
            confirmProps: { color: 'blue' },
            onConfirm: async () => {
                try {
                    const fullSelectedDef = await fetchStepDefinitionById(selectedId);
                    queryClient.setQueryData([STEP_DEFINITION_DETAIL_QUERY_KEY, selectedId], fullSelectedDef);
                    
                    const currentInstance = form.values as StepInstance;
                    
                    const newStepInstanceState: Partial<StepInstance> = {
                        stepInstanceId: currentInstance.stepInstanceId,
                        position: currentInstance.position,
                        fill: currentInstance.fill,
                        transitions: currentInstance.transitions,
                        defaultNextStepInstanceId: currentInstance.defaultNextStepInstanceId,
                        stepType: fullSelectedDef.stepType,
                        displayName: fullSelectedDef.name,
                        stepDefinitionId: fullSelectedDef.id,
                    };
        
                    form.setValues(newStepInstanceState as any);
        
                    notifications.show({
                        title: 'Definition Applied',
                        message: `Values from "${fullSelectedDef.name}" have been applied. Remember to save your changes.`,
                        color: 'blue',
                    });
                } catch (error) {
                    console.error("Failed to fetch or apply step definition", error);
                    notifications.show({ title: 'Failed to Apply', message: `Could not fetch details for the step definition. ${(error as Error).message}`, color: 'red' });
                }
            },
        });
    };

    const handleValidationErrors = (errors: Record<string, any>) => {
        console.error('Form validation errors:', errors);
        notifications.show({ title: 'Validation Error', message: 'Please correct the form errors.', color: 'red' });
    };

    const handleInstanceSubmit = (values: StepConfigFormValues) => {
        const sparseValues = values as StepInstance;
        const mergedValuesForValidation: StepInstance = {
            ...(appliedDefinition as unknown as StepInstance || {}),
            ...sparseValues,
        };

        const validationResult = StepInstanceSchema.safeParse(mergedValuesForValidation);

        if (!validationResult.success) {
            const fieldErrors = validationResult.error.flatten().fieldErrors;
            form.setErrors(fieldErrors as any);
            handleValidationErrors(fieldErrors);
            return;
        }

        onSubmit(values as T);
    };
    
    const commonMappingsErrors = {
        inputMappings: getJsonFieldError(form.errors, 'inputMappings'),
        outputMappings: getJsonFieldError(form.errors, 'outputMappings'),
        literals: getJsonFieldError(form.errors, 'literals'),
    };
    const onErrorError = getJsonFieldError(form.errors, 'onError');
    const customConfigError = getJsonFieldError(form.errors, 'customConfig');
    const inferenceParametersError = getJsonFieldError(form.errors, 'inferenceParameters');

    return (
        <form 
            onSubmit={
                variant === 'instance'
                    ? form.onSubmit(handleInstanceSubmit, handleValidationErrors)
                    : form.onSubmit(onSubmit, handleValidationErrors)
            } 
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
            <StepFormLayout
                form={form as any}
                readOnly={isReadOnly}
                isFieldInherited={isFieldInherited}
                appliedDefinition={appliedDefinition}
                variant={variant}
                onDelete={onDelete}
                customConfigDoc={customConfigDoc}
                createChangeHandler={createChangeHandler}
                customConfigError={customConfigError}
                commonMappingsErrors={commonMappingsErrors}
                onErrorError={onErrorError}
            >
                {variant === 'instance' ? (
                    <>
                        <Group wrap="nowrap" align="flex-end" gap="xs">
                            <TextInput label="Step Instance ID" {...form.getInputProps('stepInstanceId')} disabled style={{ flex: 1 }} />
                            <CopyableText text={(form.values as StepInstance).stepInstanceId} showText={false} />
                        </Group>
                        <TextInput label="Step Type" {...form.getInputProps('stepType')} disabled />
                        <Select
                            ref={stepDefSelectRef}
                            label="Step Definition"
                            description="Select a pre-configured template to apply its values."
                            placeholder="Custom Configuration (No Definition)"
                            data={stepDefinitionOptions}
                            onChange={handleStepDefChange}
                            value={(form.values as StepInstance).stepDefinitionId || null}
                            readOnly={isReadOnly}
                            disabled={isLoadingStepDefs}
                            searchable
                            clearable
                        />
                        <TextInput
                            label="Display Name"
                            placeholder="A user-friendly name for this step instance"
                            {...form.getInputProps('displayName')}
                            readOnly={isReadOnly}
                            styles={{ input: isFieldInherited('displayName') ? { fontStyle: 'italic', color: 'var(--mantine-color-dimmed)' } : {} }}
                        />
                    </>
                ) : (
                    <Paper withBorder p="xl" shadow="xs">
                        <Title order={4} mb="md">General Information</Title>
                        <Stack>
                            <TextInput withAsterisk label="Name" placeholder="e.g., Send Welcome Email" {...form.getInputProps('name')} />
                            <Textarea label="Description" placeholder="What this step does" {...form.getInputProps('description')} />
                            <Select
                                withAsterisk
                                label="Step Type"
                                description="Determines the core function and available parameters."
                                data={Object.values(StepType)}
                                {...form.getInputProps('stepType')}
                                disabled={variant === 'edit-definition'}
                            />
                        </Stack>
                    </Paper>
                )}

                {variant !== 'instance' && (
                    <Paper withBorder p="xl" shadow="xs">
                        <Title order={4} mb="md">Default Configuration</Title>
                        <Text size="sm" c="dimmed" mb="lg">Set default values. These can be overridden in each flow where it&apos;s used.</Text>
                        <Stack gap="lg">
                            {moduleIdentifierOptions.length > 0 && (
                                <Select
                                    label="Module Identifier"
                                    description="The specific system module to execute."
                                    withAsterisk
                                    placeholder="Select a module..."
                                    data={moduleIdentifierOptions}
                                    {...form.getInputProps('moduleIdentifier')}
                                    searchable
                                    disabled={variant === 'edit-definition' && (form.values as StepDefinition).moduleIdentifier?.startsWith('system/')}
                                />
                            )}
                            
                            <Divider label="Parameters" labelPosition="center" />
                            
                            {stepSpecificSchema && <StepFormRenderer schema={stepSpecificSchema} form={form as any} readOnly={isReadOnly} onPreviewPrompt={onPreviewPrompt} excludeFields={STEP_SCHEMA_EXCLUDED_FIELDS} isFieldInherited={isFieldInherited} appliedDefinition={appliedDefinition} variant={variant} onDelete={onDelete} createChangeHandler={createChangeHandler} customConfigDoc={customConfigDoc} commonMappingsErrors={commonMappingsErrors} onErrorError={onErrorError} />}
                            
                            {form.values.stepType === StepType.LLM_INVOCATION && (
                                <Stack gap="xs">
                                    <Text component="div" size="sm" fw={500}>
                                        <Group gap="xs">
                                            Inference Parameters
                                            <DocPopup content={STEP_DOCUMENTATION.LLM_INVOCATION?.fields.inferenceParameters} />
                                        </Group>
                                    </Text>
                                    <EditableJsonView
                                        value={(form.values as any).inferenceParameters as object}
                                        onChange={createChangeHandler('inferenceParameters' as any)}
                                        readOnly={isReadOnly}
                                        displayVariant={isFieldInherited('inferenceParameters') ? 'inherited' : 'default'}
                                        error={inferenceParametersError}
                                    />
                                </Stack>
                            )}
                        </Stack>
                    </Paper>
                )}

                {variant === 'instance' && (
                    <>
                        <Divider label="Parameters" labelPosition="center" />
                        {stepSpecificSchema && <StepFormRenderer schema={stepSpecificSchema} form={form as any} readOnly={isReadOnly} onPreviewPrompt={onPreviewPrompt} excludeFields={STEP_SCHEMA_EXCLUDED_FIELDS} isFieldInherited={isFieldInherited} appliedDefinition={appliedDefinition} variant={variant} onDelete={onDelete} createChangeHandler={createChangeHandler} customConfigDoc={customConfigDoc} commonMappingsErrors={commonMappingsErrors} onErrorError={onErrorError} />}
                        
                        {form.values.stepType === StepType.LLM_INVOCATION && (
                            <Stack gap="xs">
                                <Text component="div" size="sm" fw={500}>
                                    <Group gap="xs">
                                        Inference Parameters
                                        <DocPopup content={STEP_DOCUMENTATION.LLM_INVOCATION?.fields.inferenceParameters} />
                                    </Group>
                                </Text>
                                <EditableJsonView
                                    value={(form.values as any).inferenceParameters as object}
                                    onChange={createChangeHandler('inferenceParameters' as any)}
                                    readOnly={isReadOnly}
                                    displayVariant={isFieldInherited('inferenceParameters') ? 'inherited' : 'default'}
                                    error={inferenceParametersError}
                                />
                            </Stack>
                        )}
                    </>
                )}
            </StepFormLayout>

            {variant === 'instance' ? (
                 <PanelFooter
                    isReadOnly={isReadOnly}
                    isStartNode={allNodes.find(n => n.id === (form.values as StepInstance).stepInstanceId)?.data.isStartNode ?? false}
                    onDelete={onDelete}
                />
            ) : (
                <Group justify="flex-end" p="md" mt="auto" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                    <Button type="submit" leftSection={<IconDeviceFloppy size="1rem" />} loading={isSubmitting} disabled={isReadOnly || !form.isDirty()}>
                        {submitButtonLabel || 'Save Changes'}
                    </Button>
                </Group>
            )}
        </form>
    );
});