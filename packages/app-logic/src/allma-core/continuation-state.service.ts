import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ENV_VAR_NAMES } from '@allma/core-types';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export interface ContinuationRecord {
  correlationKey: string;
  taskToken: string;
  flowExecutionId: string;
  stepInstanceId?: string;
  createdAt?: string;
  ttl?: number;
  [key: string]: unknown;
}

const getTableName = (): string =>
  process.env[ENV_VAR_NAMES.ALLMA_CONTINUATION_TABLE_NAME] || process.env.ALLMA_CONTINUATION_TABLE_NAME || '';

export const ContinuationStateService = {
  async consumeContinuationRecord(correlationKey: string): Promise<ContinuationRecord | null> {
    const tableName = getTableName();
    if (!tableName) {
      throw new Error(`Missing required environment variable: ${ENV_VAR_NAMES.ALLMA_CONTINUATION_TABLE_NAME}`);
    }

    const result = await ddbDocClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          correlationKey,
        },
        ReturnValues: 'ALL_OLD',
      }),
    );

    return (result.Attributes as ContinuationRecord) || null;
  },
};
