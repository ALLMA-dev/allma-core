import { describe, it, expect } from 'vitest';
import {
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
} from './index.js';

describe('centralized module-config schemas', () => {
  it('s3-list-files accepts a minimal bucket and rejects an empty bucket', () => {
    expect(S3ListFilesCustomConfigSchema.safeParse({ bucket: 'my-bucket' }).success).toBe(true);
    expect(S3ListFilesCustomConfigSchema.safeParse({ bucket: '' }).success).toBe(false);
  });

  it('ddb-query-to-s3-manifest requires query + destination and defaults offloading', () => {
    const parsed = DdbQueryToS3ManifestCustomConfigSchema.parse({
      query: { tableName: 't', keyConditionExpression: 'pk = :p', expressionAttributeValues: { ':p': 'x' } },
      destination: { bucketName: 'b', key: 'k' },
    });
    expect(parsed.enableItemOffloading).toBe(false);
    expect(DdbQueryToS3ManifestCustomConfigSchema.safeParse({ destination: { bucketName: 'b', key: 'k' } }).success).toBe(false);
  });

  it('sqs-get-queue-attributes validates the closed attribute-name enum', () => {
    expect(
      SqsGetQueueAttributesCustomConfigSchema.safeParse({
        queueUrl: 'https://sqs.us-east-1.amazonaws.com/123/q',
        attributeNames: ['All', 'ApproximateNumberOfMessages'],
      }).success,
    ).toBe(true);
    expect(
      SqsGetQueueAttributesCustomConfigSchema.safeParse({
        queueUrl: 'https://sqs.us-east-1.amazonaws.com/123/q',
        attributeNames: ['NotARealAttribute'],
      }).success,
    ).toBe(false);
  });

  it('sqs-receive-messages applies its defaults', () => {
    const parsed = SqsReceiveMessagesCustomConfigSchema.parse({ queueUrl: 'https://sqs.us-east-1.amazonaws.com/123/q' });
    expect(parsed).toMatchObject({ maxNumberOfMessages: 10, waitTimeSeconds: 0, deleteMessages: true });
  });

  it('dynamodb savers validate their required fields', () => {
    expect(
      DynamoDBUpdateItemCustomConfigSchema.safeParse({ tableName: 't', key: { id: 'a' }, updateExpression: 'SET #a = :b' }).success,
    ).toBe(true);
    expect(
      DynamoDBQueryAndUpdateCustomConfigSchema.safeParse({
        query: { tableName: 't', keyConditionExpression: 'pk = :p', expressionAttributeValues: { ':p': 1 } },
        update: { updateExpression: 'SET #s = :s' },
      }).success,
    ).toBe(true);
  });

  it('data transformers validate their inputs', () => {
    expect(ArrayAggregatorCustomConfigSchema.safeParse({ array: [1, 2], operation: 'sum' }).success).toBe(true);
    expect(ArrayAggregatorCustomConfigSchema.safeParse({ array: [1], operation: 'median' }).success).toBe(false);
    expect(DateTimeCalculatorCustomConfigSchema.safeParse({ baseTime: '2026-06-28T00:00:00.000Z', offsetSeconds: 60, operation: 'add' }).success).toBe(true);
    expect(FlattenArrayCustomConfigSchema.safeParse({ array: [[1], [2]] }).success).toBe(true);
    expect(GenerateArrayCustomConfigSchema.safeParse({ count: 3 }).success).toBe(true);
    expect(GenerateUuidCustomConfigSchema.parse({})).toEqual({ prefix: '', suffix: '' });
  });

  it('compose-object-from-input accepts any object (intentionally open)', () => {
    expect(ComposeObjectFromInputCustomConfigSchema.safeParse({ anything: 'goes', n: 1 }).success).toBe(true);
  });

  it('join-data enforces the XOR between join_keys and key_mappings', () => {
    const base = {
      left_source: [{ id: 1 }],
      left_format: 'json' as const,
      right_source: [{ id: 1 }],
      right_format: 'json' as const,
      join_type: 'inner' as const,
      output_format: 'json' as const,
    };
    expect(JoinDataCustomConfigSchema.safeParse({ ...base, join_keys: ['id'] }).success).toBe(true);
    // both provided → refinement fails
    expect(JoinDataCustomConfigSchema.safeParse({ ...base, join_keys: ['id'], key_mappings: [{ left: 'id', right: 'id' }] }).success).toBe(false);
    // neither provided → refinement fails
    expect(JoinDataCustomConfigSchema.safeParse(base).success).toBe(false);
    // format/data mismatch → refinement fails
    expect(JoinDataCustomConfigSchema.safeParse({ ...base, join_keys: ['id'], left_source: 'csv,data' }).success).toBe(false);
  });
});
