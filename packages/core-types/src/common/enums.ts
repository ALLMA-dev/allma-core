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
  /** A no-operation step, often used as a starting point or placeholder. */
  NO_OP = 'NO_OP',
  /** A step that terminates the current execution path of the flow. */
  END_FLOW = 'END_FLOW',
  /** Executes a custom-coded business logic module. */
  CUSTOM_LOGIC = 'CUSTOM_LOGIC',
  /** Directly invokes a specified external Lambda function. */
  CUSTOM_LAMBDA_INVOKE = 'CUSTOM_LAMBDA_INVOKE',

  // --- Data Handling ---
  /** Loads data from an external source (e.g., S3, DynamoDB) into the context. */
  DATA_LOAD = 'DATA_LOAD',
  /** Saves data from the context to an external destination (e.g., S3, DynamoDB). */
  DATA_SAVE = 'DATA_SAVE',
  /** Manipulates data within the flow's context (e.g., scripting, composing objects). */
  DATA_TRANSFORMATION = 'DATA_TRANSFORMATION',

  // --- AI & Language Models ---
  /** Invokes a Large Language Model for generation, classification, etc. */
  LLM_INVOCATION = 'LLM_INVOCATION',

  // --- Orchestration & Flow Management ---
  /** Manages parallel execution of branches within a flow. */
  PARALLEL_FORK_MANAGER = 'PARALLEL_FORK_MANAGER',
  /** Starts another Allma flow as a sub-process (can be sync or async). */
  START_SUB_FLOW = 'START_SUB_FLOW',
  /** Triggers a new, independent Allma flow execution asynchronously. */
  START_FLOW_EXECUTION = 'START_FLOW_EXECUTION',

  // --- External System Integrations ---
  /** Makes a synchronous, request-response call to an external HTTP API. */
  API_CALL = 'API_CALL',
  /** Pauses the flow to wait for an external callback or event to resume it. */
  WAIT_FOR_EXTERNAL_EVENT = 'WAIT_FOR_EXTERNAL_EVENT',
  /** Initiates a long-running, asynchronous polling loop against an external API. */
  POLL_EXTERNAL_API = 'POLL_EXTERNAL_API',
  /** Sends an asynchronous message to a messaging system (e.g., SQS, SNS). */
  MESSAGING = 'MESSAGING',
}
export const StepTypeSchema = z.nativeEnum(StepType);