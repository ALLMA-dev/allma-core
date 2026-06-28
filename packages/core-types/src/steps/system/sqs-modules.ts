import { z } from 'zod';

/**
 * The closed set of Amazon SQS queue attribute names, mirrored from
 * `@aws-sdk/client-sqs`'s `QueueAttributeName`. Re-declared here as a Zod enum
 * so that `@allma/core-types` (which must not depend on the AWS SDK) can
 * validate the `system/sqs-get-queue-attributes` config. Keep in sync with the
 * SDK if AWS adds attributes; the runtime handler casts these back to the SDK's
 * `QueueAttributeName` type.
 */
export const QueueAttributeNameSchema = z.enum([
  'All',
  'ApproximateNumberOfMessages',
  'ApproximateNumberOfMessagesDelayed',
  'ApproximateNumberOfMessagesNotVisible',
  'ContentBasedDeduplication',
  'CreatedTimestamp',
  'DeduplicationScope',
  'DelaySeconds',
  'FifoQueue',
  'FifoThroughputLimit',
  'KmsDataKeyReusePeriodSeconds',
  'KmsMasterKeyId',
  'LastModifiedTimestamp',
  'MaximumMessageSize',
  'MessageRetentionPeriod',
  'Policy',
  'QueueArn',
  'ReceiveMessageWaitTimeSeconds',
  'RedriveAllowPolicy',
  'RedrivePolicy',
  'SqsManagedSseEnabled',
  'VisibilityTimeout',
]);
export type QueueAttributeNameValue = z.infer<typeof QueueAttributeNameSchema>;

/**
 * Configuration for the `system/sqs-get-queue-attributes` data-loader module.
 */
export const SqsGetQueueAttributesCustomConfigSchema = z.object({
  queueUrl: z.string().url(),
  attributeNames: z.array(QueueAttributeNameSchema).min(1),
});
export type SqsGetQueueAttributesCustomConfig = z.infer<typeof SqsGetQueueAttributesCustomConfigSchema>;

/**
 * Configuration for the `system/sqs-receive-messages` data-loader module.
 */
export const SqsReceiveMessagesCustomConfigSchema = z.object({
  queueUrl: z.string().url(),
  maxNumberOfMessages: z.coerce.number().int().min(1).max(10).optional().default(10),
  waitTimeSeconds: z.coerce.number().int().min(0).max(20).optional().default(0),
  deleteMessages: z.boolean().optional().default(true),
});
export type SqsReceiveMessagesCustomConfig = z.infer<typeof SqsReceiveMessagesCustomConfigSchema>;
