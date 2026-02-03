import { z } from 'zod';
import { EmailAttachmentSchema } from '../runtime/core.js';

/**
 * Defines the structure of the context object injected into a flow
 * when it is triggered by an inbound email. This object is available at
 * `$.triggeringEmail` in the initial flow context.
 */
export const TriggeringEmailContextSchema = z.object({
  /** The full 'From' header, which may include a name (e.g., "Jane Doe <jane@example.com>"). */
  from: z.string().optional(),
  /** The name of the sender, if available (e.g., "Jane Doe"). */
  senderName: z.string().optional(),
  /** The sender's full email address (e.g., "jane@example.com"). */
  senderFullEmail: z.string().email().optional(),
  /** The local-part of the sender's email address (e.g., "jane"). */
  senderEmailPrefix: z.string().optional(),
  /** The recipient's email address that triggered the flow. */
  to: z.string().email(),
  /** The subject of the email. */
  subject: z.string().optional(),
  /** The plain text body of the email. */
  body: z.string(),
  /** The HTML body of the email, if available. */
  htmlBody: z.string().optional(),
  /** An array of attachments found in the email. */
  attachments: z.array(EmailAttachmentSchema).default([]),
  /** The value extracted from the email body if a `triggerMessagePattern` is configured on the start step. */
  triggerPattern: z.string().optional(),
});

export type TriggeringEmailContext = z.infer<typeof TriggeringEmailContextSchema>;