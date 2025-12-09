import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { S3PointerSchema } from '../../common/core.js';

/**
 * Defines an email attachment by referencing a file in S3.
 * Includes a filename for the recipient's email client.
 */
export const EmailAttachmentS3PointerSchema = z.object({
  filename: z.string().min(1, 'Attachment filename is required.'),
  s3Pointer: S3PointerSchema,
});
export type EmailAttachmentS3Pointer = z.infer<typeof EmailAttachmentS3PointerSchema>;

/**
 * Defines the payload for the 'system/email-send' module.
 * This is a specific step of type EMAIL.
 * The schema allows for template strings (e.g., JSONPath) at definition time.
 * Runtime validation of the rendered email addresses is handled by the executor.
 */
export const EmailSendStepPayloadSchema = z.object({
    stepType: z.literal(StepTypeSchema.enum.EMAIL),
    moduleIdentifier: z.undefined().optional(),
    from: z.string().describe("From Address|text|The sender's email address (must be a verified SES identity). Supports templates."),
    to: z.union([z.string(), z.array(z.string())]).describe("To Address(es)|json|A single email, comma-separated emails, or a template/JSONPath returning an array/string."),
    replyTo: z.union([z.string(), z.array(z.string())]).optional().describe("Reply-To Address(es)|json|Optional: Email(s) for replies. Supports templates."),
    subject: z.string().describe("Subject|text|The email subject. Supports templates."),
    body: z.string().describe("Body|textarea|The email body (HTML is supported). Supports templates."),
    attachments: z.array(EmailAttachmentS3PointerSchema).optional().describe("Attachments|json|An array of files to attach from S3."),
  }).passthrough();

/**
 * Schema for a rendered attachment, used for strict runtime validation.
 */
export const RenderedEmailAttachmentSchema = z.object({
  filename: z.string(),
  s3Pointer: S3PointerSchema,
});
export type RenderedEmailAttachment = z.infer<typeof RenderedEmailAttachmentSchema>;

// This schema is for strict runtime validation AFTER templates have been rendered.
export const RenderedEmailParamsSchema = z.object({
    from: z.string().email({ message: "Rendered 'from' address is not a valid email." }),
    to: z.union([
        z.string().email({ message: "Rendered 'to' address is not a valid email." }), 
        z.array(z.string().email({ message: "One or more 'to' addresses are not valid emails." })).min(1)
    ]),
    replyTo: z.union([
        z.string().email({ message: "Rendered 'replyTo' address is not a valid email." }), 
        z.array(z.string().email({ message: "One or more 'replyTo' addresses are not valid emails." })).min(1)
    ]).optional(),
    subject: z.string(),
    body: z.string(),
    attachments: z.array(RenderedEmailAttachmentSchema).optional(),
});