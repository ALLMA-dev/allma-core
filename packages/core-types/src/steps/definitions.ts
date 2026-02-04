import { z } from 'zod';
import { StepType, StepTypeSchema } from '../common/enums.js';
import * as SystemSteps from './system/index.js';
import { StepInputMappingSchema, StepOutputMappingSchema, StepErrorHandlerSchema, StepDefinitionIdSchema } from './common.js';
import { SystemModuleIdentifiers } from './system-module-identifiers.js';

export const DelayPositionSchema = z.enum(['before', 'after']);
export type DelayPosition = z.infer<typeof DelayPositionSchema>;

/**
 * Configuration for adding a delay before or after a step's execution.
 */
export const DelayOptionsSchema = z.object({
  milliseconds: z.number().int().positive().optional(),
  delayFrom: z.number().int().positive().optional(),
  delayTo: z.number().int().positive().optional(),
  position: DelayPositionSchema.optional().default('after'),
}).superRefine((data, ctx) => {
  if (data.milliseconds && (data.delayFrom || data.delayTo)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cannot specify both 'milliseconds' and 'delayFrom'/'delayTo'.", path: ["milliseconds"] });
  }
  if ((data.delayFrom && !data.delayTo) || (!data.delayFrom && data.delayTo)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "'delayFrom' and 'delayTo' must be specified together.", path: ["delayFrom"] });
  }
  if (data.delayFrom && data.delayTo && data.delayFrom > data.delayTo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "'delayFrom' must be less than or equal to 'delayTo'.", path: ["delayFrom"] });
  }
  if (!data.milliseconds && !data.delayFrom) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Either 'milliseconds' or both 'delayFrom' and 'delayTo' must be provided.", path: ["milliseconds"] });
  }
});
export type DelayOptions = z.infer<typeof DelayOptionsSchema>;


// --- Full Step Definition Schemas (Base + Specific Payload) ---
export const SqsSendStepSchema = SystemSteps.SqsSendStepPayloadSchema;
export const SnsPublishStepSchema = SystemSteps.SnsPublishStepPayloadSchema;
export const EmailStartPointStepSchema = SystemSteps.EmailStartPointStepPayloadSchema;
export const ScheduleStartPointStepSchema = SystemSteps.ScheduleStartPointStepPayloadSchema;

export const LlmInvocationStepSchema = SystemSteps.LlmInvocationStepPayloadSchema;
export const DataLoadStepSchema = SystemSteps.DataLoadStepPayloadSchema;
export const DataSaveStepSchema = SystemSteps.DataSaveStepPayloadSchema;
export const EmailSendStepSchema = SystemSteps.EmailSendStepPayloadSchema;

export const StartFlowExecutionStepSchema = SystemSteps.StartFlowExecutionStepPayloadSchema;
export const DataTransformationStepSchema = SystemSteps.DataTransformationStepPayloadSchema;
export const CustomLogicStepSchema = SystemSteps.CustomLogicStepPayloadSchema;
export const ApiCallStepSchema = SystemSteps.ApiCallStepPayloadSchema;
export const StartSubFlowStepSchema = SystemSteps.StartSubFlowStepPayloadSchema;
export const NoOpStepSchema = SystemSteps.NoOpStepPayloadSchema;
export const EndFlowStepSchema = SystemSteps.EndFlowStepPayloadSchema;
export const WaitForExternalEventStepSchema = SystemSteps.WaitForExternalEventStepPayloadSchema;
export const PollExternalApiStepSchema = SystemSteps.PollExternalApiStepPayloadSchema;
export const CustomLambdaInvokeStepSchema = SystemSteps.CustomLambdaInvokeStepPayloadSchema;
export const ParallelForkManagerStepSchema = SystemSteps.ParallelForkManagerStepPayloadSchema;
export const McpCallStepSchema = SystemSteps.McpCallStepPayloadSchema;
export const FileDownloadStepSchema = SystemSteps.FileDownloadStepPayloadSchema;

/**
 * The core discriminated union of all possible step payloads.
 * Exporting this provides a stable API for manipulating step schemas.
 */
export const StepPayloadUnionSchema = z.discriminatedUnion("stepType", [
  LlmInvocationStepSchema, DataLoadStepSchema, DataSaveStepSchema, DataTransformationStepSchema,
  CustomLogicStepSchema, ApiCallStepSchema, StartSubFlowStepSchema, NoOpStepSchema,
  EndFlowStepSchema, WaitForExternalEventStepSchema, PollExternalApiStepSchema,
  CustomLambdaInvokeStepSchema, ParallelForkManagerStepSchema,
  StartFlowExecutionStepSchema,
  McpCallStepSchema,
  SqsSendStepSchema,
  SnsPublishStepSchema,
  EmailStartPointStepSchema,
  ScheduleStartPointStepSchema,
  EmailSendStepSchema,
  FileDownloadStepSchema,
]);

