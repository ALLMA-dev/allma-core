import { z } from 'zod';
import {
  StepType,
  SystemModuleIdentifiers,
  SYSTEM_MODULE_CONFIG_SCHEMAS,
  // Leaf payload schemas (one per typed-payload StepType)
  LlmInvocationStepSchema,
  ApiCallStepSchema,
  McpCallStepSchema,
  CustomLambdaInvokeStepSchema,
  ParallelForkManagerStepSchema,
  StartSubFlowStepSchema,
  StartFlowExecutionStepSchema,
  NoOpStepSchema,
  EndFlowStepSchema,
  WaitForExternalEventStepSchema,
  PollExternalApiStepSchema,
  SqsSendStepSchema,
  SnsPublishStepSchema,
  EmailSendStepSchema,
  EmailStartPointStepSchema,
  ScheduleStartPointStepSchema,
  FileDownloadStepSchema,
  DataLoadStepSchema,
  DataSaveStepSchema,
  DataTransformationStepSchema,
  CustomLogicStepSchema,
} from '@allma/core-types';

/**
 * Maps every {@link StepType} to its leaf payload schema. The build-time strict
 * gate parses each emitted step's payload against `.strict()` clone of this
 * schema to catch unknown keys (a tighter check than the persisted
 * `.passthrough()` schemas allow). Keeping this map exhaustive is enforced by
 * the package's completeness test.
 *
 * Typed via the loose `z.ZodObject` shape so the map does not re-instantiate the
 * heavy union type (TS7056 avoidance — see the package README / RFC §9).
 */
export const LEAF_SCHEMA_BY_STEP_TYPE: Record<StepType, z.AnyZodObject> = {
  [StepType.LLM_INVOCATION]: LlmInvocationStepSchema,
  [StepType.API_CALL]: ApiCallStepSchema,
  [StepType.MCP_CALL]: McpCallStepSchema,
  [StepType.CUSTOM_LAMBDA_INVOKE]: CustomLambdaInvokeStepSchema,
  [StepType.PARALLEL_FORK_MANAGER]: ParallelForkManagerStepSchema,
  [StepType.START_SUB_FLOW]: StartSubFlowStepSchema,
  [StepType.START_FLOW_EXECUTION]: StartFlowExecutionStepSchema,
  [StepType.NO_OP]: NoOpStepSchema,
  [StepType.END_FLOW]: EndFlowStepSchema,
  [StepType.WAIT_FOR_EXTERNAL_EVENT]: WaitForExternalEventStepSchema,
  [StepType.POLL_EXTERNAL_API]: PollExternalApiStepSchema,
  [StepType.SQS_SEND]: SqsSendStepSchema,
  [StepType.SNS_PUBLISH]: SnsPublishStepSchema,
  [StepType.EMAIL]: EmailSendStepSchema,
  [StepType.EMAIL_START_POINT]: EmailStartPointStepSchema,
  [StepType.SCHEDULE_START_POINT]: ScheduleStartPointStepSchema,
  [StepType.FILE_DOWNLOAD]: FileDownloadStepSchema,
  [StepType.DATA_LOAD]: DataLoadStepSchema,
  [StepType.DATA_SAVE]: DataSaveStepSchema,
  [StepType.DATA_TRANSFORMATION]: DataTransformationStepSchema,
  [StepType.CUSTOM_LOGIC]: CustomLogicStepSchema,
};

/** The four module-identifier step types that carry a `moduleIdentifier` + `customConfig`. */
export const MODULE_STEP_TYPES = [
  StepType.DATA_LOAD,
  StepType.DATA_SAVE,
  StepType.DATA_TRANSFORMATION,
  StepType.CUSTOM_LOGIC,
] as const;

/**
 * The `StepType` each registered system module is used by. Drives the generated
 * typed module wrappers (§5.4). Only modules present in
 * `SYSTEM_MODULE_CONFIG_SCHEMAS` get a wrapper; everything else uses the generic
 * escape hatch.
 */
export const MODULE_STEP_TYPE: Record<string, StepType> = {
  [SystemModuleIdentifiers.S3_DATA_LOADER]: StepType.DATA_LOAD,
  [SystemModuleIdentifiers.DYNAMODB_DATA_LOADER]: StepType.DATA_LOAD,
  [SystemModuleIdentifiers.DDB_QUERY_TO_S3_MANIFEST]: StepType.DATA_LOAD,
  [SystemModuleIdentifiers.S3_LIST_FILES]: StepType.DATA_LOAD,
  [SystemModuleIdentifiers.SQS_GET_QUEUE_ATTRIBUTES]: StepType.DATA_LOAD,
  [SystemModuleIdentifiers.SQS_RECEIVE_MESSAGES]: StepType.DATA_LOAD,
  [SystemModuleIdentifiers.S3_DATA_SAVER]: StepType.DATA_SAVE,
  [SystemModuleIdentifiers.DYNAMODB_UPDATE_ITEM]: StepType.DATA_SAVE,
  [SystemModuleIdentifiers.DYNAMODB_QUERY_AND_UPDATE]: StepType.DATA_SAVE,
  [SystemModuleIdentifiers.ARRAY_AGGREGATOR]: StepType.DATA_TRANSFORMATION,
  [SystemModuleIdentifiers.COMPOSE_OBJECT_FROM_INPUT]: StepType.DATA_TRANSFORMATION,
  [SystemModuleIdentifiers.DATE_TIME_CALCULATOR]: StepType.DATA_TRANSFORMATION,
  [SystemModuleIdentifiers.FLATTEN_ARRAY]: StepType.DATA_TRANSFORMATION,
  [SystemModuleIdentifiers.GENERATE_ARRAY]: StepType.DATA_TRANSFORMATION,
  [SystemModuleIdentifiers.JOIN_DATA]: StepType.DATA_TRANSFORMATION,
  [SystemModuleIdentifiers.GENERATE_UUID]: StepType.DATA_TRANSFORMATION,
};

/** Returns the registry `customConfig` schema for a module, or `undefined` if opaque. */
export function moduleConfigSchema(moduleIdentifier: string): z.ZodTypeAny | undefined {
  return (SYSTEM_MODULE_CONFIG_SCHEMAS as Record<string, z.ZodTypeAny>)[moduleIdentifier];
}
