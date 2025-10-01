import { SFNClient, StartSyncExecutionCommand } from '@aws-sdk/client-sfn';
import { FlowRuntimeState, PollExternalApiStepSchema, StepDefinition, StepHandler } from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';

const sfnClient = new SFNClient({});
const POLLING_SFN_ARN = process.env.POLLING_STATE_MACHINE_ARN!;

export const handlePollExternalApi: StepHandler = async (
      stepDefinition: StepDefinition,
      stepInput: Record<string, any>,
      runtimeState: FlowRuntimeState
    ) => {
  const correlationId = runtimeState.flowExecutionId;
  const parsedStepDef = PollExternalApiStepSchema.safeParse(stepDefinition);
  if (!parsedStepDef.success) throw new Error("Invalid StepDefinition for POLL_EXTERNAL_API.");
  
  const { data: pollStepDef } = parsedStepDef;
  log_info(`Starting polling loop: ${pollStepDef.name}`, {}, correlationId);

  // The input for our generic polling state machine
  const pollingInput = {
    apiCallDefinition: pollStepDef.apiCallDefinition,
    pollingConfig: pollStepDef.pollingConfig,
    exitConditions: pollStepDef.exitConditions,
    // Pass the main flow context so the API call template can be rendered
    flowContext: runtimeState.currentContextData,
  };

  try {
    const result = await sfnClient.send(new StartSyncExecutionCommand({
      stateMachineArn: POLLING_SFN_ARN,
      input: JSON.stringify(pollingInput),
    }));

    if (result.status !== 'SUCCEEDED') {
      const errorInfo = JSON.parse(result.cause || '{}');
      throw new Error(`Polling loop failed: ${errorInfo.errorMessage || result.error}`);
    }

    const output = JSON.parse(result.output || '{}');

    // The output of a successful poll is the final API response
    return {
      outputData: output.pollResult.responseData,
    };
  } catch (error: any) {
    log_error(`Polling step '${pollStepDef.name}' failed`, { error: error.message }, correlationId);
    throw error;
  }
};
