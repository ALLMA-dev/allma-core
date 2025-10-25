// packages/allma-app-logic/src/allma-flows/flow-start-request-listener.ts
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { StartFlowExecutionInput, StartFlowExecutionInputSchema, ENV_VAR_NAMES } from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';
import { v4 as uuidv4 } from 'uuid';

const sfnClient = new SFNClient({});
const STATE_MACHINE_ARN = process.env[ENV_VAR_NAMES.ALLMA_STATE_MACHINE_ARN]!; // ARN of the main FlowOrchestratorStateMachine

export const handler: SQSHandler = async (event: SQSEvent) => {
  const records = event.Records;
  if (!records || records.length === 0) {
    log_info('No SQS records to process.', {});
    return;
  }

  // Process records sequentially, though SFN start is async.
  // For batch processing with partial failures, more complex error handling would be needed.
  for (const record of records) {
    const correlationId = uuidv4(); // For this specific SQS message processing
    log_info('Processing SQS record to start flow', { messageId: record.messageId }, correlationId);

    try {
      console.log('Received SQS record:', JSON.stringify(record.body));
      const body = JSON.parse(record.body);
      const parsedInput = StartFlowExecutionInputSchema.safeParse(body);

      if (!parsedInput.success) {
        log_error('Invalid StartFlowExecutionInput received from SQS.', { errors: parsedInput.error.format(), messageId: record.messageId }, correlationId);
        // This message will go to DLQ if configured and Lambda errors out.
        // Or, explicitly delete from queue and send to custom error handling.
        // For now, let the error propagate for DLQ handling.
        throw new Error(`Invalid input schema for SQS message ${record.messageId}`);
      }

      let startInput: StartFlowExecutionInput = parsedInput.data;

      // Ensure a flowExecutionId exists, or generate one
      const flowExecutionId = startInput.flowExecutionId || uuidv4();
      startInput = {
        ...startInput,
        flowExecutionId,
        triggerSource: startInput.triggerSource ? `${startInput.triggerSource} (SQS:${record.eventSourceARN?.split(':').pop()})` : `SQS:${record.eventSourceARN?.split(':').pop()}`,
      };

      const command = new StartExecutionCommand({
        stateMachineArn: STATE_MACHINE_ARN,
        input: JSON.stringify(startInput),
        name: flowExecutionId, // SFN execution name, must be unique for a state machine within ~90 days
      });

      const result = await sfnClient.send(command);

      // Validate that the execution actually started by checking the response.
      if (!result.executionArn) {
        throw new Error('SFN StartExecution call did not return an executionArn. The execution may not have started.');
      }

      log_info(`Successfully started flow execution from SQS.`, { 
          flowDefinitionId: startInput.flowDefinitionId, 
          flowExecutionId: flowExecutionId, 
          sfnExecutionArn: result.executionArn, // Log the actual ARN for traceability
          messageId: record.messageId 
        }, correlationId);

    } catch (error: any) {
      log_error(`Failed to process SQS record and start flow.`, { messageId: record.messageId, error: error.message, stack: error.stack }, correlationId);
      // Re-throw to ensure the message is not deleted from the queue (goes to DLQ or retries)
      throw error;
    }
  }
};
