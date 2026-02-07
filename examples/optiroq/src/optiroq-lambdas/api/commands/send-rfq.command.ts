import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, TransactWriteCommand, DynamoDBDocumentClient, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { RFQ } from '@optiroq/types';

const sqsClient = new SQSClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const { ENTITY_GRAPH_TABLE, ALLMA_START_QUEUE_URL } = process.env;
const FLOW_DEFINITION_ID = 'optiroq-send-rfq-emails';

/**
 * Finalizes an RFQ draft, changes its status to 'SENT', atomically increments the
 * `previousRFQs` count on selected suppliers, and triggers an Allma flow to dispatch emails.
 *
 * @param rfqId The ID of the RFQ to send.
 * @param userId The ID of the user sending the RFQ for authorization.
 * @returns A confirmation object with the rfqId and a flowExecutionId.
 */
export async function sendRfq(
  rfqId: string,
  userId: string
): Promise<{ rfqId: string; flowExecutionId: string }> {
  if (!ENTITY_GRAPH_TABLE || !ALLMA_START_QUEUE_URL) {
    throw new Error('Server configuration error.');
  }
  
  const flowExecutionId = `send-rfq-${rfqId}-${new Date().getTime()}`;
  log_info('Sending RFQ', { rfqId, userId, flowExecutionId });

  // 1. Fetch the RFQ to authorize and get supplier list
  const { Item: rfqItem } = await docClient.send(new GetCommand({
      TableName: ENTITY_GRAPH_TABLE,
      Key: { PK: `RFQ#${rfqId}`, SK: 'METADATA' },
  }));

  if (!rfqItem) {
      throw new Error('RFQ not found.');
  }
  if (rfqItem.ownerId !== userId) {
      throw new Error('You are not authorized to perform this action.');
  }
  if (rfqItem.status !== 'DRAFT') {
      throw new Error('RFQ is not in a draft state and cannot be sent.');
  }

  const rfq = rfqItem as RFQ;
  const selectedSuppliers = rfq.suppliers.filter(s => s.selected);

  // 2. Build a transaction to update RFQ status and supplier counters
  const transactionItems: TransactWriteCommandInput['TransactItems'] = [];

  // Item to update RFQ status
  transactionItems.push({
    Update: {
      TableName: ENTITY_GRAPH_TABLE,
      Key: { PK: `RFQ#${rfqId}`, SK: 'METADATA' },
      UpdateExpression: 'SET #status = :sentStatus, #updatedAt = :now, #sendFlowId = :flowId',
      ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt', '#sendFlowId': 'sendFlowId' },
      ExpressionAttributeValues: { ':sentStatus': 'SENT', ':now': new Date().toISOString(), ':flowId': flowExecutionId },
    }
  });

  // Items to increment supplier previousRFQs count
  for (const supplier of selectedSuppliers) {
    transactionItems.push({
      Update: {
        TableName: ENTITY_GRAPH_TABLE,
        Key: { PK: `SUPPLIER#${supplier.supplierId}`, SK: 'METADATA' },
        UpdateExpression: 'ADD #previousRFQs :one SET #updatedAt = :now',
        ExpressionAttributeNames: { '#previousRFQs': 'previousRFQs', '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':one': 1, ':now': new Date().toISOString() },
      }
    });
  }

  // 3. Execute the transaction
  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: transactionItems }));
    log_info('Successfully updated RFQ and supplier counts in transaction', { rfqId });
  } catch (error) {
    log_error('Failed to execute transaction to send RFQ', { rfqId, error });
    throw new Error('An error occurred while finalizing the RFQ.');
  }

  // 4. Trigger Allma Flow to send emails
  try {
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: ALLMA_START_QUEUE_URL,
      MessageBody: JSON.stringify({
        flowDefinitionId: FLOW_DEFINITION_ID,
        initialContextData: { rfqId, userId },
        correlationId: flowExecutionId,
      }),
    }));

    log_info('Successfully triggered RFQ send flow', { rfqId });
    return { rfqId, flowExecutionId };
  } catch (error) {
    log_error('Failed to trigger RFQ send flow after successful DB transaction', { rfqId, error });
    // Note: No compensating transaction here. A monitoring alarm should be in place for SQS failures.
    throw new Error('Failed to initiate email sending process. The RFQ is marked as sent.');
  }
}