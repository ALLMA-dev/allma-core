import { z } from 'zod';
import { StepTypeSchema, HttpMethodEnumSchema, HttpMethod } from '../../common/enums.js';
import { JsonPathStringSchema } from '../../common/core.js';
import { SystemModuleIdentifiers } from '../system-module-identifiers.js';

/**
 * Defines the configuration for a FILE_DOWNLOAD step.
 * Allows downloading a file from a URL directly to S3.
 */
export const FileDownloadStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.FILE_DOWNLOAD),
  moduleIdentifier: z.literal(SystemModuleIdentifiers.FILE_DOWNLOAD).optional(),
  
  sourceUrlTemplate: z.string().min(1).describe("Source URL|text|The URL of the file to download. Supports templates."),
  method: HttpMethodEnumSchema.optional().default(HttpMethod.GET).describe("HTTP Method|select|Usually GET."),
  headersTemplate: z.record(JsonPathStringSchema).optional().describe("Headers|json|Map context data to request headers (e.g. Authorization)."),
  
  destinationBucket: z.string().optional().describe("Destination Bucket|text|Optional S3 bucket name. Defaults to the system execution traces bucket."),
  destinationKeyTemplate: z.string().optional().describe("Destination Key|text|Optional S3 key template. If omitted, a path will be auto-generated."),
  
  customConfig: z.object({
    timeoutMs: z.number().int().positive().optional(),
    verifySsl: z.boolean().optional().default(true),
  }).passthrough().optional(),
}).passthrough();

export type FileDownloadStepPayload = z.infer<typeof FileDownloadStepPayloadSchema>;