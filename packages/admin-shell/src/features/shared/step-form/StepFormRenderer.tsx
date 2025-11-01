import { z } from 'zod';
import { StepDefinition, StepInstance, StepType } from '@allma/core-types';
import { UseFormReturnType } from '@mantine/form';
import { GenericStepFormFields } from './GenericStepFormFields';
import { McpCallStepFormFields } from '../../flows/editor/components/editor-panel/step-forms/McpCallStepFormFields';

interface StepFormRendererProps {
    schema: z.ZodObject<any, any>;
    form: UseFormReturnType<StepInstance | Partial<StepDefinition>>;
    readOnly: boolean;
    onPreviewPrompt: (promptId: string) => void;
    isFieldInherited?: (key: string) => boolean;
    appliedDefinition: StepDefinition | null;
    /** An optional set of field names to exclude from rendering. */
    excludeFields?: Set<string>;
    variant: 'instance' | 'create-definition' | 'edit-definition';
    onDelete?: () => void;
    createChangeHandler: (key: string) => (newValue: any) => void;
    customConfigDoc?: string;
    commonMappingsErrors: {
        inputMappings: React.ReactNode | null;
        outputMappings: React.ReactNode | null;
        literals: React.ReactNode | null;
    };
    onErrorError: React.ReactNode | null;
}

export function StepFormRenderer(props: StepFormRendererProps) {
    const { form } = props;

    const renderStepSpecificFields = () => {
        switch (form.values.stepType) {
            case StepType.MCP_CALL:
                return <McpCallStepFormFields {...props} />;
            default:
                return <GenericStepFormFields {...props} />;
        }
    };

    return renderStepSpecificFields();
}
