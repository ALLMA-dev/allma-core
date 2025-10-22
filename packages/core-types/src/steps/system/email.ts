import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { SystemModuleIdentifiers } from '../system-module-identifiers.js';

/**
 * Defines the payload for the 'system/email-send' module.
 * This is a specific step of type EMAIL.
 */
export const EmailSendStepPayloadSchema = z.object({
    stepType: z.literal(StepTypeSchema.enum.EMAIL), // FIX: Use EMAIL type
    moduleIdentifier: z.literal(SystemModuleIdentifiers.EMAIL_SEND),
    from: z.string().email().describe("The sender's email address (must be a verified SES identity). Supports templates."),
    to: z.union([z.string().email(), z.array(z.string().email())]).describe("Recipient email address(es). Supports templates."),
    replyTo: z.union([z.string().email(), z.array(z.string().email())]).optional().describe("Optional Reply-To email address(es). Supports templates."),
    subject: z.string().describe("The email subject. Supports templates."),
    body: z.string().describe("The email body (HTML or text). Supports templates."),
  }).passthrough();