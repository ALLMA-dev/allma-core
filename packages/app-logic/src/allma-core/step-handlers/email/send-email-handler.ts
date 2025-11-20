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
import { log_error, log_info, log_debug } from '@allma/core-sdk';
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

  // The stepDefinition object itself contains the templates (e.g., subject: "Re: {{subject}}").
  // This will be the object we render.
  const templateObject = stepDefinition;
  
  // The context for rendering needs to include the general flow context
  // AND the specific inputs for this step from inputMappings.
  const templateContext = { ...runtimeState.currentContextData, ...runtimeState, ...stepInput };
  
  // Now, render the templates within the stepDefinition using the full context.
  // Await the async renderer to ensure JSONPaths are resolved correctly.
  const renderedInput = await renderNestedTemplates(templateObject, templateContext, correlationId);
  
  // First, parse against the relaxed schema to get the structure and values.
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

  // --- START FIX: Handle stringified JSON arrays AND comma-separated strings from dynamic context ---

  /**
   * Processes a dynamic address field that could be a stringified JSON array,
   * a comma-separated string, a single email string, or a native array.
   * @param fieldValue The value to process.
   * @returns An array of strings, a single string, or undefined.
   */
  const processAddressField = (fieldValue: string | string[] | undefined): string | string[] | undefined => {
      if (typeof fieldValue !== 'string') {
          return fieldValue; // It's already an array, or undefined/null.
      }
      
      const trimmed = fieldValue.trim();

      // Case 1: Attempt to parse as a stringified JSON array.
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                  log_debug('Successfully parsed stringified JSON array in address field.', { originalValue: fieldValue }, correlationId);
                  return parsed;
              }
          } catch (e) {
              log_debug('An address field appeared to be a JSON array but failed to parse. Falling back to comma-splitting.', { value: trimmed }, correlationId);
          }
      }

      // Case 2: Treat as a comma-separated list (this also handles a single email string).
      // The split will create an array. If no commas, it's an array of one.
      // Filter out any empty strings that might result from trailing commas or ",,".
      const parts = trimmed.split(',').map(email => email.trim()).filter(email => email.length > 0);
      
      // Return single string if one item, array otherwise. This matches existing behaviors where single strings are allowed.
      return parts.length === 1 ? parts[0] : parts;
  };

  const { from, to: rawTo, replyTo: rawReplyTo, subject, body } = structuralValidation.data;

  const to = processAddressField(rawTo);
  const replyTo = processAddressField(rawReplyTo);

  // --- END FIX ---

  // Handle case where required fields resolve to undefined/null after templating
  if (!from) throw new Error("The 'from' field is missing or resolved to an empty value after template rendering.");
  if (!to || (Array.isArray(to) && to.length === 0)) throw new Error("The 'to' field is missing or resolved to an empty value after template rendering.");
  if (subject === undefined || subject === null) throw new Error("The 'subject' field is missing or resolved to an empty value after template rendering.");
  if (body === undefined || body === null) throw new Error("The 'body' field is missing or resolved to an empty value after template rendering.");

  const cleanedParams = {
    from: extractEmail(from),
    // Use the processed 'to' and 'replyTo' values
    to: Array.isArray(to) ? to.map(extractEmail) : extractEmail(to as string),
    replyTo: replyTo ? (Array.isArray(replyTo) ? replyTo.map(extractEmail) : extractEmail(replyTo as string)) : undefined,
    subject,
    body,
  };

  // Now, perform a strict validation on the cleaned, rendered values.
  const runtimeValidation = RenderedEmailParamsSchema.safeParse(cleanedParams);

  if (!runtimeValidation.success) {
    log_error("Rendered email parameters are invalid. Check that your templates resolve to valid email addresses.", { 
        errors: runtimeValidation.error.flatten(), 
        // Log the state of data at each step for debugging
        renderedValues: structuralValidation.data,
        processedValues: { to, replyTo }, // Log what the processAddressField function produced
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