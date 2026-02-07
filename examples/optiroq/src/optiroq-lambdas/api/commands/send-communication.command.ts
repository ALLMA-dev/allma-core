// NEW FILE
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { RFQ } from '@optiroq/types';

const sqsClient = new SQSClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const { ENTITY_GRAPH_TABLE, ALLMA_START_QUEUE_URL } = process.env;
const FLOW_DEFINITION_ID = 'optiroq-send-buyer-email';

interface SendEmailPayload {
  supplierId: string;
  subject: string;
  body: string;
  attachments?: { filename: string; s3key: string }[];
}

/**
 * Handles the 'communication:sendEmail' command. Triggers an Allma flow
 * to dispatch an email from the buyer to a supplier, ensuring it is tracked.
 */
export async function sendCommunication(
  rfqId: string,
  payload: SendEmailPayload,
  userId: string,
  userEmail: string
): Promise<{ flowExecutionId: string }> {
  if (!ENTITY_GRAPH_TABLE || !ALLMA_START_QUEUE_URL) {
    throw new Error('Server configuration error.');
  }

  const flowExecutionId = `send-comm-${rfqId}-${new Date().getTime()}`;
  log_info('Initiating outbound communication', { rfqId, userId, flowExecutionId });

  // 1. Load RFQ and Supplier context
  const rfq = await docClient.send(new GetCommand({
    TableName: ENTITY_GRAPH_TABLE,
    Key: { PK: `RFQ#${rfqId}`, SK: 'METADATA' }
  })).then(res => res.Item as RFQ);

  if (!rfq) throw new Error(`RFQ ${rfqId} not found.`);
  if (rfq.ownerId !== userId) throw new Error('Authorization failed. User does not own the RFQ.');

  const supplier = rfq.suppliers.find(s => s.supplierId === payload.supplierId);
  if (!supplier) throw new Error(`Supplier with ID ${payload.supplierId} not found in RFQ.`);

  // 2. Trigger Allma Flow to send the email
  const flowPayload = {
    flowDefinitionId: FLOW_DEFINITION_ID,
    initialContextData: {
      rfqId,
      supplier,
      buyerEmail: userEmail,
      subject: payload.subject,
      body: payload.body,
      attachments: payload.attachments || [],
    },
    correlationId: flowExecutionId,
  };

  try {
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: ALLMA_START_QUEUE_URL,
      MessageBody: JSON.stringify(flowPayload),
    }));

    log_info('Successfully triggered outbound email flow', { rfqId, flowExecutionId });
    return { flowExecutionId };
  } catch (error) {
    log_error('Failed to trigger outbound email flow', { rfqId, error });
    throw new Error('Failed to initiate email sending process.');
  }
}