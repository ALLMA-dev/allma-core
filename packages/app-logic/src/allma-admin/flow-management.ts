import {
    AdminPermission, FlowDefinitionSchema, CreateFlowInputSchema, 
    CreateFlowVersionInputSchema, CloneFlowInputSchema, UpdateFlowConfigInputSchema,
    CreateFlowInput,
    StepInstanceSchema,
    StepTypeSchema,
} from '@allma/core-types';
import { FlowDefinitionService } from './services/flow-definition.service.js';
import { createCrudHandler } from './utils/create-crud-handler.js';
import { z, AnyZodObject, ZodDiscriminatedUnion, ZodIntersection } from 'zod';

// --- Start: Partial Schema Generation for StepInstance ---
// StepInstanceSchema is a complex ZodIntersection of a ZodDiscriminatedUnion and other ZodObjects.
// To create a partial schema for patch updates, we must deconstruct it and build a new schema.

// 1. Deconstruct the top-level intersection of StepInstanceSchema.
const baseStepDefSchema = StepInstanceSchema._def.left as ZodIntersection<ZodDiscriminatedUnion<any, any>, AnyZodObject>;
const instancePropertiesSchema = StepInstanceSchema._def.right as AnyZodObject;

// 2. Deconstruct the BaseStepDefinitionSchema intersection.
const discriminatedUnionSchema = baseStepDefSchema._def.left;
const commonPropertiesSchema = baseStepDefSchema._def.right;

// 3. Get the shape from all possible options in the discriminated union.
const allDuShapes = discriminatedUnionSchema.options.reduce((acc: any, schema: AnyZodObject) => {
    // Omit the discriminator key ('stepType') to avoid conflicts during merge.
    const { [discriminatedUnionSchema.discriminator]: _, ...rest } = schema.shape;
    return { ...acc, ...rest };
}, {});

// 4. Combine all shapes into a single shape definition.
const combinedShape = {
    ...allDuShapes,
    ...commonPropertiesSchema.shape,
    ...instancePropertiesSchema.shape,
    // Add the discriminator back, but as a general enum, not a specific literal.
    // This allows Zod to keep the `stepType` field during parsing.
    [discriminatedUnionSchema.discriminator]: StepTypeSchema,
};

// 5. Create a new ZodObject from the unified shape and make it deeply partial.
// This is the correct schema for validating a partial patch of a StepInstance.
const PartialStepInstanceSchema = z.object(combinedShape).deepPartial();
// --- End: Partial Schema Generation ---

// Get the base ZodObject from the ZodEffects (created by .superRefine on FlowDefinitionSchema)
// to allow using methods like .omit() and .partial().
const flowDefinitionObjectSchema = (FlowDefinitionSchema._def as any).schema as z.ZodObject<any>;

// Schema for updating a draft version of a flow.
const UpdateFlowVersionInputSchema = flowDefinitionObjectSchema
  .omit({
    id: true,
    version: true,
    isPublished: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Crucially, override 'steps' to be an optional record of our new PARTIAL StepInstances schema.
    // This allows the UI to send just the changes for a single step or a subset of steps.
    steps: z.record(z.string().min(1), PartialStepInstanceSchema).optional(),
  })
  .partial(); // Make all other top-level fields (like description, startStepInstanceId) optional.

/**
 * Main handler for all Flow Definition management API requests.
 * This handler is created by a generic factory, which wires up all the necessary
 * routing, validation, and service calls based on the provided configuration.
 */
export const handler = createCrudHandler({
    isVersioned: true,
    service: {
        listMasters: FlowDefinitionService.listMasters,
        listTags: FlowDefinitionService.getAllTags,
        create: async (input: CreateFlowInput) => {
            const { metadata } = await FlowDefinitionService.createFlow(input);
            return metadata;
        },
        clone: FlowDefinitionService.clone,
        getMaster: FlowDefinitionService.getMaster,
        updateMaster: FlowDefinitionService.updateMaster,
        listVersions: FlowDefinitionService.listVersions,
        createVersion: FlowDefinitionService.createVersion,
        getVersion: FlowDefinitionService.getVersion,
        updateVersion: FlowDefinitionService.updateVersion,
        publishVersion: FlowDefinitionService.publishVersion,
        unpublishVersion: FlowDefinitionService.unpublishVersion,
        deleteVersion: FlowDefinitionService.deleteVersion,
    },
    schemas: {
        createMaster: CreateFlowInputSchema,
        updateMaster: UpdateFlowConfigInputSchema,
        cloneMaster: CloneFlowInputSchema,
        createVersion: CreateFlowVersionInputSchema,
        updateVersion: UpdateFlowVersionInputSchema,
    },
    permissions: {
        read: AdminPermission.DEFINITIONS_READ,
        write: AdminPermission.DEFINITIONS_WRITE,
        delete: AdminPermission.DEFINITIONS_DELETE,
    },
    basePath: '/allma/flows',
    idParamName: 'flowId',
    versionParamName: 'versionNumber',
});
