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
  ownerPrincipal?: string;
  createdAt?: string;
  ttl?: number;
  [key: string]: unknown;
}

/**
 * Thrown when a resume caller is authenticated but does not own the waiting continuation record.
 * The record is left intact so the rightful owner can still resume it; callers map this to HTTP 403.
 */
export class ContinuationOwnershipMismatchError extends Error {
  constructor(message = 'Caller does not own this continuation record.') {
    super(message);
    this.name = 'ContinuationOwnershipMismatchError';
  }
}

const getTableName = (): string =>
  process.env[ENV_VAR_NAMES.ALLMA_CONTINUATION_TABLE_NAME] || process.env.ALLMA_CONTINUATION_TABLE_NAME || '';

export const ContinuationStateService = {
  /**
   * Atomically consume (delete and return) a continuation record, enforcing ownership in the same
   * conditional `DeleteCommand` so a mismatched caller can never resume another caller's waiting run
   * or even learn that the key exists.
   *
   * - `callerPrincipal` defined: delete only when the record is unowned or owned by this caller.
   *   `ConditionalCheckFailedException` means the record exists but belongs to someone else — the
   *   record is NOT deleted (so the owner can still resume) and `ContinuationOwnershipMismatchError`
   *   is thrown (→ 403). A delete with no `Attributes` means the key does not exist (→ 404).
   * - `callerPrincipal` undefined: a trusted system-level resume bypass — delete unconditionally.
   */
  async consumeContinuationRecord(
    correlationKey: string,
    callerPrincipal?: string,
  ): Promise<ContinuationRecord | null> {
    const tableName = getTableName();
    if (!tableName) {
      throw new Error(`Missing required environment variable: ${ENV_VAR_NAMES.ALLMA_CONTINUATION_TABLE_NAME}`);
    }

    if (callerPrincipal === undefined) {
      const result = await ddbDocClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { correlationKey },
          ReturnValues: 'ALL_OLD',
        }),
      );
      return (result.Attributes as ContinuationRecord) || null;
    }

    try {
      const result = await ddbDocClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { correlationKey },
          ConditionExpression: 'attribute_not_exists(ownerPrincipal) OR ownerPrincipal = :callerPrincipal',
          ExpressionAttributeValues: { ':callerPrincipal': callerPrincipal },
          ReturnValues: 'ALL_OLD',
          ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
        }),
      );
      return (result.Attributes as ContinuationRecord) || null;
    } catch (error: any) {
      if (error?.name === 'ConditionalCheckFailedException') {
        // The condition failed because the record exists but has a different owner — `error.Item`
        // carries the untouched record. A truly missing key would succeed with no Attributes.
        if (error.Item) {
          throw new ContinuationOwnershipMismatchError();
        }
        return null;
      }
      throw error;
    }
  },
};
