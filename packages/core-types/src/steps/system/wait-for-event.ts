import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';

/**
 * Defines the configuration for a step that pauses the flow to wait for an external event.
 */
export const WaitForExternalEventStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.WAIT_FOR_EXTERNAL_EVENT),
  moduleIdentifier: z.undefined().optional(),
  correlationKeyTemplate: z.string().min(1).describe("Correlation Key Template|text|Template to generate a unique key to resume this flow."),
  promptUserMessageTemplate: z.record(z.any()).or(z.string()).optional().describe("Prompt Message Template|json|A message or template to send to the user before waiting."),
  messageSenderModuleIdentifier: z.string().optional().describe("Message Sender Module|text|Identifier of the module responsible for sending the prompt."),
  maxWaitTimeSeconds: z.number().int().positive().optional().describe("Max Wait Time (seconds)|text|Maximum time to wait before the flow times out."),
}).passthrough();