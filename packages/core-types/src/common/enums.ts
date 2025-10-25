import { z } from 'zod';

/**
 * Supported HTTP methods for API call steps and actions.
 */
export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH',
    HEAD = 'HEAD',
    OPTIONS = 'OPTIONS',
}
export const HttpMethodEnumSchema = z.nativeEnum(HttpMethod);


/**
 * Defines the type of action the Step Functions orchestrator should take next.
 */
export enum SfnActionType {
  PROCESS_STEP = 'PROCESS_STEP',
  WAIT_FOR_EXTERNAL_EVENT = 'WAIT_FOR_EXTERNAL_EVENT',
  POLL_EXTERNAL_API = 'POLL_EXTERNAL_API',
  PARALLEL_FORK = 'PARALLEL_FORK',
  PARALLEL_AGGREGATE = 'PARALLEL_AGGREGATE',
  PARALLEL_FORK_S3 = 'PARALLEL_FORK_S3',
}
export const SfnActionTypeSchema = z.nativeEnum(SfnActionType);

/**
 * Defines the strategy for aggregating results from parallel branches.
 */
export enum AggregationStrategy {
  MERGE_OBJECTS = "MERGE_OBJECTS",
  COLLECT_ARRAY = "COLLECT_ARRAY",
  SUM = "SUM", 
  CUSTOM_MODULE = "CUSTOM_MODULE",
}
export const AggregationStrategySchema = z.nativeEnum(AggregationStrategy);

/**
 * Defines the types of steps that can be executed within an Allma flow,
 * organized by logical category for long-term maintainability.
 */
export enum StepType {
  // --- Core Logic & Control ---
  NO_OP = 'NO_OP',
  END_FLOW = 'END_FLOW',
  CUSTOM_LOGIC = 'CUSTOM_LOGIC',
  CUSTOM_LAMBDA_INVOKE = 'CUSTOM_LAMBDA_INVOKE',

  // --- Data Handling ---
  DATA_LOAD = 'DATA_LOAD',
  DATA_SAVE = 'DATA_SAVE',
  DATA_TRANSFORMATION = 'DATA_TRANSFORMATION',

  // --- AI & Language Models ---
  LLM_INVOCATION = 'LLM_INVOCATION',

  // --- Orchestration & Flow Management ---
  PARALLEL_FORK_MANAGER = 'PARALLEL_FORK_MANAGER',
  START_SUB_FLOW = 'START_SUB_FLOW',
  START_FLOW_EXECUTION = 'START_FLOW_EXECUTION',

  // --- External System Integrations ---
  API_CALL = 'API_CALL',
  WAIT_FOR_EXTERNAL_EVENT = 'WAIT_FOR_EXTERNAL_EVENT',
  POLL_EXTERNAL_API = 'POLL_EXTERNAL_API',
  
  SQS_SEND = 'SQS_SEND',
  SNS_PUBLISH = 'SNS_PUBLISH',
  EMAIL = 'EMAIL',

  // --- Start Points ---
  EMAIL_START_POINT = 'EMAIL_START_POINT',
}
export const StepTypeSchema = z.nativeEnum(StepType);
