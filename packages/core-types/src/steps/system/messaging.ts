import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';
import { SystemModuleIdentifiers } from '../system-module-identifiers.js';

/**
 * Defines the payload for a MESSAGING step that uses a specific module to send a message.
 * This is the base schema for messaging steps.
 */
export const MessagingStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.MESSAGING),
  moduleIdentifier: z.string().optional(),
  customConfig: z.record(z.any()).optional().describe("Custom Config|json|Module-specific configuration object."),
}).passthrough();


/**
 * Defines the payload for the 'system/email-send' module.
 * This is a specific type of MESSAGING step.
 */
export const EmailSendStepPayloadSchema = z.object({
    stepType: z.literal(StepTypeSchema.enum.MESSAGING),
    moduleIdentifier: z.literal(SystemModuleIdentifiers.EMAIL_SEND),
    from: z.string().email().describe("The sender's email address (must be a verified SES identity). Supports templates."),
    to: z.union([z.string().email(), z.array(z.string().email())]).describe("Recipient email address(es). Supports templates."),
    replyTo: z.union([z.string().email(), z.array(z.string().email())]).optional().describe("Optional Reply-To email address(es). Supports templates."),
    subject: z.string().describe("The email subject. Supports templates."),
    body: z.string().describe("The email body (HTML or text). Supports templates."),
  }).passthrough();