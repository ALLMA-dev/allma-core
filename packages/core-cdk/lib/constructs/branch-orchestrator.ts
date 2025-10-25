import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CONTENT_BASED_RETRYABLE_ERROR_NAME, RETRYABLE_STEP_ERROR_NAME } from '@allma/core-types';
import { StageConfig } from 'lib/config/stack-config';

interface BranchOrchestratorProps {
  stageConfig: StageConfig;
  iterativeStepProcessorLambda: lambda.IFunction;
  orchestrationLambdaRole: iam.IRole; // Role for the main orchestration lambdas
}

/**
 * Defines a sub-state machine for executing a single, synchronous parallel branch.
 * This state machine repeatedly invokes the Iterative Step Processor until the branch completes or fails.
 */
export class BranchOrchestrator extends Construct {
  public readonly branchStateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: BranchOrchestratorProps) {
    super(scope, id);

    const { stageConfig, iterativeStepProcessorLambda } = props;

    // Define the single task for this state machine
    const processStepTask = new sfnTasks.LambdaInvoke(this, 'ProcessBranchStepTask', {
      lambdaFunction: iterativeStepProcessorLambda,
      payloadResponseOnly: true,
      resultPath: '$', // The output of the ISP replaces the entire state
    });

    // Add robust retry logic for both application-level and service-level transient errors.
    processStepTask.addRetry({
        errors: [
            // Custom application-level retryable errors
            RETRYABLE_STEP_ERROR_NAME, 
            CONTENT_BASED_RETRYABLE_ERROR_NAME,
            // AWS Lambda service-level transient errors, including throttling (429)
            'Lambda.TooManyRequestsException',
            'Lambda.ServiceException',
            'Lambda.Unknown',
        ],
        interval: cdk.Duration.seconds(10),
        maxAttempts: 3,
        backoffRate: 2.0, // Use exponential backoff for service errors
    });

    // A Pass state to extract just the final output from the context, ensuring a clean result.
    const extractSpecificOutput = new sfn.Pass(this, 'ExtractBranchOutput', {
      comment: 'Extracts the final result from $.runtimeState.currentContextData.output to be the sub-flow output.',
      outputPath: '$.runtimeState.currentContextData.output',
    });

    // FIX: A fallback Pass state that returns an empty object if no specific "output" property is set.
    // This prevents the entire (potentially large) context from being returned, avoiding DataLimitExceeded errors.
    const returnEmptyOutput = new sfn.Pass(this, 'ReturnEmptyOutput', {
        comment: 'Returns an empty object as the branch output since no specific "output" property was set.',
        result: sfn.Result.fromObject({}),
    });

    // A Choice state to decide which output to return.
    const checkFinalOutputChoice = new sfn.Choice(this, 'CheckFinalOutputChoice')
        .when(
            sfn.Condition.isPresent('$.runtimeState.currentContextData.output'),
            extractSpecificOutput
        )
        .otherwise(returnEmptyOutput);

    // --- FAILURE HANDLING STATES ---

    // This state is for handling logical failures reported by the ISP.
    const formatLogicalFailureState = new sfn.Pass(this, 'FormatLogicalFailure', {
        parameters: {
            'Error.$': '$.runtimeState.errorInfo.errorName',
            // The Cause for a Fail state MUST be a string. We stringify the errorInfo object.
            'Cause.$': 'States.JsonToString($.runtimeState.errorInfo)',
        },
    });
    
    // This state handles errors from the Lambda invocation itself (e.g., timeout, unhandled exception).
    const normalizeLambdaErrorState = new sfn.Pass(this, 'NormalizeBranchError', {
        parameters: {
            'Error.$': '$.Error',
            // The Cause from a Lambda failure is already a stringified object. Just pass it through.
            'Cause.$': '$.Cause',
        }
    });

    // The final Fail state for the branch.
    const branchFailedState = new sfn.Fail(this, 'BranchFailed', {
        errorPath: sfn.JsonPath.stringAt('$.Error'),
        causePath: sfn.JsonPath.stringAt('$.Cause'),
    });

    formatLogicalFailureState.next(branchFailedState);
    normalizeLambdaErrorState.next(branchFailedState);
    
    // --- STATE MACHINE LOGIC ---

    // After the step loop finishes, check if the ISP reported a logical failure.
    const checkBranchStatusChoice = new sfn.Choice(this, 'CheckBranchStatusChoice')
        .when(
            sfn.Condition.stringEquals('$.runtimeState.status', 'FAILED'),
            formatLogicalFailureState // If failed, go to the failure path.
        )
        .otherwise(checkFinalOutputChoice); // Otherwise, proceed to format the success output.

    // A choice state to check if the branch flow should continue or end
    const checkCompletionChoice = new sfn.Choice(this, 'IsBranchCompleteChoice')
      .when(
        sfn.Condition.isPresent('$.runtimeState.currentStepInstanceId'),
        processStepTask // If there's a next step, loop back
      )
      .otherwise(checkBranchStatusChoice); // If finished, check the final status (success or logical failure).

    processStepTask.next(checkCompletionChoice);
    
    // This catch block handles infra/runtime errors from the Lambda invocation itself.
    processStepTask.addCatch(normalizeLambdaErrorState, { resultPath: '$' });

    const definition = processStepTask;

    this.branchStateMachine = new sfn.StateMachine(this, 'BranchOrchestratorStateMachine', {
      stateMachineName: `AllmaBranchOrchestrator-${stageConfig.stage}`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      role: new iam.Role(this, 'BranchStateMachineRole', {
        assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
        inlinePolicies: {
          InvokeIterativeStepProcessor: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: ['lambda:InvokeFunction'],
                resources: [iterativeStepProcessorLambda.functionArn],
              }),
            ],
          }),
        },
      }),
      timeout: cdk.Duration.minutes(stageConfig.sfnTimeouts.branchOrchestratorMinutes), 
    });
  }
}