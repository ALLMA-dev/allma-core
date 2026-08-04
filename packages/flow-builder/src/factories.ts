import { z } from 'zod';
import {
  StepType,
  SystemModuleIdentifiers,
  // Leaf payload schemas (typed-payload steps)
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
  // Registry customConfig schemas (module wrappers)
  S3DataLoaderCustomConfigSchema,
  DynamoDBLoaderCustomConfigSchema,
  S3DataSaverCustomConfigSchema,
  DdbQueryToS3ManifestCustomConfigSchema,
  S3ListFilesCustomConfigSchema,
  SqsGetQueueAttributesCustomConfigSchema,
  SqsReceiveMessagesCustomConfigSchema,
  DynamoDBQueryAndUpdateCustomConfigSchema,
  DynamoDBUpdateItemCustomConfigSchema,
  ArrayAggregatorCustomConfigSchema,
  ComposeObjectFromInputCustomConfigSchema,
  DateTimeCalculatorCustomConfigSchema,
  FlattenArrayCustomConfigSchema,
  GenerateArrayCustomConfigSchema,
  JoinDataCustomConfigSchema,
  GenerateUuidCustomConfigSchema,
} from '@allma/core-types';
import { Step, type StepDraft } from './step.js';
import { MODULE_STEP_TYPE } from './registry.js';

/**
 * The config a factory accepts: the leaf payload's input shape minus the
 * `stepType` discriminant (the factory supplies that). Derived **per leaf
 * schema**, never across the union — the key TS7056-avoidance rule (RFC §9).
 */
type LeafConfig<S extends z.ZodTypeAny> = Omit<z.input<S>, 'stepType' | 'moduleIdentifier'>;

const typedStep = (stepType: StepType, config: Record<string, unknown>): StepDraft =>
  new Step(stepType, { ...config });

const moduleStep = (moduleIdentifier: string, customConfig: unknown): StepDraft => {
  const stepType = MODULE_STEP_TYPE[moduleIdentifier];
  if (!stepType) {
    throw new Error(`Unknown system module wrapper for '${moduleIdentifier}'.`);
  }
  return new Step(stepType, { moduleIdentifier, customConfig });
};

// --- Typed-payload factories (one per non-module StepType) ---------------------

export const llmInvocation = (config: LeafConfig<typeof LlmInvocationStepSchema>): StepDraft =>
  typedStep(StepType.LLM_INVOCATION, config);

export const apiCall = (config: LeafConfig<typeof ApiCallStepSchema>): StepDraft =>
  typedStep(StepType.API_CALL, config);

export const mcpCall = (config: LeafConfig<typeof McpCallStepSchema>): StepDraft =>
  typedStep(StepType.MCP_CALL, config);

export const customLambdaInvoke = (config: LeafConfig<typeof CustomLambdaInvokeStepSchema>): StepDraft =>
  typedStep(StepType.CUSTOM_LAMBDA_INVOKE, config);

export const parallelForkManager = (config: LeafConfig<typeof ParallelForkManagerStepSchema>): StepDraft =>
  typedStep(StepType.PARALLEL_FORK_MANAGER, config);

export const startSubFlow = (config: LeafConfig<typeof StartSubFlowStepSchema>): StepDraft =>
  typedStep(StepType.START_SUB_FLOW, config);

export const startFlowExecution = (config: LeafConfig<typeof StartFlowExecutionStepSchema>): StepDraft =>
  typedStep(StepType.START_FLOW_EXECUTION, config);

export const noOp = (config: LeafConfig<typeof NoOpStepSchema> = {}): StepDraft =>
  typedStep(StepType.NO_OP, config);

export const endFlow = (config: LeafConfig<typeof EndFlowStepSchema> = {}): StepDraft =>
  typedStep(StepType.END_FLOW, config);

export const waitForExternalEvent = (config: LeafConfig<typeof WaitForExternalEventStepSchema>): StepDraft =>
  typedStep(StepType.WAIT_FOR_EXTERNAL_EVENT, config);

export const pollExternalApi = (config: LeafConfig<typeof PollExternalApiStepSchema>): StepDraft =>
  typedStep(StepType.POLL_EXTERNAL_API, config);

