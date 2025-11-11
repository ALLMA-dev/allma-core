import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { JsonPathStringSchema } from '../../common/core.js';
import { ApiCallStepPayloadSchema } from './api-calls.js';

/**
 * Defines the configuration for a step that actively polls an API endpoint.
 */
export const PollExternalApiStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.POLL_EXTERNAL_API),
  moduleIdentifier: z.undefined().optional(),
  apiCallDefinition: ApiCallStepPayloadSchema.pick({
    apiUrlTemplate: true,
    apiHttpMethod: true,
    apiHeadersTemplate: true,
    apiStaticHeaders: true,
  }).describe("API Call Definition|json|Configuration for the API endpoint to poll."),
  pollingConfig: z.object({
    intervalSeconds: z.number().int().min(5).max(3600),
    maxAttempts: z.number().int().min(1).max(100),
  }).describe("Polling Configuration|json|Define polling interval and max attempts."),
  exitConditions: z.object({
    successCondition: JsonPathStringSchema,
    failureCondition: JsonPathStringSchema,
  }).describe("Exit Conditions|json|Define JSONPath conditions for success or failure."),
}).passthrough();