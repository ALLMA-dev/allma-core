import { SESv2Client, SendEmailCommand, SendEmailCommandOutput } from '@aws-sdk/client-sesv2';
import { SESClient, SendRawEmailCommand, SendRawEmailCommandOutput } from '@aws-sdk/client-ses';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { JSONPath } from 'jsonpath-plus';
import {
    FlowRuntimeState,
    StepHandler,
    StepHandlerOutput,
    TransientStepError,
    StepDefinition,
    EmailSendStepPayloadSchema,
    RenderedEmailParamsSchema,
    RenderedEmailAttachment,
    PermanentStepError,
    EmailAttachmentS3PointerSchema,
} from '@allma/core-types';
import { log_error, log_info, log_debug, log_warn } from '@allma/core-sdk';
import { renderNestedTemplates } from '../../../allma-core/utils/template-renderer.js';

const sesV2Client = new SESv2Client({});
const sesClient = new SESClient({}); // For Raw Email
const s3Client = new S3Client({});
const SES_ATTACHMENT_SIZE_LIMIT_BYTES = 7 * 1024 * 1024; // 7MB safe limit for raw attachments before base64 encoding.

/**
 * Extracts the email address from a string that might be in the "Name <email@example.com>" format.
 * @param input The string to parse.
 * @returns The extracted email address.
 */
function extractEmail(input: string): string {
    if (typeof input !== 'string') return '';
    const match = input.match(/<([^>]+)>/);
    return match ? match[1] : input.trim();
}

/**
 * Builds a raw multipart/mixed MIME message for sending an email with attachments.
 */
async function buildRawEmail(params: {
    from: string;
    fromName?: string;
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string | string[];
    subject: string;
    body: string;
    attachments: RenderedEmailAttachment[];
    correlationId: string;
}): Promise<string> {
    const { from, fromName, to, cc, bcc, replyTo, subject, body, attachments, correlationId } = params;
    const boundary = `----=_Part_${uuidv4().replace(/-/g, '')}`;

    const fromHeader = fromName
        ? `"${fromName.replace(/"/g, '\\"')}" <${from}>`
        : from;
    let rawMessage = `From: ${fromHeader}\r\n`;

    rawMessage += `To: ${Array.isArray(to) ? to.join(', ') : to}\r\n`;
    if (cc) {
        rawMessage += `Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}\r\n`;
    }
    if (bcc) {
        rawMessage += `Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}\r\n`;
    }
    if (replyTo) {
        rawMessage += `Reply-To: ${Array.isArray(replyTo) ? replyTo.join(', ') : replyTo}\r\n`;
    }
    rawMessage += `Subject: ${subject}\r\n`;
    rawMessage += `MIME-Version: 1.0\r\n`;
    rawMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

    // HTML body part
    rawMessage += `--${boundary}\r\n`;
    rawMessage += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
    rawMessage += body + `\r\n`;

    // Attachment parts
    let totalAttachmentSize = 0;

    for (const attachment of attachments) {
        log_debug(`Processing attachment: ${attachment.filename}`, { s3: attachment.s3Pointer }, correlationId);

        const getObjectResponse = await s3Client.send(new GetObjectCommand({
            Bucket: attachment.s3Pointer.bucket,
            Key: attachment.s3Pointer.key,
        }));
        
        if (!getObjectResponse.Body) {
            throw new PermanentStepError(`S3 object body is empty for attachment: ${attachment.s3Pointer.key}`);
        }
        
        totalAttachmentSize += getObjectResponse.ContentLength || 0;
        if (totalAttachmentSize > SES_ATTACHMENT_SIZE_LIMIT_BYTES) {
            throw new PermanentStepError(`Total attachment size of ${totalAttachmentSize} bytes exceeds the safe limit of ${SES_ATTACHMENT_SIZE_LIMIT_BYTES} bytes.`);
        }
        
        const buffer = await getObjectResponse.Body.transformToByteArray();
        const base64Content = Buffer.from(buffer).toString('base64');
        
        rawMessage += `--${boundary}\r\n`;
        rawMessage += `Content-Type: ${getObjectResponse.ContentType || 'application/octet-stream'}\r\n`;
        rawMessage += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
        rawMessage += `Content-Transfer-Encoding: base64\r\n\r\n`;
        // Chunk the base64 content to be compliant with RFC 2045
        rawMessage += base64Content.replace(/.{76}/g, "$&\r\n") + `\r\n`;
    }

    // Final boundary
    rawMessage += `--${boundary}--\r\n`;

    return rawMessage;
}

/**
 * A standard StepHandler for sending an email via AWS SES.
 * It expects a pre-rendered configuration object.
 */
