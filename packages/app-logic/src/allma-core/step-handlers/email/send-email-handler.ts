import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import {
    FlowRuntimeState,
    StepHandler,
    StepHandlerOutput,
    TransientStepError,
    StepDefinition,
    EmailSendStepPayloadSchema,
    RenderedEmailParamsSchema,
} from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';
import { renderNestedTemplates } from '../../../allma-core/utils/template-renderer.js';

const sesClient = new SESv2Client({});

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
 * A standard StepHandler for sending an email via AWS SES.
 * It expects a pre-rendered configuration object.
 */
export const executeSendEmail: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState,
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;

  // Combine static/literal config from the step definition with dynamic input.
  // stepInput (from mappings/literals) overrides properties on stepDefinition.
  const combinedInput = { ...stepDefinition, ...stepInput };
  
  const templateContext = { ...runtimeState.currentContextData, ...runtimeState, ...stepInput };
  const renderedInput = renderNestedTemplates(combinedInput, templateContext, correlationId);
  
  // First, parse against the relaxed schema to get the structure and values.
  const structuralValidation = EmailSendStepPayloadSchema.safeParse(renderedInput);

  if (!structuralValidation.success) {
    log_error("Invalid structural input for system/email-send module after rendering.", { 
        errors: structuralValidation.error.flatten(), 
        receivedStepInput: stepInput,
        combinedInputBeforeRender: combinedInput,
        finalInputAfterRender: renderedInput,
    }, correlationId);
    throw new Error(`Invalid input structure for email-send: ${structuralValidation.error.message}`);
  }

  // Extract and clean email addresses before strict validation.
  const { from, to, replyTo, subject, body } = structuralValidation.data;

  // Handle case where required fields resolve to undefined/null after templating
  if (!from) throw new Error("The 'from' field is missing or resolved to an empty value after template rendering.");
  if (!to) throw new Error("The 'to' field is missing or resolved to an empty value after template rendering.");
  if (subject === undefined || subject === null) throw new Error("The 'subject' field is missing or resolved to an empty value after template rendering.");
  if (body === undefined || body === null) throw new Error("The 'body' field is missing or resolved to an empty value after template rendering.");

  const cleanedParams = {
    from: extractEmail(from),
    to: Array.isArray(to) ? to.map(extractEmail) : extractEmail(to),
    replyTo: replyTo ? (Array.isArray(replyTo) ? replyTo.map(extractEmail) : extractEmail(replyTo)) : undefined,
    subject,
    body,
  };

  // Now, perform a strict validation on the cleaned, rendered values.
  const runtimeValidation = RenderedEmailParamsSchema.safeParse(cleanedParams);

  if (!runtimeValidation.success) {
    log_error("Rendered email parameters are invalid. Check that your templates resolve to valid email addresses.", { 
        errors: runtimeValidation.error.flatten(), 
        renderedValues: structuralValidation.data,
        cleanedValues: cleanedParams
    }, correlationId);
    throw new Error(`Invalid rendered parameters for email-send: ${runtimeValidation.error.message}`);
  }

  const { from: validFrom, to: validTo, replyTo: validReplyTo, subject: validSubject, body: validBody } = runtimeValidation.data;
  const toAddresses = Array.isArray(validTo) ? validTo : [validTo];
  const replyToAddresses = validReplyTo ? (Array.isArray(validReplyTo) ? validReplyTo : [validReplyTo]) : undefined;

  log_info(`Sending email via SES`, { from: validFrom, to: toAddresses, replyTo: replyToAddresses, subject: validSubject }, correlationId);

  const command = new SendEmailCommand({
    FromEmailAddress: validFrom,
    Destination: { ToAddresses: toAddresses },
    ReplyToAddresses: replyToAddresses,
    Content: {
      Simple: {
        Subject: { Data: validSubject },
        Body: { Html: { Data: validBody } },
      },
    },
  });

  try {
    const result = await sesClient.send(command);
    log_info(`Successfully sent email via SES.`, { messageId: result.MessageId }, correlationId);
    return {
      outputData: {
        sesMessageId: result.MessageId,
        _meta: { status: 'SUCCESS' },
      },
    };
  } catch (error: any) {
    log_error(`Failed to send email via SES: ${error.message}`, { from: validFrom, to: toAddresses, error: error.message }, correlationId);
    if (['ServiceUnavailable', 'ThrottlingException', 'InternalFailure'].includes(error.name)) {
      throw new TransientStepError(`SES send failed due to a transient error: ${error.message}`);
    }
    throw error;
  }
};