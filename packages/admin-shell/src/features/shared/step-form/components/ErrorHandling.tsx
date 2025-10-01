import { Accordion, Group, Stack, Text } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { StepInstance, StepDefinition } from '@allma/core-types';
import { EditableJsonView } from '@allma/ui-components';
import { STEP_DOCUMENTATION } from '../../../flows/editor/step-documentation';
import { DocPopup } from '../../../../components';
import React, { useCallback } from 'react';
import { isEqual } from 'lodash-es';

interface ErrorHandlingProps {
    form: UseFormReturnType<StepInstance>;
    readOnly: boolean;
    error?: React.ReactNode;
    appliedDefinition: StepDefinition | null;
}

export function ErrorHandling({ form, readOnly, error, appliedDefinition }: ErrorHandlingProps) {
    const createChangeHandler = useCallback((key: keyof StepInstance & string) => {
        return (newValue: any) => {
            const baseValue = appliedDefinition ? (appliedDefinition as any)[key] : undefined;
            if (isEqual(newValue, baseValue)) {
                form.setFieldValue(key as any, undefined);
            } else {
                form.setFieldValue(key, newValue);
            }
        };
    }, [appliedDefinition, form]);
    
    return (
        <Accordion.Item value="errorHandling">
            <Accordion.Control>
                <Group gap="xs">Error Handling <DocPopup content={STEP_DOCUMENTATION.common.errorHandling.general} /></Group>
            </Accordion.Control>
            <Accordion.Panel>
                <Stack gap={2}>
                    <Text size="sm" fw={500}>Retry & Fallback Configuration <DocPopup content={STEP_DOCUMENTATION.common.errorHandling.fields.onError} /></Text>
                    <EditableJsonView 
                        value={form.values.onError} 
                        onChange={createChangeHandler('onError')}
                        readOnly={readOnly} 
                        error={error} 
                    />
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
}