/**
 * The most abstract schema containing all possible fields for any step type.
 * This is a discriminated union based on `stepType` and forms the foundation for
 * both storable definitions and in-flow instances.
 */
export const BaseStepDefinitionSchema = StepPayloadUnionSchema.and(z.object({
  // Common configuration applicable to most step types.
  customConfig: z.record(z.any()).optional(),
  inputMappings: StepInputMappingSchema.optional(),
  outputMappings: StepOutputMappingSchema.optional(),
  onError: StepErrorHandlerSchema.optional(),
  literals: z.record(z.any()).optional(),
  moduleIdentifier: z.string().optional(),
}).passthrough())
.superRefine((data, ctx) => {
    if (data.stepType === StepType.EMAIL) {
        const emailData = data as any;
        if (emailData.attachments && emailData.attachmentsPath) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Cannot provide both 'attachments' (static list) and 'attachmentsPath' (dynamic path) simultaneously.",
                path: ['attachmentsPath'],
            });
        }
    }
});

/**
 * The main schema for a reusable, storable Step Definition.
 * It combines the base logic/payload with metadata like ID, name, and version.
 */
export const StepDefinitionSchema = BaseStepDefinitionSchema.and(z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  version: z.number().int().positive().optional().default(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})).superRefine((data: any, ctx: z.RefinementCtx) => {
  // This validation applies to ANY system-provided step that has a module identifier.
  if (data.id && data.id.startsWith('system') && data.moduleIdentifier) {
    const normalize = (id: string) => id.toLowerCase().replace(/^([a-z]+)[-/](.*)/, '$1/$2');
    if (normalize(data.id) !== normalize(data.moduleIdentifier)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `For system-provided module definitions, the 'id' must match the 'moduleIdentifier'. Expected '${data.moduleIdentifier}' but got '${data.id}'.`, path: ["id"] });
    }
  }
});

export type StepDefinition = z.infer<typeof StepDefinitionSchema>;

/**
 * Configuration for a specific instance of a step within a flow definition.
 * It is built from the same base as StepDefinitionSchema but includes instance-specific
 * properties like position and transitions, while omitting storage metadata.
 */
export const StepInstanceSchema = BaseStepDefinitionSchema.and(z.object({
  stepInstanceId: z.string().min(1),
  stepDefinitionId: StepDefinitionIdSchema.optional().nullable(),
  displayName: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  fill: z.string().optional(), // UI-specific property
  transitions: z.array(z.object({
    condition: z.string(), // Is JsonPathString but zod struggles with `.or()` in deep merges
    nextStepInstanceId: z.string().min(1),
  })).optional(),
  defaultNextStepInstanceId: z.string().min(1).optional(),
  delay: DelayOptionsSchema.optional(),
  disableS3Offload: z.boolean().optional(),
  forceS3Offload: z.boolean().optional(),
}).passthrough()).superRefine((data, ctx) => {
    // validation to ensure flags are mutually exclusive
    if (data.forceS3Offload && data.disableS3Offload) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "The 'forceS3Offload' and 'disableS3Offload' flags cannot be used at the same time.",
            path: ["forceS3Offload"],
        });
    }
});
export type StepInstance = z.infer<typeof StepInstanceSchema>;


/**
 * A list of system-provided step definitions for UI and backend reference.
 */
