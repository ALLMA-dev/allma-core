import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, TransactWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { randomUUID } from 'crypto';
import { RFQ } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE } = process.env;
const DYNAMODB_TRANSACT_ITEMS_LIMIT = 100;

interface CloneRfqPayload {
  newProjectId?: string; // Optional: to clone RFQ into a different project
}

/**
 * Clones an existing RFQ and all its related entities (parts, suppliers, etc.).
 * Creates a new RFQ draft that is an exact copy of the source.
 *
 * @param sourceRfqId The ID of the RFQ to clone.
 * @param payload Contains optional overrides like a new project ID.
 * @param userId The ID of the user performing the clone.
 * @returns An object with the newRfqId.
 */
export async function cloneRfq(
  sourceRfqId: string,
  payload: CloneRfqPayload,
  userId: string
): Promise<{ newRfqId: string }> {
  if (!ENTITY_GRAPH_TABLE) {
    throw new Error('Server configuration error: ENTITY_GRAPH_TABLE not set.');
  }

  log_info('Cloning RFQ', { sourceRfqId, userId });

  // 1. Fetch all items related to the source RFQ
  const queryResult = await docClient.send(new QueryCommand({
    TableName: ENTITY_GRAPH_TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `RFQ#${sourceRfqId}` },
  }));

  const sourceItems = queryResult.Items;
  if (!sourceItems || sourceItems.length === 0) {
    throw new Error(`Source RFQ with ID ${sourceRfqId} not found.`);
  }

  const sourceMetadata = sourceItems.find(item => item.SK === 'METADATA') as RFQ;
  if (!sourceMetadata) {
    throw new Error('Source RFQ metadata not found.');
  }
  // Authorization check: User must own the project of the source RFQ. We assume this is handled at the view layer.

  // 2. Prepare new items for the clone
  const newRfqId = `RFQ-${new Date().getFullYear()}-${randomUUID().split('-')[0].toUpperCase()}`;
  const now = new Date().toISOString();
  const newPk = `RFQ#${newRfqId}`;
  
  const newItems = sourceItems.map(item => {
    const newItem: any = { ...item, PK: newPk };
    
    // Update metadata for the new RFQ
    if (newItem.SK === 'METADATA') {
      newItem.rfqId = newRfqId;
      newItem.status = 'DRAFT';
      newItem.createdAt = now;
      newItem.updatedAt = now;
      newItem.ownerId = userId;
      newItem.version = 1;
      if (payload.newProjectId) {
        newItem.projectId = payload.newProjectId;
      }
    }
    // Any other SK-specific modifications can go here
    return newItem;
  });

  if (newItems.length > DYNAMODB_TRANSACT_ITEMS_LIMIT) {
    throw new Error(`Cannot clone RFQ: item count (${newItems.length}) exceeds DynamoDB transaction limit of ${DYNAMODB_TRANSACT_ITEMS_LIMIT}.`);
  }

  // 3. Write all new items in a single transaction
  try {
    await docClient.send(new TransactWriteCommand({
      TransactItems: newItems.map(Item => ({ Put: { TableName: ENTITY_GRAPH_TABLE, Item } })),
    }));

    log_info('Successfully cloned RFQ', { sourceRfqId, newRfqId });
    return { newRfqId };
  } catch (error) {
    log_error('Failed to execute clone RFQ transaction', { sourceRfqId, error });
    throw new Error('An error occurred while cloning the RFQ.');
  }
}