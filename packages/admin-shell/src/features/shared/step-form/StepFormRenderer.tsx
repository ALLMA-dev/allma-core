import { Select, Stack, TextInput, Textarea, Group, ActionIcon, Tooltip, Text, useMantineTheme, Switch } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { z } from 'zod';
import { parseDescription } from '../../flows/editor/zod-schema-mappers';
import { HttpMethod, LLMProviderType, StepDefinition, StepInstance, StepType } from '@allma/core-types';
import { useGetPrompts } from '../../../api/promptTemplateService';
import { useMemo, useCallback } from 'react';
import { IconEye } from '@tabler/icons-react';
import { EditableJsonView } from '@allma/ui-components';
import { STEP_DOCUMENTATION } from '../../flows/editor/step-documentation';
import { DocPopup } from '../../../components';
import { isEqual } from 'lodash-es';

interface StepFormRendererProps {
    schema: z.ZodObject<any, any>;
    form: UseFormReturnType<StepInstance | Partial<StepDefinition>>;
    readOnly: boolean;
    onPreviewPrompt: (promptId: string) => void;
    isFieldInherited?: (key: string) => boolean;
    appliedDefinition: StepDefinition | null;
    /** An optional set of field names to exclude from rendering. */
    excludeFields?: Set<string>;
}

/**
 * Helper function to find documentation for a field.
 * It checks the step-specific docs first, then falls back to all common sections.
 */
function getDocForField(stepType: StepType, fieldName: string): string | undefined {
    // 1. Check step-specific documentation
    const stepSpecificDoc = STEP_DOCUMENTATION[stepType]?.fields[fieldName];
    if (stepSpecificDoc) {
        return stepSpecificDoc;
    }

    // 2. Fallback to common documentation sections
    const commonSections = ['mappings', 'errorHandling', 'advanced'];
    for (const section of commonSections) {
        const commonDoc = STEP_DOCUMENTATION.common[section]?.fields[fieldName];
        if (commonDoc) {
            return commonDoc;
        }
    }
    return undefined;
}


