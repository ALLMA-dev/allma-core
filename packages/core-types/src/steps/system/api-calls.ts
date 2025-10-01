import { z } from 'zod';
import { StepTypeSchema, HttpMethodEnumSchema } from '../../common/enums.js';
import { JsonPathStringSchema } from '../../common/core.js';
import { TemplateContextMappingItemSchema } from '../templating.js';

const ApiUrlTemplateSchema = z.object({
  template: z.string().min(1),
  contextMappings: z.record(TemplateContextMappingItemSchema).optional(),
});

export const ApiCallStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.API_CALL),
  apiUrlTemplate: ApiUrlTemplateSchema.describe("API URL Template|json|Define the URL and any dynamic path parameters."),
  apiHttpMethod: HttpMethodEnumSchema.describe("HTTP Method|select|The HTTP method for the API call."),
  apiHeadersTemplate: z.record(JsonPathStringSchema).optional().describe("Dynamic Headers|json|Map context data to request headers."),
  apiStaticHeaders: z.record(z.string()).optional().describe("Static Headers|json|Hard-coded request headers."),
  requestBodyTemplate: z.record(TemplateContextMappingItemSchema).optional().describe("Request Body Template|json|Define the JSON body using mappings from context."),
  customConfig: z.object({
    timeoutMs: z.number().int().positive().optional(),
    retryAttempts: z.number().int().min(0).optional(),
    requestBodyPath: JsonPathStringSchema.optional(),
  }).passthrough().optional(),
}).passthrough();

/**
 * A subset of the ApiCallStep schema used by utility functions for executing API calls.
 */
export const ApiCallDefinitionSchema = ApiCallStepPayloadSchema.pick({
  apiUrlTemplate: true,
  apiHttpMethod: true,
  apiHeadersTemplate: true,
  apiStaticHeaders: true,
  requestBodyTemplate: true,
  customConfig: true,
});
export type ApiCallDefinition = z.infer<typeof ApiCallDefinitionSchema>;