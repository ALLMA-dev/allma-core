import { z } from 'zod';
import { JsonPathStringSchema } from '../common/core.js';
import { HttpMethodEnumSchema } from '../common/enums.js';
import { StepInputMappingSchema } from '../steps/common.js';

// --- Schemas for individual OnCompletionAction types ---

const BaseOnCompletionActionSchema = z.object({
  target: z.string().optional(),
  payloadTemplate: StepInputMappingSchema.optional(),
  condition: JsonPathStringSchema.optional(),
  executeOnStatus: z.enum(['COMPLETED', 'FAILED', 'ANY']).default('COMPLETED'),
});

const LogOnlyActionSchema = BaseOnCompletionActionSchema.extend({
  actionType: z.literal('LOG_ONLY'),
});

const ApiCallActionSchema = BaseOnCompletionActionSchema.extend({
  actionType: z.literal('API_CALL'),
  target: z.string({ required_error: "target (URL) is required for API_CALL action" }),
  apiHttpMethod: HttpMethodEnumSchema,
});

const SqsSendActionSchema = BaseOnCompletionActionSchema.extend({
  actionType: z.literal('SQS_SEND'),
  target: z.string({ required_error: "target (SQS Queue URL/ARN) is required for SQS_SEND action" }),
});

const SnsSendActionSchema = BaseOnCompletionActionSchema.extend({
  actionType: z.literal('SNS_SEND'),
  target: z.string({ required_error: "target (SNS Topic ARN) is required for SNS_SEND action" }),
  messageAttributesTemplate: z.record(JsonPathStringSchema).optional(),
});

const CustomLambdaInvokeActionSchema = BaseOnCompletionActionSchema.extend({
  actionType: z.literal('CUSTOM_LAMBDA_INVOKE'),
  target: z.string({ required_error: "target (Lambda Function ARN/Name) is required" }),
});

const DataSaveActionSchema = BaseOnCompletionActionSchema.extend({
  actionType: z.literal('DATA_SAVE'),
  moduleIdentifier: z.string({ required_error: "moduleIdentifier is required" }),
  customConfig: z.record(z.any()).optional(),
});

/**
 * A discriminated union schema for actions to be performed upon flow completion.
 */
export const OnCompletionActionSchema  = z.discriminatedUnion("actionType", [
  LogOnlyActionSchema,
  ApiCallActionSchema,
  SqsSendActionSchema,
  SnsSendActionSchema,
  CustomLambdaInvokeActionSchema,
  DataSaveActionSchema,
]);

export type OnCompletionAction = z.infer<typeof OnCompletionActionSchema>;
export type OnCompletionActionApiCallConfig = Extract<OnCompletionAction, { actionType: 'API_CALL' }>;
export type OnCompletionActionSnsSendConfig = Extract<OnCompletionAction, { actionType: 'SNS_SEND' }>;