import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { SystemModuleIdentifiers } from '../system-module-identifiers.js';

/**
 * Defines the payload for the 'system/email-send' module.
 * This is a specific step of type EMAIL.
 */
export const EmailSendStepPayloadSchema = z.object({
    stepType: z.literal(StepTypeSchema.enum.EMAIL),
    //moduleIdentifier: z.literal(SystemModuleIdentifiers.EMAIL_SEND).optional(),
    from: z.string().email().describe("From Address|text|The sender's email address (must be a verified SES identity). Supports templates."),
    to: z.union([z.string().email(), z.array(z.string().email())]).describe("To Address(es)|json|A single email string (in quotes), or an array of email strings. Supports templates."),
    replyTo: z.union([z.string().email(), z.array(z.string().email())]).optional().describe("Reply-To Address(es)|json|Optional: A single email (in quotes), or an array of emails. Supports templates."),
    subject: z.string().describe("Subject|text|The email subject. Supports templates."),
    body: z.string().describe("Body|textarea|The email body (HTML is supported). Supports templates."),
  }).passthrough();