import { 
    StepType, 
    LlmInvocationStepSchema,
    ApiCallStepSchema,
    DataLoadStepSchema,
    DataSaveStepSchema,
    DataTransformationStepSchema,
    NoOpStepSchema,
    WaitForExternalEventStepSchema,
    PollExternalApiStepSchema,
    CustomLambdaInvokeStepSchema,
    StepInstanceSchema,
    StepDefinitionSchema,
    BaseStepDefinitionSchema,
    EmailSendStepSchema,
    SqsSendStepSchema,
    SnsPublishStepSchema,
    EmailStartPointStepSchema,
    ScheduleStartPointStepPayloadSchema,
    McpCallStepSchema
} from '@allma/core-types';
import { z } from 'zod';

/**
 * A programmatically generated set of all keys defined in any step-related Zod schema.
 * This serves as the single source of truth for filtering out schema-defined fields
 * from the "Additional Parameters" section in the UI, ensuring only user-defined
 * custom parameters are displayed.
 */
export const ALL_STEP_SCHEMA_KEYS = (() => {
    const allKeys = new Set<string>();

    const addKeysFromSchema = (schema: z.ZodTypeAny): void => {
        if (!schema) return;

        // Handle wrapper schemas by recursively calling this function with the inner type
        if (schema instanceof z.ZodEffects) {
            return addKeysFromSchema(schema.innerType());
        }
        if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
            return addKeysFromSchema(schema.unwrap());
        }

        // Handle schemas that branch into multiple possibilities
        if (schema instanceof z.ZodIntersection) {
            addKeysFromSchema(schema._def.left);
            addKeysFromSchema(schema._def.right);
            return;
        }
        if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
            schema.options.forEach(addKeysFromSchema);
            return;
        }

        // Base case: If we've reached a ZodObject, extract its keys
        if (schema instanceof z.ZodObject) {
            Object.keys(schema.shape).forEach(key => allKeys.add(key));
        }
    };

    // Introspect all the core schemas to build the comprehensive key set
    addKeysFromSchema(StepInstanceSchema);
    addKeysFromSchema(StepDefinitionSchema);
    addKeysFromSchema(BaseStepDefinitionSchema);

    return allKeys;
})();

// A map from our StepType enum to the corresponding Zod schema.
// This is the core of the schema-driven approach.
const stepSchemaMap: Partial<Record<StepType, z.ZodObject<any, any>>> = {
    [StepType.LLM_INVOCATION]: LlmInvocationStepSchema,
    [StepType.API_CALL]: ApiCallStepSchema,
    [StepType.DATA_LOAD]: DataLoadStepSchema,
    [StepType.DATA_SAVE]: DataSaveStepSchema,
    [StepType.DATA_TRANSFORMATION]: DataTransformationStepSchema,
    [StepType.NO_OP]: NoOpStepSchema,
    [StepType.WAIT_FOR_EXTERNAL_EVENT]: WaitForExternalEventStepSchema,
    [StepType.POLL_EXTERNAL_API]: PollExternalApiStepSchema,
    [StepType.CUSTOM_LAMBDA_INVOKE]: CustomLambdaInvokeStepSchema,
    [StepType.EMAIL]: EmailSendStepSchema,
    [StepType.SQS_SEND]: SqsSendStepSchema,
    [StepType.SNS_PUBLISH]: SnsPublishStepSchema,
    [StepType.EMAIL_START_POINT]: EmailStartPointStepSchema,
    [StepType.SCHEDULE_START_POINT]: ScheduleStartPointStepPayloadSchema,
    [StepType.MCP_CALL]: McpCallStepSchema,
    // Add other step types here as they are created
};

// A fallback schema for step types that don't have a specific form definition yet.
const fallbackSchema = z.object({
    // No fields, as this is just a fallback for unknown step types
    // where all config will be in "Additional Parameters" or "Instance Overrides".
});

// These are fields on the StepDefinition that are NOT part of the editable FlowStepInstanceConfig
const DEFINITION_ONLY_FIELDS = {
    id: true,
    name: true,
    version: true,
    createdAt: true,
    updatedAt: true,
} as const;

/**
 * Gets the Zod schema for a given step type.
 * @param stepType The type of the step.
 * @returns The corresponding Zod schema, or a fallback schema if not found.
 */
export function getStepSchema(stepType: StepType): z.ZodObject<any, any> {
    const baseSchema = stepSchemaMap[stepType] || fallbackSchema;
    // Omit the definition-only fields from the schema used for form validation.
    // This aligns the validation schema with the data structure being edited (FlowStepInstanceConfig),
    // which was causing silent validation failures on form submission because fields like `id` and `name` were required but not present.

    // Cast to a generic ZodObject to resolve the complex union type issue for the .omit() call.
    // This is necessary because TypeScript cannot unify the .omit method signatures across all
    // the different step schemas in the `stepSchemaMap`.
    return (baseSchema as z.ZodObject<any, any>).omit(DEFINITION_ONLY_FIELDS);
}

/**
 * Parses the UI metadata from a Zod schema's description string.
 * Format: "Label|ComponentType|PlaceholderText"
 */
export function parseDescription(description: string | undefined): { label: string, componentType: string, placeholder: string } {
    if (!description) return { label: 'Unknown Field', componentType: 'text', placeholder: '' };
    const [label, componentType = 'text', placeholder = ''] = description.split('|');
    return { label, componentType, placeholder };
}

/**
 * A set of field names that should NOT be rendered by the generic form renderer
 * when it's being used inside the Flow Editor's side panel, because those
 * fields are handled by other, more specialized UI components in that context.
 */
export const STEP_SCHEMA_EXCLUDED_FIELDS = new Set([
    'id', 'name', 'description', 'version', 'createdAt', 'updatedAt', // Base fields
    'stepType', // Handled by the node itself
    'stepInstanceId', // This is the node ID, not editable in the form
    'displayName', // This is special-cased as the node's label
    
    // These are handled in dedicated UI components within the editor panel
    'inputMappings', 'outputMappings', 'defaultNextStepInstanceId', 'transitions', 'onError', 'literals',
    'llmProvider', // Special-cased in the renderer
    'mcpConnectionId', 
    'toolName',
    'moduleIdentifier',
    'fill', // This is a UI-only property managed by the color picker
    'customConfig', // Handled by a dedicated Accordion item
    'inferenceParameters'
]);
