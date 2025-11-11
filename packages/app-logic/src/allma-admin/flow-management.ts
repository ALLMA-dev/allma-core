import {
    AdminPermission, FlowDefinitionSchema, CreateFlowInputSchema, 
    CreateFlowVersionInputSchema, CloneFlowInputSchema, UpdateFlowConfigInputSchema,
    CreateFlowInput,
    StepInstanceSchema,
} from '@allma/core-types';
import { FlowDefinitionService } from './services/flow-definition.service.js';
import { createCrudHandler } from './utils/create-crud-handler.js';
import { z, ZodDiscriminatedUnion, AnyZodObject, ZodIntersection } from 'zod';

// --- Start: CORRECT Partial Schema Generation for StepInstance ---
// This function correctly creates a partial schema for a complex discriminated union
// by making each option in the union partial while preserving the discriminator.

// 1. Deconstruct the top-level StepInstanceSchema intersection.
const stepInstanceIntersection = StepInstanceSchema as ZodIntersection<any, any>;
const baseStepDefSchema = stepInstanceIntersection._def.left as ZodIntersection<ZodDiscriminatedUnion<"stepType", any>, AnyZodObject>;
const instancePropertiesSchema = stepInstanceIntersection._def.right as AnyZodObject;

// 2. Deconstruct the BaseStepDefinitionSchema to get the core union and common properties.
const discriminatedUnionSchema = baseStepDefSchema._def.left;
const commonPropertiesSchema = baseStepDefSchema._def.right;

// 3. Create partial versions of each individual schema within the union.
// It's crucial to extend the partial schema to re-include the original `stepType` literal.
// This allows the `discriminatedUnion` to still identify which schema to use.
const partialUnionOptions = discriminatedUnionSchema.options.map((option: AnyZodObject) => 
    option.partial().extend({
        stepType: option.shape.stepType,
    })
);

// 4. Reconstruct the `discriminatedUnion` with the new array of partial schemas.
// The `as any` is a necessary evil here due to Zod's complex internal typings for this constructor.
const partialDiscriminatedUnion = z.discriminatedUnion("stepType", partialUnionOptions as any);

// 5. Combine the new partial union with partial versions of the common properties.
const PartialStepInstanceSchema = z.intersection(
    partialDiscriminatedUnion,
    commonPropertiesSchema.partial()
).and(instancePropertiesSchema.partial());

// --- End: CORRECT Partial Schema Generation ---


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
    // Crucially, override 'steps' to be an optional record of our new, correctly-built PARTIAL StepInstances schema.
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