import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, PutCommand, GetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { TriggeringEmailContext } from '@allma/core-types';
import { RFQ, BuyerProfile, CommunicationEvent, Supplier } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE } = process.env;

interface StepInput {
  triggeringEmail: TriggeringEmailContext;
  correlationId: string;
}

enum EmailIntent {
  QUOTE_SUBMISSION = 'QUOTE_SUBMISSION',
  GENERAL_REPLY = 'GENERAL_REPLY',
  UNKNOWN = 'UNKNOWN',
}

const SUPPORTED_QUOTE_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.pdf', '.zip'];

/**
 * @description The new master router step for all incoming emails.
 * It parses the email, correlates it to an RFQ and supplier, determines the intent,
 * logs the communication, and returns a routing decision.
 */
export const handler = async (event: { stepInput: StepInput }) => {
  const { triggeringEmail, correlationId } = event.stepInput;
  log_info('Parsing and correlating incoming email', { correlationId });

  if (!ENTITY_GRAPH_TABLE) {
    throw new Error('ENTITY_GRAPH_TABLE environment variable is not set.');
  }

  try {
    // 1. Correlate to RFQ
    const rfqIdMatch = triggeringEmail.subject?.match(/RFQ-[\d]{4}-[\w-]+/i);
    if (!rfqIdMatch) {
      throw new Error(`Could not extract RFQ ID from subject: "${triggeringEmail.subject}"`);
    }
    const rfqId = rfqIdMatch[0].toUpperCase();

    // 2. Fetch RFQ metadata to identify supplier and buyer
    const rfq = await getRfqMetadata(rfqId);

    // Use senderFullEmail for matching
    if (!triggeringEmail.senderFullEmail) {
      throw new Error('Sender email address is missing from the inbound email.');
    }
    const supplier = rfq.suppliers.find(s => s.email.toLowerCase() === triggeringEmail.senderFullEmail!.toLowerCase());
    if (!supplier) {
      throw new Error(`Could not match sender "${triggeringEmail.senderFullEmail}" to a supplier in RFQ ${rfqId}.`);
    }

    // 3. Determine Intent
    const attachment = triggeringEmail.attachments.find(att =>
        SUPPORTED_QUOTE_EXTENSIONS.some(ext => att.filename.toLowerCase().endsWith(ext))
    );
    const intent = attachment ? EmailIntent.QUOTE_SUBMISSION : EmailIntent.GENERAL_REPLY;

    // 4. Log the Inbound Communication Event
    await logCommunicationEvent(rfqId, supplier, triggeringEmail, intent);

    // 5. Prepare output for the router flow
    const buyerProfile = await getBuyerProfile(rfq.ownerId);

    return {
      intent,
      rfqId,
      projectId: rfq.projectId,
      supplierName: supplier.name,
      supplierId: supplier.supplierId,
      round: await getNextRound(rfqId, supplier.name),
      buyerEmail: buyerProfile.email,
      s3Bucket: attachment?.s3Location.bucket,
      s3Key: attachment?.s3Location.key,
      emailBody: triggeringEmail.body,
      emailSubject: triggeringEmail.subject,
    };
  } catch (error) {
    log_error('Failed to parse and correlate email', { correlationId, error });
    // If correlation fails, we default to UNKNOWN intent for human review
    return { intent: EmailIntent.UNKNOWN, error: (error as Error).message, triggeringEmail };
  }
};

async function getRfqMetadata(rfqId: string): Promise<RFQ> {
  const { Item } = await docClient.send(new GetCommand({
    TableName: ENTITY_GRAPH_TABLE,
    Key: { PK: `RFQ#${rfqId}`, SK: 'METADATA' },
  }));
  if (!Item) throw new Error(`RFQ metadata not found for ID ${rfqId}.`);
  return Item as RFQ;
}

async function getBuyerProfile(ownerId: string): Promise<BuyerProfile> {
  const { Item } = await docClient.send(new GetCommand({
    TableName: ENTITY_GRAPH_TABLE,
    Key: { PK: `USER#${ownerId}`, SK: 'PROFILE' },
  }));
  if (!Item) throw new Error(`Buyer profile not found for owner ID ${ownerId}.`);
  return Item as BuyerProfile;
}

async function getNextRound(rfqId: string, supplierName: string): Promise<number> {
    const { Count } = await docClient.send(new QueryCommand({
        TableName: ENTITY_GRAPH_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': `RFQ#${rfqId}`,
            ':sk': `QUOTE#SUPPLIER#${supplierName}#`,
        },
        Select: 'COUNT',
    }));
    return (Count || 0) + 1;
}

async function logCommunicationEvent(rfqId: string, supplier: RFQ['suppliers'][0], email: TriggeringEmailContext, intent: EmailIntent): Promise<void> {
  const now = new Date();
  // ASSUMPTION: The runtime triggeringEmail object contains messageId and inReplyTo,
  // even if they are not in the base TriggeringEmailContext type definition.
  const runtimeEmail = email as any;

  const commItem: CommunicationEvent = {
    PK: `RFQ#${rfqId}`,
    SK: `COMM#${now.toISOString()}#SUPPLIER#${supplier.supplierId}`,
    entityType: 'COMMUNICATION_EVENT',
    direction: 'inbound',
    eventType: intent === EmailIntent.QUOTE_SUBMISSION ? 'SUPPLIER_QUOTE' : 'SUPPLIER_REPLY',
    supplierId: supplier.supplierId,
    messageId: runtimeEmail.messageId,
    inReplyTo: runtimeEmail.inReplyTo,
    details: {
      from: email.from || email.senderFullEmail || '',
      to: [email.to],
      subject: email.subject || '',
      attachments: email.attachments.map(att => ({ filename: att.filename, s3key: att.s3Location.key })),
    },
    createdAt: now.toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: ENTITY_GRAPH_TABLE,
    Item: commItem,
  }));
}