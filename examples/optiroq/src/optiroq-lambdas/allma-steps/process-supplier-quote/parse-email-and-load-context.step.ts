import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, GetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { RFQ, BuyerProfile } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE } = process.env;

// A simplified representation of the Allma email object
interface AllmaEmail {
  subject: string;
  from: string;
  to: string[];
  attachments: {
    filename: string;
    contentType: string;
    size: number;
    s3Location: {
      bucket: string;
      key: string;
    };
  }[];
}

interface StepInput {
  triggeringEmail: AllmaEmail;
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step.
 * This is the first step after an email trigger. It parses the email subject
 * to identify the RFQ, determines the supplier, loads all necessary context
 * from DynamoDB, and identifies the correct attachment to process.
 * @returns A rich context object for all subsequent flow steps.
 */
export const handler = async (event: { stepInput: StepInput }) => {
  const { triggeringEmail } = event.stepInput;
  const correlationId = event.stepInput.triggeringEmail.subject; // Use subject for initial correlation
  log_info('Parsing supplier email and loading context', { correlationId });

  if (!ENTITY_GRAPH_TABLE) {
    throw new Error('ENTITY_GRAPH_TABLE environment variable not set.');
  }

  try {
    // 1. Extract RFQ ID from the subject
    const rfqIdMatch = triggeringEmail.subject.match(/RFQ-[\d]{4}-[\w-]+/i);
    if (!rfqIdMatch) {
      throw new Error(`Could not extract RFQ ID from email subject: "${triggeringEmail.subject}"`);
    }
    const rfqId = rfqIdMatch[0].toUpperCase();

    // 2. Fetch all RFQ items to find metadata and supplier
    const rfqItemsResult = await docClient.send(new QueryCommand({
      TableName: ENTITY_GRAPH_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `RFQ#${rfqId}` },
    }));

    if (!rfqItemsResult.Items || rfqItemsResult.Items.length === 0) {
      throw new Error(`RFQ with ID ${rfqId} not found.`);
    }

    const rfq = rfqItemsResult.Items.find(item => item.SK === 'METADATA') as RFQ | undefined;
    if (!rfq) {
      throw new Error(`RFQ metadata not found for ID ${rfqId}.`);
    }

    const { projectId, ownerId, suppliers } = rfq;

    // 3. Identify the supplier from the sender's email
    const supplier = suppliers.find(s => s.email.toLowerCase() === triggeringEmail.from.toLowerCase());
    if (!supplier) {
      throw new Error(`Could not find a matching supplier for sender email "${triggeringEmail.from}" in RFQ ${rfqId}.`);
    }
    const supplierName = supplier.name;

    // 4. Determine the next quote round number
    const existingQuotes = rfqItemsResult.Items.filter(item => 
        item.SK.startsWith(`QUOTE#SUPPLIER#${supplierName}#`)
    );
    const round = existingQuotes.length + 1;

    // 5. Fetch the buyer's email for notifications
    const buyerProfileResult = await docClient.send(new GetCommand({
        TableName: ENTITY_GRAPH_TABLE,
        Key: { PK: `USER#${ownerId}`, SK: 'PROFILE' },
    }));
    const buyerEmail = (buyerProfileResult.Item as BuyerProfile)?.email;
    if (!buyerEmail) {
        throw new Error(`Could not find profile for buyer (owner) with ID ${ownerId}.`);
    }

    // 6. Identify the primary attachment to process
    const supportedExtensions = ['.xlsx', '.xls', '.xlsm', '.pdf', '.zip'];
    const attachment = triggeringEmail.attachments.find(att => 
        supportedExtensions.some(ext => att.filename.toLowerCase().endsWith(ext))
    );
    if (!attachment) {
      throw new Error('No supported quote attachment found in the email (.xlsx, .xls, .xlsm, .pdf, .zip).');
    }

    const context = {
      rfqId,
      projectId,
      supplierName,
      round,
      buyerEmail,
      s3Bucket: attachment.s3Location.bucket,
      s3Key: attachment.s3Location.key,
    };
    
    log_info('Successfully loaded context from email', { correlationId, ...context });
    return context;

  } catch (error) {
    log_error('Failed to parse email and load context', { correlationId, error });
    throw error;
  }
};