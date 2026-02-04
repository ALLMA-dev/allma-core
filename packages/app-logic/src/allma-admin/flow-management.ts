import {
    AdminPermission, FlowDefinitionSchema, CreateFlowInputSchema, 
    CreateFlowVersionInputSchema, CloneFlowInputSchema, UpdateFlowConfigInputSchema,
    CreateFlowInput,
    StepPayloadUnionSchema,
} from '@allma/core-types';
import { FlowDefinitionService } from './services/flow-definition.service.js';
import { createCrudHandler } from './utils/create-crud-handler.js';
import { z, AnyZodObject } from 'zod';

// --- Start: Partial Schema Generation for StepInstance ---
// This robust approach creates a partial schema for a complex discriminated union
// by making each option in the union partial while preserving the discriminator.

// 1. Create partial versions of each individual schema within the exported `StepPayloadUnionSchema`.
const partialUnionOptions = StepPayloadUnionSchema.options.map((option: AnyZodObject) => 
    option.partial().extend({
        stepType: option.shape.stepType, // This is crucial: re-add the literal discriminator
    })
);

// 2. Reconstruct the `discriminatedUnion` with the new array of partial schemas.
// The `as any` is a necessary evil here due to Zod's complex internal typings for this constructor.
const partialDiscriminatedUnion = z.discriminatedUnion("stepType", partialUnionOptions as any);

// 3. To create the final partial schema, we must also make the other parts of `StepInstanceSchema` partial.
// This is done declaratively, without relying on brittle internal properties, for long-term stability.
const PartialStepInstanceSchema = partialDiscriminatedUnion.and(z.object({
        // This is a partial re-declaration of the common and instance properties.
        customConfig: z.record(z.any()).optional(),
        inputMappings: z.record(z.string()).optional(), // Simplified for partial schema
        outputMappings: z.record(z.string()).optional(), // Simplified for partial schema
        onError: z.any().optional(), // Simplified
        literals: z.record(z.any()).optional(),
        moduleIdentifier: z.string().optional(),
        stepInstanceId: z.string().min(1).optional(),
        stepDefinitionId: z.string().optional().nullable(),
        displayName: z.string().optional(),
        position: z.object({ x: z.number(), y: z.number() }).optional(),
        fill: z.string().optional(),
        transitions: z.array(z.object({
            condition: z.string(),
            nextStepInstanceId: z.string().min(1),
        })).optional(),
        defaultNextStepInstanceId: z.string().min(1).optional(),
        delay: z.any().optional(), // Simplified
        disableS3Offload: z.boolean().optional(),
        forceS3Offload: z.boolean().optional(),
    }).passthrough());
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