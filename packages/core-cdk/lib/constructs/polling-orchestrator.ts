import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { StageConfig } from 'lib/config/stack-config';

interface PollingOrchestratorProps {
  stageConfig: StageConfig;
  apiPollingLambda: lambda.IFunction; // A dedicated lambda for making the API call
}

/**
 * Defines a sub-state machine for repeatedly polling an API endpoint.
 * This is a generic utility state machine used by `POLL_EXTERNAL_API` steps.
 */
export class PollingOrchestrator extends Construct {
  public readonly pollingStateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: PollingOrchestratorProps) {
    super(scope, id);

    // --- State Machine Definition ---
    const pollApiTask = new sfnTasks.LambdaInvoke(this, 'PollApiEndpointTask', {
      lambdaFunction: props.apiPollingLambda,
      payloadResponseOnly: true,
      resultPath: '$.pollResult',
    });

    const waitState = new sfn.Wait(this, 'WaitForNextPoll', {
      time: sfn.WaitTime.secondsPath('$.pollingConfig.intervalSeconds'),
    });

    const loopSucceeded = new sfn.Succeed(this, 'PollingLoopSucceeded');

    const loopFailed = new sfn.Fail(this, 'PollingLoopFailed', {
      error: 'PollingFailed',
      cause: 'Polling exit condition for failure was met or max attempts were reached.',
    });

    const checkStatusChoice = new sfn.Choice(this, 'CheckPollStatusChoice')
      .when(sfn.Condition.booleanEquals('$.pollResult.isSuccessConditionMet', true), loopSucceeded)
      .when(sfn.Condition.booleanEquals('$.pollResult.isFailureConditionMet', true), loopFailed)
      .otherwise(waitState);

    pollApiTask.addRetry({ maxAttempts: 2 }); // Retry on transient Lambda/network errors
    pollApiTask.next(checkStatusChoice);
    waitState.next(pollApiTask); // Loop back

    const definition = pollApiTask;

    this.pollingStateMachine = new sfn.StateMachine(this, 'ApiPollingStateMachine', {
      stateMachineName: `AllmaApiPollingOrchestrator-${props.stageConfig.stage}`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.hours(props.stageConfig.sfnTimeouts.pollingOrchestratorHours),
    });
  }
}