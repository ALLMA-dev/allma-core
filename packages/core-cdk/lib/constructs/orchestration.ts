import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import *as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import { RETRYABLE_STEP_ERROR_NAME, CONTENT_BASED_RETRYABLE_ERROR_NAME, SfnActionType } from '@allma/core-types';
import { StageConfig } from '../config/stack-config.js';

interface AllmaOrchestrationProps {
  stageConfig: StageConfig;
  initializeFlowLambda: lambda.IFunction;
  iterativeStepProcessorLambda: lambda.IFunction;
  finalizeFlowLambda: lambda.IFunction;
  pollingStateMachineArn: string;
  branchStateMachineArn: string;
  executionTracesBucket: s3.IBucket;
}

/**
 * Defines the main Step Functions state machine for flow orchestration.
 * This construct orchestrates the entire lifecycle of a flow execution.
 */
export class AllmaOrchestration extends Construct {
  public readonly flowOrchestratorStateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: AllmaOrchestrationProps) {
    super(scope, id);

    const { stageConfig, initializeFlowLambda, iterativeStepProcessorLambda, finalizeFlowLambda, pollingStateMachineArn, branchStateMachineArn, executionTracesBucket } = props;

    // Common retry policy for transient Lambda service errors like throttling (429).
    const lambdaServiceErrorRetryPolicy = {
      errors: [
        'Lambda.TooManyRequestsException',
        'Lambda.ServiceException',
        'Lambda.Unknown', // Throttling can sometimes manifest as an unknown error to SFN.
      ],
      interval: cdk.Duration.seconds(5),
      maxAttempts: 3,
      backoffRate: 2.0, // Exponential backoff
    };
    

    const stateMachineRole = new iam.Role(this, 'AllmaStateMachineRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      description: `IAM Role for ALLMA Flow Orchestrator State Machine (${stageConfig.stage})`,
    });

    initializeFlowLambda.grantInvoke(stateMachineRole);
    iterativeStepProcessorLambda.grantInvoke(stateMachineRole);
    finalizeFlowLambda.grantInvoke(stateMachineRole);
    
    // Grant permission to start the polling sub-state machine
    stateMachineRole.addToPolicy(new iam.PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [pollingStateMachineArn],
    }));

    // Grant permission to start the branch sub-state machine
    const branchStateMachine = sfn.StateMachine.fromStateMachineArn(this, 'BranchSubStateMachine', branchStateMachineArn);
    branchStateMachine.grantStartExecution(stateMachineRole);

    // Grant the State Machine role permission to read from the traces bucket for the Distributed Map state.
    executionTracesBucket.grantRead(stateMachineRole);

    // --- Define State Machine Tasks ---
    const initTask = new sfnTasks.LambdaInvoke(this, 'InitializeFlowExecutionTask', {
      lambdaFunction: initializeFlowLambda,
      comment: 'Initialize flow state and load flow definition.',
      payloadResponseOnly: true,
      resultPath: '$',
    });
    // Add retry for transient service errors
    initTask.addRetry(lambdaServiceErrorRetryPolicy);

    const iterativeStepTask = new sfnTasks.LambdaInvoke(this, 'IterativeStepProcessorTask', {
      lambdaFunction: iterativeStepProcessorLambda,
      comment: 'Process one step of the flow and determine the next.',
      payloadResponseOnly: true,
      resultPath: '$',
      retryOnServiceExceptions: true,
    });

    const waitForEventTask = new sfnTasks.LambdaInvoke(this, 'WaitForExternalEventTask', {
        lambdaFunction: iterativeStepProcessorLambda,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          'runtimeState.$': '$.runtimeState',
          'taskToken': sfn.JsonPath.taskToken,
        }),
        heartbeat: cdk.Duration.days(stageConfig.sfnTimeouts.mainOrchestratorDays > 0 ? stageConfig.sfnTimeouts.mainOrchestratorDays - 1 : 1),
        resultPath: '$.resumePayload',
    });
  
    const pollingSubFlowTask = new sfnTasks.StepFunctionsStartExecution(this, 'PollingSubFlowTask', {
        stateMachine: sfn.StateMachine.fromStateMachineArn(this, 'PollingSubStateMachine', pollingStateMachineArn),
        integrationPattern: sfn.IntegrationPattern.RUN_JOB,
        input: sfn.TaskInput.fromJsonPathAt('$.pollingTaskInput'),
        resultPath: '$.pollingResult',
        resultSelector: {
            'Output.$': 'States.StringToJson($.Output)'
        }
    });

    const finalizeTask = new sfnTasks.LambdaInvoke(this, 'FinalizeFlowExecutionTask', {
      lambdaFunction: finalizeFlowLambda,
      comment: 'Finalize flow execution and log results.',
      payloadResponseOnly: true,
      resultPath: '$',
    });
    // Add retry for transient service errors
    finalizeTask.addRetry(lambdaServiceErrorRetryPolicy);

    const successState = new sfn.Succeed(this, 'FlowSucceeded');

    const failureState = new sfn.Fail(this, 'FlowFailed', {
      comment: 'Flow execution failed due to an unhandled error or explicit failure.',
      errorPath: '$.errorInfo.errorName',
      causePath: '$.errorInfo.errorMessage',
    });

    const normalizeErrorState = new sfn.Pass(this, 'NormalizeErrorState', {
      comment: 'Transforms raw SFN error output into the standard errorInfo object for the Fail state.',
      parameters: {
          'errorInfo': {
              'errorName.$': '$.errorInfo.Error',
              'errorMessage.$': 'States.JsonToString($.errorInfo.Cause)'
          }
      }
    });
    normalizeErrorState.next(failureState);

    const prepareForMapPassState = new sfn.Pass(this, 'PrepareParallelMapInput', {
        parameters: {
            'mapContext': { 
                'runtimeState.$': '$.runtimeState',
                'aggregationConfig.$': '$.parallelForkInput.aggregationConfig',
                'originalStepInstanceId.$': '$.parallelForkInput.originalStepInstanceId',
            },
            'branchesToExecute.$': '$.parallelForkInput.branchesToExecute'
        },
        resultPath: '$', 
    });

    const parallelMapState = new sfn.Map(this, 'ExecuteBranchesInParallel', {
        itemsPath: sfn.JsonPath.stringAt('$.branchesToExecute'),
        maxConcurrencyPath: sfn.JsonPath.stringAt('$.mapContext.aggregationConfig.maxConcurrency'),
        resultPath: '$.mapResultsArray',
        parameters: {
            'mapContext.$': '$.mapContext',
            'branchItem.$': '$$.Map.Item.Value',
            'uniqueBranchExecutionId': sfn.JsonPath.format(
                '{}-{}-{}',
                sfn.JsonPath.stringAt('$.mapContext.runtimeState.flowExecutionId'),
                sfn.JsonPath.stringAt('$$.Map.Item.Value.branchId'), 
                sfn.JsonPath.uuid()
            )
        },
    });
    parallelMapState.itemProcessor(this.createBranchProcessorChain('InMemoryMap', branchStateMachine));

    const s3MapItemProcessorTask = new sfnTasks.LambdaInvoke(this, 'S3MapItemProcessorTask', {
        lambdaFunction: iterativeStepProcessorLambda,
        payloadResponseOnly: true,
        resultPath: sfn.JsonPath.DISCARD,
    });
    s3MapItemProcessorTask.addRetry(lambdaServiceErrorRetryPolicy);

    const parallelMapStateFromS3 = new sfn.DistributedMap(this, 'ExecuteBranchesFromS3', {
        resultPath: '$.mapResultsArray',
        itemReader: new sfn.S3JsonItemReader({
            bucket: props.executionTracesBucket,
            key: sfn.JsonPath.stringAt('$.s3ItemReader.key'),
        }),
        itemSelector: {
            'currentItem.$': '$$.Map.Item.Value',
            'mapContext.$': '$$.ExecutionContext.Input.mapContext',
        },
    });
    parallelMapStateFromS3.itemProcessor(s3MapItemProcessorTask);

    const prepareForAggregationPassState = new sfn.Pass(this, 'PrepareAggregationInput', {
      inputPath: '$',
      parameters: {
          'runtimeState.$': '$.mapContext.runtimeState',
          'sfnAction': SfnActionType.PARALLEL_AGGREGATE,
          'parallelAggregateInput': {
              'branchOutputs.$': '$.mapResultsArray',
              'aggregationConfig.$': '$.mapContext.aggregationConfig',
              'originalStepInstanceId.$': '$.mapContext.originalStepInstanceId',
          }
      },
      resultPath: '$',
    });

    const processAsyncResultAndContinue = new sfnTasks.LambdaInvoke(this, 'ProcessAsyncResultAndContinue', {
        lambdaFunction: iterativeStepProcessorLambda,
        payloadResponseOnly: true,
        resultPath: '$',
    });
    processAsyncResultAndContinue.addRetry(lambdaServiceErrorRetryPolicy);

    const checkFinalStatus = new sfn.Choice(this, 'CheckFinalStatus')
    .when(sfn.Condition.stringEquals('$.status', 'COMPLETED'), successState)
    .otherwise(failureState);

    finalizeTask.next(checkFinalStatus);

    const chooseNextSfnTaskType = new sfn.Choice(this, 'ChooseNextSfnTaskType')
    .when(sfn.Condition.stringEquals('$.sfnAction', SfnActionType.WAIT_FOR_EXTERNAL_EVENT), waitForEventTask)
    .when(sfn.Condition.stringEquals('$.sfnAction', SfnActionType.POLL_EXTERNAL_API), pollingSubFlowTask)
    .when(sfn.Condition.stringEquals('$.sfnAction', SfnActionType.PARALLEL_FORK), prepareForMapPassState)
    .when(sfn.Condition.stringEquals('$.sfnAction', SfnActionType.PARALLEL_FORK_S3), parallelMapStateFromS3)
    .otherwise(iterativeStepTask);

    const checkISPCompletionChoice = new sfn.Choice(this, 'CheckISPCompletionChoice')
      .when(sfn.Condition.isPresent('$.runtimeState.currentStepInstanceId'), chooseNextSfnTaskType)
      .otherwise(finalizeTask);

    initTask.next(chooseNextSfnTaskType);
    waitForEventTask.next(processAsyncResultAndContinue);
    pollingSubFlowTask.next(processAsyncResultAndContinue);

    prepareForMapPassState.next(parallelMapState);
    parallelMapState.next(prepareForAggregationPassState);
    parallelMapStateFromS3.next(prepareForAggregationPassState);
    prepareForAggregationPassState.next(iterativeStepTask);
    iterativeStepTask.next(checkISPCompletionChoice);
    processAsyncResultAndContinue.next(checkISPCompletionChoice); 

    const failureCatchConfig: sfn.CatchProps = {
      resultPath: '$.errorInfo',
    };
  
    initTask.addCatch(normalizeErrorState, failureCatchConfig);
    iterativeStepTask.addCatch(normalizeErrorState, failureCatchConfig);
    finalizeTask.addCatch(normalizeErrorState, failureCatchConfig);
    waitForEventTask.addCatch(normalizeErrorState, failureCatchConfig);
    pollingSubFlowTask.addCatch(normalizeErrorState, failureCatchConfig);
    processAsyncResultAndContinue.addCatch(normalizeErrorState, failureCatchConfig);
    parallelMapStateFromS3.addCatch(normalizeErrorState, failureCatchConfig);

    iterativeStepTask.addRetry({
        errors: [
            RETRYABLE_STEP_ERROR_NAME, 
            CONTENT_BASED_RETRYABLE_ERROR_NAME,
            'Lambda.TooManyRequestsException',
            'Lambda.ServiceException',
            'Lambda.Unknown',
        ],
        interval: cdk.Duration.seconds(10),
        maxAttempts: 3,
        backoffRate: 2.0,
    });
  
    const definition = initTask;

    const logGroup = new logs.LogGroup(this, 'AllmaStateMachineLogGroup', {
      logGroupName: `/aws/stepfunctions/AllmaFlowOrchestrator-${stageConfig.stage}`,
      removalPolicy: stageConfig.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays[Object.keys(logs.RetentionDays).find(k => logs.RetentionDays[k as keyof typeof logs.RetentionDays] === stageConfig.logging.retentionDays.sfn) as keyof typeof logs.RetentionDays] || logs.RetentionDays.ONE_WEEK,
    });

    this.flowOrchestratorStateMachine = new sfn.StateMachine(this, 'AllmaFlowOrchestrator', {
      stateMachineName: `AllmaFlowOrchestrator-${stageConfig.stage}`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      role: stateMachineRole,
      timeout: cdk.Duration.days(stageConfig.sfnTimeouts.mainOrchestratorDays),
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });
  }

  /**
   * Factory function to create a reusable but unique chain of states for processing a single branch.
   * This now includes a robust, multi-step catch block to gracefully handle branch failures and
   * return a structured error object.
   * @param idPrefix A unique prefix for the state IDs within this chain.
   * @param branchStateMachine The sub-state machine to execute.
   * @returns An IChainable object representing the processing chain with error handling.
   */
    private createBranchProcessorChain(idPrefix: string, branchStateMachine: sfn.IStateMachine): sfn.IChainable {
        const passStateToInjectInternal = new sfn.Pass(this, `${idPrefix}InjectInternalContext`, {
            inputPath: '$',
            resultPath: '$.branchItem.branchInput._internal', 
            parameters: {
                'currentStepStartTime.$': '$$.State.EnteredTime',
                'executionName.$': '$.uniqueBranchExecutionId',
            },
        });

        const executeBranch = new sfnTasks.StepFunctionsStartExecution(this, `${idPrefix}ExecuteBranch`, {
            stateMachine: branchStateMachine,
            integrationPattern: sfn.IntegrationPattern.RUN_JOB,
            input: sfn.TaskInput.fromObject({
                'sfnAction': SfnActionType.PROCESS_STEP,
                'runtimeState': {
                    'flowDefinitionId.$': '$.mapContext.runtimeState.flowDefinitionId',
                    'flowDefinitionVersion.$': '$.mapContext.runtimeState.flowDefinitionVersion',
                    'flowExecutionId.$': '$.mapContext.runtimeState.flowExecutionId',
                    'enableExecutionLogs.$': '$.branchItem.enableExecutionLogs',
                    'branchId.$': '$.branchItem.branchId',
                    'branchExecutionId.$': '$.uniqueBranchExecutionId',
                    'currentStepInstanceId.$': '$.branchItem.branchDefinition.stepInstanceId',
                    'status': 'RUNNING',
                    'startTime.$': '$$.State.EnteredTime',
                    'stepRetryAttempts': {},
                    'currentContextData.$': '$.branchItem.branchInput',
                    '_internal': {
                        'branchDefinition.$': '$.branchItem.branchDefinition',
                        'currentStepStartTime.$': '$$.State.EnteredTime',
                        'executionName.$': '$.uniqueBranchExecutionId',
                    }
                }
            }),

            // The `Output` from the sub-execution is already a JSON object.
            // We just need to select it directly, not parse it as a string.
            resultSelector: {
                'Output.$': '$.Output'
            },

            resultPath: '$.sfnSubExecutionResult',
        });

        const parseOutput = new sfn.Pass(this, `${idPrefix}ParseOutput`, {
            parameters: {
                'branchId.$': '$.branchItem.branchId',
                // After the ResultSelector, the data is in sfnSubExecutionResult.Output
                'output.$': '$.sfnSubExecutionResult.Output'
            },
        });

        // --- MULTI-STEP ERROR HANDLING CHAIN ---

        const formatStringCause = new sfn.Pass(this, `${idPrefix}FormatStringCause`, {
            comment: 'Handles non-JSON error causes (e.g., SFN timeouts) and formats a standard error object.',
            parameters: {
                'branchId.$': '$.branchItem.branchId',
                'error': {
                    'errorName.$': '$.errorInfo.Error',
                    'errorMessage.$': '$.errorInfo.Cause',
                    'isRetryable': false,
                }
            },
            resultPath: '$',
        });

        const parseJsonCause = new sfn.Pass(this, `${idPrefix}ParseJsonCause`, {
            comment: 'Parses the JSON string from the Cause field into an object.',
            parameters: {
                'parsedCause.$': 'States.StringToJson($.errorInfo.Cause)'
            },
            resultPath: '$.errorInfo',
        });

        const formatLogicalError = new sfn.Pass(this, `${idPrefix}FormatLogicalError`, {
            comment: 'Formats a standard error object from a parsed logical AllmaError.',
            parameters: {
                'branchId.$': '$.branchItem.branchId',
                'error': {
                    'errorName.$': '$.errorInfo.parsedCause.errorName',
                    'errorMessage.$': '$.errorInfo.parsedCause.errorMessage',
                    'errorDetails.$': '$.errorInfo.parsedCause.errorDetails',
                    'isRetryable': false,
                }
            },
            resultPath: '$',
        });

        const formatLambdaError = new sfn.Pass(this, `${idPrefix}FormatLambdaError`, {
            comment: 'Formats a standard error object from a parsed Lambda runtime error.',
            parameters: {
                'branchId.$': '$.branchItem.branchId',
                'error': {
                    'errorName.$': '$.errorInfo.parsedCause.errorType',
                    'errorMessage.$': '$.errorInfo.parsedCause.errorMessage',
                    'errorDetails': {
                        'stackTrace.$': '$.errorInfo.parsedCause.stackTrace'
                    },
                    'isRetryable': false,
                }
            },
            resultPath: '$',
        });
        
        const formatSfnDataLimitError = new sfn.Pass(this, `${idPrefix}FormatSfnDataLimitError`, {
            comment: 'Formats a standard error object for a nested SFN execution failure like DataLimitExceeded.',
            parameters: {
                'branchId.$': '$.branchItem.branchId',
                'error': {
                    'errorName.$': '$.errorInfo.parsedCause.error',
                    'errorMessage.$': '$.errorInfo.parsedCause.cause',
                    'isRetryable': false,
                }
            },
            resultPath: '$',
        });

        const checkJsonCauseType = new sfn.Choice(this, `${idPrefix}CheckJsonCauseType`)
            .when(sfn.Condition.isPresent('$.errorInfo.parsedCause.errorName'), formatLogicalError)
            .when(sfn.Condition.isPresent('$.errorInfo.parsedCause.errorType'), formatLambdaError)
            .when(sfn.Condition.isPresent('$.errorInfo.parsedCause.error'), formatSfnDataLimitError) // For nested SFN errors
            .otherwise(formatStringCause); // Fallback if parsed JSON has an unknown structure

        const handleBranchErrorChoice = new sfn.Choice(this, `${idPrefix}IsCauseJsonChoice`)
            .when(sfn.Condition.stringMatches('$.errorInfo.Cause', '{*'), parseJsonCause.next(checkJsonCauseType))
            .otherwise(formatStringCause);

        // Main success path
        executeBranch.next(parseOutput);

        // Attach the catch handler to the Step Functions execution task.
        executeBranch.addCatch(handleBranchErrorChoice, {
            resultPath: '$.errorInfo'
        });

        return passStateToInjectInternal.next(executeBranch);
    }
}