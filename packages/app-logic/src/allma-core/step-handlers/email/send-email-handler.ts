import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import {
    FlowRuntimeState,
    StepHandler,
    StepHandlerOutput,
    TransientStepError,
    StepDefinition,
    EmailSendStepPayloadSchema,
} from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';
import { renderNestedTemplates } from '../../../allma-core/utils/template-renderer.js';

const sesClient = new SESv2Client({});

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
  
  const validationResult = EmailSendStepPayloadSchema.safeParse(renderedInput);

  if (!validationResult.success) {
    log_error("Invalid input for system/email-send module.", { 
        errors: validationResult.error.flatten(), 
        receivedStepInput: stepInput,
        combinedInputBeforeRender: combinedInput,
        finalInputAfterRender: renderedInput,
    }, correlationId);
    throw new Error(`Invalid input for email-send: ${validationResult.error.message}`);
  }

  const { from, to, replyTo, subject, body } = validationResult.data;
  const toAddresses = Array.isArray(to) ? to : [to];
  const replyToAddresses = replyTo ? (Array.isArray(replyTo) ? replyTo : [replyTo]) : undefined;

  log_info(`Sending email via SES`, { from, to: toAddresses, replyTo: replyToAddresses, subject }, correlationId);

  const command = new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: toAddresses },
    ReplyToAddresses: replyToAddresses,
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: { Html: { Data: body } },
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
    log_error(`Failed to send email via SES: ${error.message}`, { from, to, error: error.message }, correlationId);
    if (['ServiceUnavailable', 'ThrottlingException', 'InternalFailure'].includes(error.name)) {
      throw new TransientStepError(`SES send failed due to a transient error: ${error.message}`);
    }
    throw error;
  }
};