export const sqsSend = (config: LeafConfig<typeof SqsSendStepSchema>): StepDraft =>
  typedStep(StepType.SQS_SEND, config);

export const snsPublish = (config: LeafConfig<typeof SnsPublishStepSchema>): StepDraft =>
  typedStep(StepType.SNS_PUBLISH, config);

export const emailSend = (config: LeafConfig<typeof EmailSendStepSchema>): StepDraft =>
  typedStep(StepType.EMAIL, config);

export const emailStartPoint = (config: LeafConfig<typeof EmailStartPointStepSchema>): StepDraft =>
  typedStep(StepType.EMAIL_START_POINT, config);

export const scheduleStartPoint = (config: LeafConfig<typeof ScheduleStartPointStepSchema>): StepDraft =>
  typedStep(StepType.SCHEDULE_START_POINT, config);

export const fileDownload = (config: LeafConfig<typeof FileDownloadStepSchema>): StepDraft =>
  typedStep(StepType.FILE_DOWNLOAD, config);

// --- Generic module escape hatches (any module, opaque customConfig) -----------

interface ModuleEscapeHatch {
  moduleIdentifier: string;
  customConfig?: Record<string, unknown>;
}

const escapeHatch = (stepType: StepType, { moduleIdentifier, customConfig }: ModuleEscapeHatch): StepDraft =>
  new Step(stepType, {
    moduleIdentifier,
    ...(customConfig !== undefined ? { customConfig } : {}),
  });

export const dataLoad = (config: ModuleEscapeHatch): StepDraft => escapeHatch(StepType.DATA_LOAD, config);
export const dataSave = (config: ModuleEscapeHatch): StepDraft => escapeHatch(StepType.DATA_SAVE, config);
export const dataTransform = (config: ModuleEscapeHatch): StepDraft =>
  escapeHatch(StepType.DATA_TRANSFORMATION, config);
export const customLogic = (config: ModuleEscapeHatch): StepDraft => escapeHatch(StepType.CUSTOM_LOGIC, config);

// --- Registry-typed module wrappers (one per registered system module) ---------

export const s3DataLoad = (customConfig: z.input<typeof S3DataLoaderCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.S3_DATA_LOADER, customConfig);

export const dynamoDataLoad = (customConfig: z.input<typeof DynamoDBLoaderCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.DYNAMODB_DATA_LOADER, customConfig);

export const ddbQueryToS3Manifest = (customConfig: z.input<typeof DdbQueryToS3ManifestCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.DDB_QUERY_TO_S3_MANIFEST, customConfig);

export const s3ListFiles = (customConfig: z.input<typeof S3ListFilesCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.S3_LIST_FILES, customConfig);

export const sqsGetQueueAttributes = (customConfig: z.input<typeof SqsGetQueueAttributesCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.SQS_GET_QUEUE_ATTRIBUTES, customConfig);

export const sqsReceiveMessages = (customConfig: z.input<typeof SqsReceiveMessagesCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.SQS_RECEIVE_MESSAGES, customConfig);

export const s3DataSave = (customConfig: z.input<typeof S3DataSaverCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.S3_DATA_SAVER, customConfig);

export const dynamoUpdateItem = (customConfig: z.input<typeof DynamoDBUpdateItemCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.DYNAMODB_UPDATE_ITEM, customConfig);

export const dynamoQueryAndUpdate = (customConfig: z.input<typeof DynamoDBQueryAndUpdateCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.DYNAMODB_QUERY_AND_UPDATE, customConfig);

export const arrayAggregator = (customConfig: z.input<typeof ArrayAggregatorCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.ARRAY_AGGREGATOR, customConfig);

export const composeObjectFromInput = (customConfig: z.input<typeof ComposeObjectFromInputCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.COMPOSE_OBJECT_FROM_INPUT, customConfig);

export const dateTimeCalculator = (customConfig: z.input<typeof DateTimeCalculatorCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.DATE_TIME_CALCULATOR, customConfig);

export const flattenArray = (customConfig: z.input<typeof FlattenArrayCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.FLATTEN_ARRAY, customConfig);

export const generateArray = (customConfig: z.input<typeof GenerateArrayCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.GENERATE_ARRAY, customConfig);

