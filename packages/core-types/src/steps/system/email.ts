import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';

/**
 * Defines the payload for the 'system/email-send' module.
 * This is a specific step of type EMAIL.
 * The schema allows for template strings (e.g., JSONPath) at definition time.
 * Runtime validation of the rendered email addresses is handled by the executor.
 */
export const EmailSendStepPayloadSchema = z.object({
    stepType: z.literal(StepTypeSchema.enum.EMAIL),
    from: z.string().describe("From Address|text|The sender's email address (must be a verified SES identity). Supports templates."),
    to: z.union([z.string(), z.array(z.string())]).describe("To Address(es)|json|A single email string (in quotes), an array of email strings, or a JSONPath to either. Supports templates."),
    replyTo: z.union([z.string(), z.array(z.string())]).optional().describe("Reply-To Address(es)|json|Optional: A single email (in quotes), an array of emails, or a JSONPath. Supports templates."),
    subject: z.string().describe("Subject|text|The email subject. Supports templates."),
    body: z.string().describe("Body|textarea|The email body (HTML is supported). Supports templates."),
  }).passthrough();

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
});