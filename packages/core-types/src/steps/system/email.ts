import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { S3PointerSchema, JsonPathStringSchema } from '../../common/core.js';

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
    fromName: z.string().optional().describe("From Name|text|Optional: The display name for the sender (e.g., 'Allma Support')."),
    to: z.union([z.string(), z.array(z.string())]).describe("To Address(es)|json|A single email, comma-separated emails, or a template/JSONPath returning an array/string."),
    cc: z.union([z.string(), z.array(z.string())]).optional().describe("CC Address(es)|json|Optional: Carbon copy recipients. Supports templates."),
    bcc: z.union([z.string(), z.array(z.string())]).optional().describe("BCC Address(es)|json|Optional: Blind carbon copy recipients. Supports templates."),
    replyTo: z.union([z.string(), z.array(z.string())]).optional().describe("Reply-To Address(es)|json|Optional: Email(s) for replies. Supports templates."),
    subject: z.string().describe("Subject|text|The email subject. Supports templates."),
    body: z.string().describe("Body|textarea|The email body (HTML is supported). Supports templates."),
    attachments: z.array(EmailAttachmentS3PointerSchema).optional().describe("Static Attachments|json|A static list of files to attach from S3. Use 'attachmentsPath' for a dynamic list."),
    attachmentsPath: JsonPathStringSchema.optional().describe("Dynamic Attachments Path|text|A JSONPath to an array of attachment objects in the context (e.g., `$.steps_output.my_step.files`). Use this for a dynamic list."),
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
    // NEW: Added optional fromName to the rendered parameters.
    fromName: z.string().optional(),
    to: z.union([
        z.string().email({ message: "Rendered 'to' address is not a valid email." }), 
        z.array(z.string().email({ message: "One or more 'to' addresses are not valid emails." })).min(1)
    ]),
    cc: z.union([
        z.string().email({ message: "Rendered 'cc' address is not a valid email." }), 
        z.array(z.string().email({ message: "One or more 'cc' addresses are not valid emails." })).min(1)
    ]).optional(),
    bcc: z.union([
        z.string().email({ message: "Rendered 'bcc' address is not a valid email." }), 
        z.array(z.string().email({ message: "One or more 'bcc' addresses are not valid emails." })).min(1)
    ]).optional(),
    replyTo: z.union([
        z.string().email({ message: "Rendered 'replyTo' address is not a valid email." }), 
        z.array(z.string().email({ message: "One or more 'replyTo' addresses are not valid emails." })).min(1)
    ]).optional(),
    subject: z.string(),
    body: z.string(),
    attachments: z.array(RenderedEmailAttachmentSchema).optional(),
});