import { WaitForExternalEventStepSchema, StepDefinition, FlowRuntimeState, StepHandler, StepHandlerOutput } from '@allma/core-types';
import { log_error, log_info, log_debug, log_warn } from '@allma/core-sdk';
import { TemplateService } from '../template-service';

// This handler executes *before* the SFN pauses.
// Its primary role is to perform any actions needed before waiting, like sending a prompt.
export const handleWaitForExternalEvent: StepHandler = async (
  stepDefinition: StepDefinition,
  stepInput: Record<string, any>,
  runtimeState: FlowRuntimeState
): Promise<StepHandlerOutput> => {
  const correlationId = runtimeState.flowExecutionId;
  const parsedStepDef = WaitForExternalEventStepSchema.safeParse(stepDefinition);

  if (!parsedStepDef.success) {
    log_error("StepDefinition for WAIT_FOR_EXTERNAL_EVENT is invalid.", { errors: parsedStepDef.error.flatten() }, correlationId);
    throw new Error("Invalid StepDefinition for WAIT_FOR_EXTERNAL_EVENT.");
  }
  const { data: waitStepDef } = parsedStepDef;
  log_info(`Executing pre-wait logic for WAIT_FOR_EXTERNAL_EVENT step: ${waitStepDef.name}`, {}, correlationId);

  // 1. Handle prompting the user, if configured
  if (waitStepDef.promptUserMessageTemplate && waitStepDef.messageSenderModuleIdentifier) {
    const templateService = TemplateService.getInstance();
    
    // For a simpler string template directly:
    let messageToSend: string;
    if (typeof waitStepDef.promptUserMessageTemplate === 'string') {
        messageToSend = await templateService.render(waitStepDef.promptUserMessageTemplate, runtimeState.currentContextData, correlationId);
    } else { // Assuming it's a more complex template object
        // This part needs more specific schema for promptUserMessageTemplate if it's not just a string.
        // For now, log a warning.
        log_warn('Complex promptUserMessageTemplate structure not fully handled in this mock.', {}, correlationId);
        messageToSend = "Default prompt: Please provide your input.";
    }


    // Invoke the message sender module
    // This is a placeholder. In a real system, this would involve:
    // - Identifying the module (e.g., another Lambda, an SDK for a messaging service).
    // - Invoking it with `messageToSend` and necessary context (e.g., userId, channel).
    log_info(`Placeholder: Sending prompt message via module '${waitStepDef.messageSenderModuleIdentifier}'`, { message: messageToSend }, correlationId);
    // Example: await invokeMessageSenderLambda(waitStepDef.messageSenderModuleIdentifier, messageToSend, runtimeState.currentContextData.user);
    
    // For the purpose of this task, we'll just log.
    // Actual implementation of module invocation would require more infrastructure and definition.
    runtimeState.currentContextData[`_log_message_sent_${waitStepDef.id}`] = {
        module: waitStepDef.messageSenderModuleIdentifier,
        message: messageToSend,
        timestamp: new Date().toISOString(),
    };
    log_debug('Logged sent message to context (placeholder action).', {}, correlationId);

  } else {
    log_info('No prompt message configured for this wait step.', {}, correlationId);
  }

  // The outputData is null because this step's main effect is pausing the SFN,
  // which is handled by the SFN task type, not by data merging here.
  // No specializedOutput needed as the SFN task itself handles the taskToken.
  return {
    outputData: undefined,
  };
};