export const joinData = (customConfig: z.input<typeof JoinDataCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.JOIN_DATA, customConfig);

export const generateUuid = (customConfig: z.input<typeof GenerateUuidCustomConfigSchema>): StepDraft =>
  moduleStep(SystemModuleIdentifiers.GENERATE_UUID, customConfig);

/**
 * Registry of typed-payload factories keyed by `StepType`. Used by the
 * completeness test to assert every non-module `StepType` has a factory, so a
 * newly added step type without one fails CI.
 */
export const TYPED_STEP_FACTORIES: Partial<Record<StepType, (config: never) => StepDraft>> = {
  [StepType.LLM_INVOCATION]: llmInvocation,
  [StepType.API_CALL]: apiCall,
  [StepType.MCP_CALL]: mcpCall,
  [StepType.CUSTOM_LAMBDA_INVOKE]: customLambdaInvoke,
  [StepType.PARALLEL_FORK_MANAGER]: parallelForkManager,
  [StepType.START_SUB_FLOW]: startSubFlow,
  [StepType.START_FLOW_EXECUTION]: startFlowExecution,
  [StepType.NO_OP]: noOp,
  [StepType.END_FLOW]: endFlow,
  [StepType.WAIT_FOR_EXTERNAL_EVENT]: waitForExternalEvent,
  [StepType.POLL_EXTERNAL_API]: pollExternalApi,
  [StepType.SQS_SEND]: sqsSend,
  [StepType.SNS_PUBLISH]: snsPublish,
  [StepType.EMAIL]: emailSend,
  [StepType.EMAIL_START_POINT]: emailStartPoint,
  [StepType.SCHEDULE_START_POINT]: scheduleStartPoint,
  [StepType.FILE_DOWNLOAD]: fileDownload,
};

/** The four generic module escape-hatch factories keyed by their `StepType`. */
export const MODULE_ESCAPE_HATCHES: Record<string, (config: ModuleEscapeHatch) => StepDraft> = {
  [StepType.DATA_LOAD]: dataLoad,
  [StepType.DATA_SAVE]: dataSave,
  [StepType.DATA_TRANSFORMATION]: dataTransform,
  [StepType.CUSTOM_LOGIC]: customLogic,
};

/**
 * Registry of typed module wrappers keyed by `moduleIdentifier`. Used by the
 * completeness test to assert every module in `SYSTEM_MODULE_CONFIG_SCHEMAS` has
 * a wrapper.
 */
export const MODULE_WRAPPERS: Record<string, (config: never) => StepDraft> = {
  [SystemModuleIdentifiers.S3_DATA_LOADER]: s3DataLoad,
  [SystemModuleIdentifiers.DYNAMODB_DATA_LOADER]: dynamoDataLoad,
  [SystemModuleIdentifiers.DDB_QUERY_TO_S3_MANIFEST]: ddbQueryToS3Manifest,
  [SystemModuleIdentifiers.S3_LIST_FILES]: s3ListFiles,
  [SystemModuleIdentifiers.SQS_GET_QUEUE_ATTRIBUTES]: sqsGetQueueAttributes,
  [SystemModuleIdentifiers.SQS_RECEIVE_MESSAGES]: sqsReceiveMessages,
  [SystemModuleIdentifiers.S3_DATA_SAVER]: s3DataSave,
  [SystemModuleIdentifiers.DYNAMODB_UPDATE_ITEM]: dynamoUpdateItem,
  [SystemModuleIdentifiers.DYNAMODB_QUERY_AND_UPDATE]: dynamoQueryAndUpdate,
  [SystemModuleIdentifiers.ARRAY_AGGREGATOR]: arrayAggregator,
  [SystemModuleIdentifiers.COMPOSE_OBJECT_FROM_INPUT]: composeObjectFromInput,
  [SystemModuleIdentifiers.DATE_TIME_CALCULATOR]: dateTimeCalculator,
  [SystemModuleIdentifiers.FLATTEN_ARRAY]: flattenArray,
  [SystemModuleIdentifiers.GENERATE_ARRAY]: generateArray,
  [SystemModuleIdentifiers.JOIN_DATA]: joinData,
  [SystemModuleIdentifiers.GENERATE_UUID]: generateUuid,
};