export const executeSendEmail: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;
  const templateObject = stepDefinition;
  const templateContext = { ...runtimeState.currentContextData, ...runtimeState, ...stepInput };
  
  const renderedInput = await renderNestedTemplates(templateObject, templateContext, correlationId);
  
  const structuralValidation = EmailSendStepPayloadSchema.safeParse(renderedInput);

  if (!structuralValidation.success) {
    log_error("Invalid structural input for system/email-send module after rendering.", { 
        errors: structuralValidation.error.flatten(), 
        receivedStepInput: stepInput,
        templateObjectBeforeRender: templateObject,
        finalInputAfterRender: renderedInput,
    }, correlationId);
    throw new Error(`Invalid input structure for email-send: ${structuralValidation.error.message}`);
  }

  const processAddressField = (fieldValue: string | string[] | undefined): string | string[] | undefined => {
      if (typeof fieldValue !== 'string') return fieldValue;
      const trimmed = fieldValue.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) return parsed;
          } catch (e) {
              log_debug('An address field looked like a JSON array but failed to parse. Falling back to intelligent comma-splitting.', { value: trimmed }, correlationId);
          }
      }
      const rawParts = trimmed.split(',');
      const finalAddresses: string[] = [];
      let currentBuffer = "";
      for (let i = 0; i < rawParts.length; i++) {
          const part = rawParts[i];
          currentBuffer = currentBuffer === "" ? part : `${currentBuffer},${part}`;
          const hasAt = currentBuffer.includes('@');
          const openAngles = (currentBuffer.match(/</g) || []).length;
          const closeAngles = (currentBuffer.match(/>/g) || []).length;
          const quotes = (currentBuffer.match(/"/g) || []).length;
          const isBalanced = (openAngles === closeAngles) && (quotes % 2 === 0);
          if ((hasAt && isBalanced) || i === rawParts.length - 1) {
               const cleanAddress = currentBuffer.trim();
               if (cleanAddress.length > 0) finalAddresses.push(cleanAddress);
               currentBuffer = "";
          }
      }
      return finalAddresses.length === 1 ? finalAddresses[0] : finalAddresses;
  };

  const { from, fromName, to: rawTo, cc: rawCc, bcc: rawBcc, replyTo: rawReplyTo, subject, body, attachments: staticAttachments, attachmentsPath } = structuralValidation.data;

    let finalAttachments: RenderedEmailAttachment[] | undefined;

    if (staticAttachments) {
        log_debug('Using static attachments list from step configuration.', { count: staticAttachments.length }, correlationId);
        finalAttachments = staticAttachments;
    } else if (attachmentsPath) {
        log_debug(`Resolving dynamic attachments from path: ${attachmentsPath}`, {}, correlationId);
        const dynamicAttachmentsValue = JSONPath({ path: attachmentsPath, json: templateContext, wrap: false });

        if (dynamicAttachmentsValue === undefined) {
            log_warn(`attachmentsPath '${attachmentsPath}' resolved to undefined. No attachments will be sent.`, {}, correlationId);
            finalAttachments = [];
        } else {
            const attachmentsValidation = z.array(EmailAttachmentS3PointerSchema).safeParse(dynamicAttachmentsValue);
            if (!attachmentsValidation.success) {
                log_error(`The value at attachmentsPath '${attachmentsPath}' is not a valid array of attachment objects.`, { errors: attachmentsValidation.error.flatten(), valuePreview: JSON.stringify(dynamicAttachmentsValue).substring(0, 500) }, correlationId);
                throw new PermanentStepError(`The data found at attachmentsPath '${attachmentsPath}' is not a valid array of attachment objects: ${attachmentsValidation.error.message}`);
            }
            finalAttachments = attachmentsValidation.data;
            log_info(`Successfully resolved ${finalAttachments.length} dynamic attachments.`, {}, correlationId);
        }
    }

  const to = processAddressField(rawTo);
  const cc = processAddressField(rawCc);
  const bcc = processAddressField(rawBcc);
  const replyTo = processAddressField(rawReplyTo);

  if (!from) throw new Error("The 'from' field is missing or resolved to an empty value after template rendering.");
  if (!to || (Array.isArray(to) && to.length === 0)) throw new Error("The 'to' field is missing or resolved to an empty value after template rendering.");
  if (subject === undefined || subject === null) throw new Error("The 'subject' field is missing or resolved to an empty value after template rendering.");
  if (body === undefined || body === null) throw new Error("The 'body' field is missing or resolved to an empty value after template rendering.");

  const cleanedParams = {
    from: from,
    fromName: fromName,
    to: Array.isArray(to) ? to.map(extractEmail) : extractEmail(to as string),
    cc: cc ? (Array.isArray(cc) ? cc.map(extractEmail) : extractEmail(cc as string)) : undefined,
    bcc: bcc ? (Array.isArray(bcc) ? bcc.map(extractEmail) : extractEmail(bcc as string)) : undefined,
    replyTo: replyTo ? (Array.isArray(replyTo) ? replyTo.map(extractEmail) : extractEmail(replyTo as string)) : undefined,
    subject,
    body,
    attachments: finalAttachments,
  };

  const runtimeValidation = RenderedEmailParamsSchema.safeParse(cleanedParams);

  if (!runtimeValidation.success) {
    log_error("Rendered email parameters are invalid. Check that your templates resolve to valid email addresses.", { 
        errors: runtimeValidation.error.flatten(),
        renderedValues: structuralValidation.data,
        processedValues: { to, cc, bcc, replyTo }, 
        cleanedValues: cleanedParams
    }, correlationId);
    throw new Error(`Invalid rendered parameters for email-send: ${runtimeValidation.error.message}`);
  }

  const validatedEmailParams = runtimeValidation.data;
  const { from: validFrom, fromName: validFromName, to: validTo, cc: validCc, bcc: validBcc, replyTo: validReplyTo, subject: validSubject, body: validBody, attachments: validAttachments } = validatedEmailParams;
  
  try {
    if (validAttachments && validAttachments.length > 0) {
        // --- Send with Attachments using SendRawEmail ---
        log_info(`Sending email with ${validAttachments.length} attachments via SES SendRawEmail`, { from: validFrom, to: validTo, cc: validCc, subject: validSubject }, correlationId);

       const buildParams = {
            from: validFrom,
            ...(validFromName && { fromName: validFromName }),
            to: validTo,
            subject: validSubject,
            body: validBody,
            attachments: validAttachments,
            correlationId,
            ...(validCc && { cc: validCc }),
            ...(validBcc && { bcc: validBcc }),
            ...(validReplyTo && { replyTo: validReplyTo })
        };
        const rawMessage = await buildRawEmail(buildParams);

        const command = new SendRawEmailCommand({
            RawMessage: { Data: Buffer.from(rawMessage) }
        });

        const result:SendRawEmailCommandOutput = await sesClient.send(command);
        log_info(`Successfully sent raw email via SES.`, { messageId: result.MessageId }, correlationId);
        return {
          outputData: {
            sesMessageId: result.MessageId,
            renderedEmail: validatedEmailParams,
            _meta: { status: 'SUCCESS' },
          },
        };
    } else {
        // --- Send Simple Email (No Attachments) ---
        const toAddresses = Array.isArray(validTo) ? validTo.map(extractEmail) : [extractEmail(validTo)];
        const ccAddresses = validCc ? (Array.isArray(validCc) ? validCc.map(extractEmail) : [extractEmail(validCc as string)]) : undefined;
        const bccAddresses = validBcc ? (Array.isArray(validBcc) ? validBcc.map(extractEmail) : [extractEmail(validBcc as string)]) : undefined;
        const replyToAddresses = validReplyTo ? (Array.isArray(validReplyTo) ? validReplyTo.map(extractEmail) : [extractEmail(validReplyTo as string)]) : undefined;

        log_info(`Sending simple email via SES`, { from: validFrom, fromName: validFromName, to: toAddresses, cc: ccAddresses, replyTo: replyToAddresses, subject: validSubject }, correlationId);

        const fromAddress = validFromName
            ? `"${validFromName.replace(/"/g, '\\"')}" <${validFrom}>`
            : validFrom;

        const command = new SendEmailCommand({
            FromEmailAddress: fromAddress,
            Destination: { 
                ToAddresses: toAddresses,
                CcAddresses: ccAddresses,
                BccAddresses: bccAddresses,
             },
            ReplyToAddresses: replyToAddresses,
            Content: {
                Simple: {
                    Subject: { Data: validSubject },
                    Body: { Html: { Data: validBody } },
                },
            },
        });
        
        const result:SendEmailCommandOutput = await sesV2Client.send(command);
        log_info(`Successfully sent email via SES.`, { messageId: result.MessageId }, correlationId);
        return {
          outputData: {
            sesMessageId: result.MessageId,
            renderedEmail: validatedEmailParams,
            _meta: { status: 'SUCCESS' },
          },
        };
    }
  } catch (error: any) {
    log_error(`Failed to send email via SES: ${error.message}`, { from: validFrom, to: validTo, error: error.message, stack: error.stack }, correlationId);
    if (['ServiceUnavailable', 'ThrottlingException', 'InternalFailure'].includes(error.name)) {
      throw new TransientStepError(`SES send failed due to a transient error: ${error.message}`);
    }
    throw error;
  }
};