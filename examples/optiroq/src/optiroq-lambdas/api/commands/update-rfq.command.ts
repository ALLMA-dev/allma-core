import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { UpdateCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { RFQ } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE } = process.env;

/**
 * Updates an existing RFQ draft.
 *
 * @param rfqId The ID of the RFQ draft to update.
 * @param payload The fields to update.
 * @param userId The ID of the user for authorization.
 * @returns The updated RFQ object.
 */
export async function updateRfq(
  rfqId: string,
  payload: Partial<RFQ>,
  userId: string
): Promise<RFQ> {
  if (!ENTITY_GRAPH_TABLE) {
    throw new Error('Server configuration error.');
  }

  log_info('Updating RFQ draft', { rfqId, userId });

  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  // Dynamically build the update expression, excluding keys
  const forbiddenKeys = ['PK', 'SK', 'entityType', 'rfqId', 'projectId', 'ownerId', 'createdAt', 'version'];
  for (const key in payload) {
    if (Object.prototype.hasOwnProperty.call(payload, key) && !forbiddenKeys.includes(key)) {
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = (payload as any)[key];
    }
  }

  if (updateExpressions.length === 0) {
    throw new Error('No update fields provided.');
  }

  // Always update the timestamp and increment the version
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  updateExpressions.push('#version = #version + :one');
  expressionAttributeNames['#version'] = 'version';
  expressionAttributeValues[':one'] = 1;

  expressionAttributeNames['#ownerId'] = 'ownerId';
  expressionAttributeNames['#status'] = 'status';
  expressionAttributeValues[':userId'] = userId;
  expressionAttributeValues[':draftStatus'] = 'DRAFT';

  try {
    const { Attributes } = await docClient.send(new UpdateCommand({
      TableName: ENTITY_GRAPH_TABLE,
      Key: { PK: `RFQ#${rfqId}`, SK: 'METADATA' },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: '#ownerId = :userId AND #status = :draftStatus',
      ReturnValues: 'ALL_NEW',
    }));
    
    if (!Attributes) {
        throw new Error('Update operation did not return the new attributes.');
    }

    log_info('Successfully updated RFQ draft', { rfqId });
    return Attributes as RFQ;
  } catch (error) {
    log_error('Failed to update RFQ draft', { rfqId, error });
    if ((error as any).name === 'ConditionalCheckFailedException') {
      throw new Error('Update failed: You might not be the owner, or the RFQ is not in a draft state.');
    }
    throw new Error('An error occurred while updating the RFQ.');
  }
}