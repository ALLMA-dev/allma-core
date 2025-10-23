import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { SystemModuleIdentifiers } from '../system-module-identifiers.js';

/**
 * Defines the payload for the 'system/sqs-send' module.
 */
export const SqsSendStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.SQS_SEND),
  moduleIdentifier: z.literal(SystemModuleIdentifiers.SQS_SEND),
  queueUrl: z.string().url().describe("The URL of the SQS queue."),
  payload: z.record(z.any()).describe("Payload|json|The JSON payload to send as the message body."),
  messageGroupId: z.string().optional().describe("For FIFO queues: The message group ID."),
  messageDeduplicationId: z.string().optional().describe("For FIFO queues: The message deduplication ID."),
}).passthrough();

/**
 * Defines the payload for the 'system/sns-publish' module.
 */
export const SnsPublishStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.SNS_PUBLISH),
  moduleIdentifier: z.literal(SystemModuleIdentifiers.SNS_PUBLISH),
  topicArn: z.string().startsWith('arn:aws:sns:').describe("The ARN of the SNS topic."),
  payload: z.record(z.any()).describe("Payload|json|The JSON payload to send as the message body."),
  messageAttributes: z.record(z.any()).optional().describe("Message Attributes|json|Key-value pairs for SNS message attributes."),
}).passthrough();