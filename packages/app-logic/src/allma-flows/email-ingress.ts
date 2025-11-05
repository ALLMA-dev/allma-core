import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import PostalMime from 'postal-mime';
import { v4 as uuidv4 } from 'uuid';
import { log_info, log_error, log_warn } from '@allma/core-sdk';
import { ENV_VAR_NAMES, StartFlowExecutionInput } from '@allma/core-types';

const s3Client = new S3Client({});
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqsClient = new SQSClient({});

const EMAIL_MAPPING_TABLE_NAME = process.env[ENV_VAR_NAMES.EMAIL_TO_FLOW_MAPPING_TABLE_NAME]!;
const FLOW_START_QUEUE_URL = process.env[ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_URL]!;
const INCOMING_EMAILS_BUCKET_NAME = process.env.INCOMING_EMAILS_BUCKET_NAME!;

interface SesEventRecord {
    eventSource: 'aws:ses';
    eventVersion: string;
    ses: {
        mail: {
            messageId: string;
            destination: string[];
        };
        receipt: {
            action: {
                type: 'Lambda';
                functionArn: string;
            };
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
        const messageId = record.ses.mail.messageId;
        const objectKey = `inbound/${messageId}`;

        log_info('Processing inbound email from SES', { bucket: INCOMING_EMAILS_BUCKET_NAME, key: objectKey, messageId }, correlationId);

        try {
            const s3Response = await s3Client.send(new GetObjectCommand({ Bucket: INCOMING_EMAILS_BUCKET_NAME, Key: objectKey }));
            if (!s3Response.Body) {
                throw new Error(`S3 object body is empty for key: ${objectKey}`);
            }

            // postal-mime expects a string or buffer, so we read the stream first.
            const emailContent = await s3Response.Body.transformToString();
            const parser = new PostalMime();
            const parsedEmail = await parser.parse(emailContent);

            const textBody = parsedEmail.text || '';
            const recipient = record.ses.mail.destination[0];

            const queryCommand = new QueryCommand({
                TableName: EMAIL_MAPPING_TABLE_NAME,
                KeyConditionExpression: 'emailAddress = :recipient',
                ExpressionAttributeValues: {
                    ':recipient': recipient,
                },
            });

            const { Items: mappings } = await ddbDocClient.send(queryCommand);

            if (!mappings || mappings.length === 0) {
                log_warn(`No flow mapping found for recipient email. Discarding email.`, { recipient }, correlationId);
                return;
            }

            let targetMapping = mappings.find(m => m.keyword !== '#DEFAULT' && textBody.includes(m.keyword));

            if (!targetMapping) {
                targetMapping = mappings.find(m => m.keyword === '#DEFAULT');
            }

            if (!targetMapping) {
                log_warn(`No matching keyword or default mapping found for recipient.`, { recipient }, correlationId);
                return;
            }

            const { flowDefinitionId, stepInstanceId } = targetMapping;
            const newFlowExecutionId = uuidv4();

            const fromText = parsedEmail.from
                ? (parsedEmail.from.name ? `${parsedEmail.from.name} <${parsedEmail.from.address}>` : parsedEmail.from.address)
                : undefined;

            const startFlowInput: StartFlowExecutionInput = {
                flowDefinitionId,
                flowVersion: 'LATEST_PUBLISHED',
                flowExecutionId: newFlowExecutionId,
                triggerSource: `EmailTrigger:${recipient}`,
                enableExecutionLogs: true,
                initialContextData: {
                    triggeringEmail: {
                        from: fromText,
                        to: recipient,
                        subject: parsedEmail.subject,
                        body: textBody,
                        htmlBody: parsedEmail.html || undefined,
                    },
                },
            };

            if (stepInstanceId) {
                startFlowInput.executionOverrides = {
                    startStepInstanceId: stepInstanceId,
                };
            }

            log_info('Sending message to SQS to start flow.', { startFlowInput }, correlationId);

            await sqsClient.send(new SendMessageCommand({
                QueueUrl: FLOW_START_QUEUE_URL,
                MessageBody: JSON.stringify(startFlowInput),
            }));

            log_info(`Successfully queued request to start flow from email.`, { flowDefinitionId, newFlowExecutionId, startStep: stepInstanceId || 'start' }, correlationId);

        } catch (error: any) {
            log_error(`Failed to process inbound email.`, { objectKey, error: error.message, stack: error.stack }, correlationId);
            throw error;
        }
    }
};