export function StepFormRenderer({ schema, form, readOnly, onPreviewPrompt, isFieldInherited = () => false, appliedDefinition, excludeFields = new Set() }: StepFormRendererProps) {
    const theme = useMantineTheme();
    const { data: promptsData, isLoading: isLoadingPrompts } = useGetPrompts();

    const promptOptions = useMemo(() => {
        if (!promptsData) return [];
        const uniquePrompts = new Map<string, { value: string, label: string }>();
        promptsData.forEach(p => {
            if (!uniquePrompts.has(p.id)) {
                uniquePrompts.set(p.id, { value: p.id, label: p.name });
            }
        });
        return Array.from(uniquePrompts.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [promptsData]);
    
    const createChangeHandler = useCallback((key: string) => {
        return (eventOrValue: any) => {
            const newValue = eventOrValue?.currentTarget?.value ?? eventOrValue;
            const baseValue = appliedDefinition ? (appliedDefinition as any)[key] : undefined;

            if (newValue === null && (baseValue === undefined || baseValue === null)) {
                form.setFieldValue(key as any, undefined);
                return;
            }

            if (isEqual(newValue, baseValue)) {
                form.setFieldValue(key as any, undefined);
            } else {
                form.setFieldValue(key as any, newValue);
            }
        };
    }, [appliedDefinition, form]);


    const renderField = (key: string, fieldSchema: z.ZodTypeAny) => {
        if (excludeFields.has(key)) {
            return null;
        }

        const { label, componentType, placeholder } = parseDescription(fieldSchema.description);
        const schemaDef = fieldSchema._def;
        const typeName = schemaDef.typeName;
        
        const docContent = getDocForField(form.values.stepType as StepType, key);
        
        const fieldLabel = (
            <Group gap="xs" wrap="nowrap">
                <Text component="span">{label || key}</Text>
                <DocPopup content={docContent} />
            </Group>
        );

        const inherited = isFieldInherited(key);
        const inheritedStyle = inherited ? { fontStyle: 'italic', borderStyle: 'dashed', borderColor: theme.colors.cyan[7] } : {};
        const inheritedJsonVariant = inherited ? 'inherited' : 'default';

        const instanceValue = (form.values as any)[key];
        const definitionValue = appliedDefinition ? (appliedDefinition as any)[key] : undefined;
        const displayValue = instanceValue !== undefined ? instanceValue : definitionValue;
        const handleChange = createChangeHandler(key);

        const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            const { checked } = event.currentTarget;
            const baseValue = appliedDefinition ? (appliedDefinition as any)[key] : undefined;
            if (isEqual(checked, baseValue)) {
                form.setFieldValue(key as any, undefined);
            } else {
                form.setFieldValue(key as any, checked);
            }
        };

        switch (componentType) {
            case 'switcher':
                return <Switch key={key} label={fieldLabel} checked={displayValue} onChange={handleSwitchChange} readOnly={readOnly} styles={{ body: inheritedStyle }} />;
            case 'prompt-select':
                return (
                    <Group key={key} align="flex-end" gap="xs" wrap="nowrap">
                        <Select label={fieldLabel} placeholder={placeholder} data={promptOptions} value={displayValue ?? null} onChange={handleChange} disabled={readOnly || isLoadingPrompts} searchable clearable style={{ flex: 1 }} styles={{ input: inheritedStyle }} />
                        <Tooltip label="Preview latest version of this prompt"><ActionIcon variant="default" size="input-sm" onClick={() => onPreviewPrompt(displayValue)} disabled={!displayValue} aria-label="Preview prompt"><IconEye size="1rem" /></ActionIcon></Tooltip>
                    </Group>
                );
            case 'select': {
                let options: string[] = [];
                if (typeName === z.ZodFirstPartyTypeKind.ZodEnum) options = schemaDef.values;
                else if (key === 'apiHttpMethod') options = Object.values(HttpMethod);
                return <Select key={key} label={fieldLabel} placeholder={placeholder} data={options} value={displayValue ?? null} onChange={handleChange} readOnly={readOnly} styles={{ input: inheritedStyle }} />;
            }
            case 'textarea':
                return <Textarea key={key} label={fieldLabel} placeholder={placeholder} minRows={3} value={displayValue ?? ''} onChange={handleChange} readOnly={readOnly} styles={{ input: inheritedStyle }} />;
            case 'json':
                return (
                    <Stack key={key} gap={2}>
                        <Text component="div" size="sm" fw={500}>{fieldLabel}</Text>
                        <Text size="xs" c="dimmed" mb="xs">{placeholder}</Text>
                        <EditableJsonView value={displayValue} onChange={handleChange} readOnly={readOnly} displayVariant={inheritedJsonVariant} />
                    </Stack>
                );
        }

        if (typeName === z.ZodFirstPartyTypeKind.ZodObject || typeName === z.ZodFirstPartyTypeKind.ZodRecord || typeName === z.ZodFirstPartyTypeKind.ZodArray) {
            return null;
        }
        
        if (typeName === z.ZodFirstPartyTypeKind.ZodEnum) {
            return <Select key={key} label={fieldLabel} placeholder={placeholder} data={schemaDef.values} value={displayValue ?? null} onChange={handleChange} readOnly={readOnly} styles={{ input: inheritedStyle }} />;
        }
        
        return <TextInput key={key} label={fieldLabel} placeholder={placeholder} value={displayValue ?? ''} onChange={handleChange} readOnly={readOnly} styles={{ input: inheritedStyle }} />;
    };
    
    const llmProviderInstanceValue = (form.values as any).llmProvider;
    const llmProviderDefinitionValue = appliedDefinition ? (appliedDefinition as any).llmProvider : undefined;
    const llmProviderDisplayValue = llmProviderInstanceValue !== undefined ? llmProviderInstanceValue : llmProviderDefinitionValue;

    return (
        <Stack gap="lg">
            {form.values.stepType === StepType.LLM_INVOCATION && (
                <Select
                    label="LLM Provider"
                    description="The AI provider to use for this invocation."
                    withAsterisk
                    data={Object.values(LLMProviderType)}
                    value={llmProviderDisplayValue ?? null}
                    onChange={createChangeHandler('llmProvider')}
                    readOnly={readOnly}
                    styles={{ input: isFieldInherited('llmProvider') ? { fontStyle: 'italic', borderStyle: 'dashed', borderColor: theme.colors.cyan[7] } : {} }}
                />
            )}
            {Object.keys(schema.shape).map(key => renderField(key, schema.shape[key]))}
        </Stack>
    );
}
