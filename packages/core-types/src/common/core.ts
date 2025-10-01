import { z } from 'zod';

/**
 * DynamoDB item type constants for distinguishing between different configuration entities.
 */
export const ITEM_TYPE_ALLMA_FLOW_DEFINITION = 'ALLMA_FLOW_DEFINITION' as const;
export const ITEM_TYPE_ALLMA_STEP_DEFINITION = 'ALLMA_STEP_DEFINITION' as const;
export const ITEM_TYPE_ALLMA_PROMPT_TEMPLATE = 'ALLMA_PROMPT_TEMPLATE' as const;
export const ITEM_TYPE_ALLMA_GLOBAL_CONFIG = 'ALLMA_GLOBAL_CONFIG' as const;
export const ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY = 'ALLMA_EXTERNAL_STEP_REGISTRY' as const;

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}
export const LogLevelSchema = z.nativeEnum(LogLevel);

/**
 * Represents a JSONPath string, used for mapping data within flows.
 */
export const JsonPathStringSchema = z.string()
  .startsWith('$.', { message: "JSONPath must start with '$.'" })
  .min(2, { message: "JSONPath must have at least one character after '$.'" });
export type JsonPathString = z.infer<typeof JsonPathStringSchema>;

/**
 * Schema for an S3 pointer, used when data is too large to store directly.
 */
export const S3PointerSchema = z.object({
  bucket: z.string().min(1, "S3 bucket name is required."),
  key: z.string().min(1, "S3 object key is required."),
  versionId: z.string().optional(),
  region: z.string().optional(),
});
export type S3Pointer = z.infer<typeof S3PointerSchema>;

/**
 * A wrapper to distinguish an S3 pointer representing a step's output from other data.
 */
export const S3OutputPointerWrapperSchema = z.object({
  _s3_output_pointer: S3PointerSchema,
});
export type S3OutputPointerWrapper = z.infer<typeof S3OutputPointerWrapperSchema>;


/**
 * Helper to check if a value is a standard S3Pointer object.
 */
export const isS3Pointer = (value: any): value is S3Pointer => {
    return S3PointerSchema.safeParse(value).success;
};

/**
 * Helper to check if a value is the specific wrapper for an offloaded step output.
 */
export const isS3OutputPointerWrapper = (value: any): value is S3OutputPointerWrapper => {
    return S3OutputPointerWrapperSchema.safeParse(value).success;
};

/**
 * Standardized error object structure for internal Allma processing.
 */
export const AllmaErrorSchema = z.object({
  errorName: z.string().min(1, "Error name is required."),
  errorMessage: z.string().min(1, "Error message is required."),
  errorCause: z.string().optional(),
  errorDetails: z.record(z.any()).optional(),
  isRetryable: z.boolean().optional().default(false),
});
export type AllmaError = z.infer<typeof AllmaErrorSchema>;

/**
 * Standardized result structure for step execution within Allma.
 */
export const StepExecutionResultSchema = z.object({
  success: z.boolean(),
  outputData: z.record(z.any()).optional(),
  outputDataS3Pointer: S3PointerSchema.optional(),
  errorInfo: AllmaErrorSchema.optional(),
  logs: z.object({
    tokenUsage: z.object({
      inputTokens: z.number().int().optional(),
      outputTokens: z.number().int().optional(),
    }).optional(),
    durationMs: z.number().int().optional(),
    customMetrics: z.record(z.number()).optional(),
  }).optional(),
});
export type StepExecutionResult = z.infer<typeof StepExecutionResultSchema>;
