import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import { log_info, log_error, log_warn } from '@allma/core-sdk';
import { postSimpleJson } from '../allma-core/utils/api-executor.js';
import { ENV_VAR_NAMES, StartFlowExecutionInput } from '@allma/core-types';

const s3Client = new S3Client({});
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqsClient = new SQSClient({});

const EMAIL_MAPPING_TABLE_NAME = process.env.EMAIL_TO_FLOW_MAPPING_TABLE_NAME!;
const FLOW_START_QUEUE_URL = process.env[ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_URL]!;
const RESUME_API_URL = process.env[ENV_VAR_NAMES.ALLMA_RESUME_API_URL]!;
const INCOMING_EMAILS_BUCKET_NAME = process.env.INCOMING_EMAILS_BUCKET_NAME!; // NEW
const RESUME_CODE_REGEX = /\[\[resume-code:\s*([0-9a-fA-F-]+)\]\]/;

// FIX: This interface now correctly reflects the payload given to a Lambda invoked by SES
interface SesEventRecord {
    eventSource: 'aws:ses';
    eventVersion: string;
    ses: {
        mail: {
            messageId: string;
            destination: string[];
            // other properties exist but are not needed by our logic
        };
        receipt: {
            action: {
                type: 'Lambda';
                functionArn: string;
            };
            // other properties exist but are not needed
        };
    };
}

export const handler = async (event: { Records: SesEventRecord[] }): Promise<void> => {
    if (!INCOMING_EMAILS_BUCKET_NAME) {
        log_error('INCOMING_EMAILS_BUCKET_NAME environment variable is not set. Cannot process emails.', {});
        throw new Error('Lambda is misconfigured: INCOMING_EMAILS_BUCKET_NAME is not set.');
    }

    for (const record of event.Records) {
        const correlationId = uuidv4();
        
        // FIX: Get the messageId from the event payload
        const messageId = record.ses.mail.messageId;
        // FIX: Construct the S3 object key. The prefix is configured in the CDK.
        const objectKey = `inbound/${messageId}`;

        log_info('Processing inbound email from SES', { bucket: INCOMING_EMAILS_BUCKET_NAME, key: objectKey, messageId }, correlationId);

        try {
            // 1. Download email from S3 using the constructed key
            const s3Response = await s3Client.send(new GetObjectCommand({ Bucket: INCOMING_EMAILS_BUCKET_NAME, Key: objectKey }));
            if (!s3Response.Body) {
                throw new Error(`S3 object body is empty for key: ${objectKey}`);
            }
            
            // 2. Parse the raw email content
            const parsedEmail = await simpleParser(s3Response.Body as any);
            const textBody = parsedEmail.text || '';
            const recipient = record.ses.mail.destination[0];

            // 3. Check for a resume code
            const resumeMatch = textBody.match(RESUME_CODE_REGEX);
            if (resumeMatch && resumeMatch[1]) {
                const resumeCode = resumeMatch[1];
                log_info(`Found resume code in email body. Attempting to resume flow.`, { resumeCode, recipient }, correlationId);
                const resumePayload = {
                    correlationValue: resumeCode,
                    payload: {
                        from: parsedEmail.from?.text,
                        to: recipient,
                        subject: parsedEmail.subject,
                        body: textBody,
                        htmlBody: parsedEmail.html || undefined,
                        attachments: parsedEmail.attachments,
                    },
                };
                await postSimpleJson(RESUME_API_URL, resumePayload);
                log_info(`Successfully posted to resume API for code.`, { resumeCode }, correlationId);
                return; // Stop processing this record
            }

            // 4. If no resume code, look up flow mapping
            log_info(`No resume code found. Looking up flow mapping for recipient.`, { recipient }, correlationId);
            const { Item: mapping } = await ddbDocClient.send(new GetCommand({
                TableName: EMAIL_MAPPING_TABLE_NAME,
                Key: { emailAddress: recipient },
            }));

            if (!mapping || !mapping.flowDefinitionId) {
                log_warn(`No flow mapping found for recipient email. Discarding email.`, { recipient }, correlationId);
                return; // No mapping, so nothing to do
            }

            // 5. Trigger a new flow execution via SQS
            const { flowDefinitionId, flowName } = mapping;
            const newFlowExecutionId = uuidv4();
            const startFlowInput: StartFlowExecutionInput = {
                flowDefinitionId,
                flowVersion: 'LATEST_PUBLISHED',
                flowExecutionId: newFlowExecutionId,
                triggerSource: `EmailTrigger:${recipient}`,
                enableExecutionLogs: true,
                initialContextData: {
                    triggeringEmail: {
                        from: parsedEmail.from?.text,
                        to: recipient,
                        subject: parsedEmail.subject,
                        body: textBody,
                        htmlBody: parsedEmail.html || undefined,
                    },
                },
            };

            await sqsClient.send(new SendMessageCommand({
                QueueUrl: FLOW_START_QUEUE_URL,
                MessageBody: JSON.stringify(startFlowInput),
            }));

            log_info(`Successfully queued request to start flow from email.`, { flowDefinitionId, flowName, newFlowExecutionId }, correlationId);

        } catch (error: any) {
            log_error(`Failed to process inbound email.`, { objectKey, error: error.message, stack: error.stack }, correlationId);
            // Re-throw to ensure the SES receipt rule's invocation is marked as failed.
            throw error;
        }
    }
};