export const SYSTEM_STEP_DEFINITIONS: Pick<StepDefinition, 'id' | 'name' | 'stepType' | 'moduleIdentifier'>[] = [
  // System steps with unique StepType (no moduleIdentifier needed for runtime)
  { id: 'system-mcp-call', name: 'MCP Call', stepType: StepTypeSchema.enum.MCP_CALL },
  { id: 'system-api-call', name: 'API Call', stepType: StepTypeSchema.enum.API_CALL },
  { id: 'system-custom-lambda-invoke', name: 'Custom Lambda Invocation', stepType: StepTypeSchema.enum.CUSTOM_LAMBDA_INVOKE },
  { id: 'system-llm-invocation', name: 'LLM Invocation', stepType: StepTypeSchema.enum.LLM_INVOCATION },
  { id: 'system-noop', name: 'No-Op', stepType: StepTypeSchema.enum.NO_OP },
  { id: 'system-parallel-fork-manager', name: 'Parallel Fork Manager', stepType: StepTypeSchema.enum.PARALLEL_FORK_MANAGER },
  { id: 'system-poll-external-api', name: 'Poll External API', stepType: StepTypeSchema.enum.POLL_EXTERNAL_API },
  { id: 'system-start-sub-flow', name: 'Start Sub-Flow', stepType: StepTypeSchema.enum.START_SUB_FLOW },
  { id: 'system-wait-for-external-event', name: 'Wait for External Event', stepType: StepTypeSchema.enum.WAIT_FOR_EXTERNAL_EVENT },
  { id: 'system-email-start-point', name: 'Email Start Point', stepType: StepTypeSchema.enum.EMAIL_START_POINT },
  { id: 'system-schedule-start-point', name: 'Schedule Start Point', stepType: StepTypeSchema.enum.SCHEDULE_START_POINT },
  { id: 'system-email-send', name: 'Send Email', stepType: StepTypeSchema.enum.EMAIL },

  // System steps with a required moduleIdentifier
  { id: 'system-ddb-query-to-s3-manifest', name: 'DDB Query to S3 Manifest', stepType: StepTypeSchema.enum.DATA_LOAD, moduleIdentifier: SystemModuleIdentifiers.DDB_QUERY_TO_S3_MANIFEST },
  { id: 'system-dynamodb-data-loader', name: 'DynamoDB Data Loader', stepType: StepTypeSchema.enum.DATA_LOAD, moduleIdentifier: SystemModuleIdentifiers.DYNAMODB_DATA_LOADER },
  { id: 'system-s3-data-loader', name: 'S3 Data Loader', stepType: StepTypeSchema.enum.DATA_LOAD, moduleIdentifier: SystemModuleIdentifiers.S3_DATA_LOADER },
  { id: 'system-s3-list-files', name: 'S3 List Files', stepType: StepTypeSchema.enum.DATA_LOAD, moduleIdentifier: SystemModuleIdentifiers.S3_LIST_FILES },
  { id: 'system-sqs-get-queue-attributes', name: 'SQS Get Queue Attributes', stepType: StepTypeSchema.enum.DATA_LOAD, moduleIdentifier: SystemModuleIdentifiers.SQS_GET_QUEUE_ATTRIBUTES },
  { id: 'system-sqs-receive-messages', name: 'SQS Receive Messages', stepType: StepTypeSchema.enum.DATA_LOAD, moduleIdentifier: SystemModuleIdentifiers.SQS_RECEIVE_MESSAGES },
  { id: 'system-dynamodb-query-and-update', name: 'DynamoDB Query and Update', stepType: StepTypeSchema.enum.DATA_SAVE, moduleIdentifier: SystemModuleIdentifiers.DYNAMODB_QUERY_AND_UPDATE },
  { id: 'system-dynamodb-update-item', name: 'DynamoDB Update Item', stepType: StepTypeSchema.enum.DATA_SAVE, moduleIdentifier: SystemModuleIdentifiers.DYNAMODB_UPDATE_ITEM },
  { id: 'system-s3-data-saver', name: 'S3 Data Saver', stepType: StepTypeSchema.enum.DATA_SAVE, moduleIdentifier: SystemModuleIdentifiers.S3_DATA_SAVER },
  { id: 'system-sns-publish', name: 'SNS Publish Message', stepType: StepTypeSchema.enum.SNS_PUBLISH, moduleIdentifier: SystemModuleIdentifiers.SNS_PUBLISH },
  { id: 'system-sqs-send', name: 'SQS Send Message', stepType: StepTypeSchema.enum.SQS_SEND, moduleIdentifier: SystemModuleIdentifiers.SQS_SEND },
  { id: 'system-start-flow-execution', name: 'Start Flow Execution', stepType: StepTypeSchema.enum.START_FLOW_EXECUTION, moduleIdentifier: SystemModuleIdentifiers.START_FLOW_EXECUTION },
  { id: 'system-array-aggregator', name: 'Array Aggregator', stepType: StepTypeSchema.enum.DATA_TRANSFORMATION, moduleIdentifier: SystemModuleIdentifiers.ARRAY_AGGREGATOR },
  { id: 'system-compose-object-from-input', name: 'Compose Object', stepType: StepTypeSchema.enum.DATA_TRANSFORMATION, moduleIdentifier: SystemModuleIdentifiers.COMPOSE_OBJECT_FROM_INPUT },
  { id: 'system-date-time-calculator', name: 'Date/Time Calculator', stepType: StepTypeSchema.enum.DATA_TRANSFORMATION, moduleIdentifier: SystemModuleIdentifiers.DATE_TIME_CALCULATOR },
  { id: 'system-flatten-array', name: 'Flatten Array', stepType: StepTypeSchema.enum.DATA_TRANSFORMATION, moduleIdentifier: SystemModuleIdentifiers.FLATTEN_ARRAY },
  { id: 'system-generate-array', name: 'Generate Array', stepType: StepTypeSchema.enum.DATA_TRANSFORMATION, moduleIdentifier: SystemModuleIdentifiers.GENERATE_ARRAY },
  { id: 'system-file-download', name: 'File Download', stepType: StepTypeSchema.enum.FILE_DOWNLOAD, moduleIdentifier: SystemModuleIdentifiers.FILE_DOWNLOAD },
  { id: 'system-join-data', name: 'Join Data', stepType: StepTypeSchema.enum.DATA_TRANSFORMATION, moduleIdentifier: SystemModuleIdentifiers.JOIN_DATA },
  { id: 'system-generate-uuid', name: 'Generate UUID', stepType: StepTypeSchema.enum.DATA_TRANSFORMATION, moduleIdentifier: SystemModuleIdentifiers.GENERATE_UUID },
];