import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import *as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import { RETRYABLE_STEP_ERROR_NAME, CONTENT_BASED_RETRYABLE_ERROR_NAME, TRANSIENT_STEP_ERROR_NAME, SfnActionType } from '@allma/core-types';
import { StageConfig } from '../config/stack-config.js';

interface AllmaOrchestrationProps {
  stageConfig: StageConfig;
  initializeFlowLambda: lambda.IFunction;
  iterativeStepProcessorLambda: lambda.IFunction;
  finalizeFlowLambda: lambda.IFunction;
  pollingStateMachineArn: string;
  predictiveMainSfnArn: string;
  executionTracesBucket: s3.Bucket;
}

/**
 * Defines the main Step Functions state machine for flow orchestration.
 * This construct dynamically orchestrates the entire lifecycle of a flow execution,
 * acting recursively for nested loops/parallel execution branches.
 */
export class AllmaOrchestration extends Construct {
  public readonly flowOrchestratorStateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: AllmaOrchestrationProps) {
    super(scope, id);

    const { stageConfig, initializeFlowLambda, iterativeStepProcessorLambda, finalizeFlowLambda, pollingStateMachineArn, predictiveMainSfnArn, executionTracesBucket } = props;

    // Common retry policy for transient Lambda service errors like throttling (429).
    const lambdaServiceErrorRetryPolicy = {
      errors: [
        'Lambda.TooManyRequestsException',
        'Lambda.ServiceException',
        'Lambda.Unknown',
      ],
      interval: cdk.Duration.seconds(2),
      maxAttempts: 5,
      backoffRate: 3.0,
    };
    
    // A broader retry policy for Step Functions tasks that might also encounter SFN service throttling.
    const sfnTaskServiceErrorRetryPolicy = {
        errors: [
            'Lambda.TooManyRequestsException',
            'Lambda.ServiceException',
            'Lambda.Unknown',
            'States.ThrottlingException', // Throttling on the Step Functions service itself
            'StepFunctions.TooManyRequestsException',
        ],
        interval: cdk.Duration.seconds(2),
        maxAttempts: 5,
        backoffRate: 2.0,
    };

    const stateMachineRole = new iam.Role(this, 'AllmaStateMachineRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      description: `IAM Role for ALLMA Flow Orchestrator State Machine (${stageConfig.stage})`,
    });

    initializeFlowLambda.grantInvoke(stateMachineRole);
    iterativeStepProcessorLambda.grantInvoke(stateMachineRole);
    finalizeFlowLambda.grantInvoke(stateMachineRole);
    
    stateMachineRole.addToPolicy(new iam.PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [pollingStateMachineArn, predictiveMainSfnArn],
    }));

    executionTracesBucket.grantRead(stateMachineRole);

    const selfRefStateMachine = sfn.StateMachine.fromStateMachineArn(this, 'SelfRefStateMachine', predictiveMainSfnArn);

    // --- Define State Machine Tasks ---
    const initTask = new sfnTasks.LambdaInvoke(this, 'InitializeFlowExecutionTask', {
      lambdaFunction: initializeFlowLambda,
      comment: 'Initialize flow state and load flow definition.',
      payloadResponseOnly: true,
      resultPath: '$',
    });
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
    pollingSubFlowTask.addRetry(sfnTaskServiceErrorRetryPolicy);

    // Synchronous sub-flow execution task
    const startSyncFlowExecutionTask = new sfnTasks.StepFunctionsStartExecution(this, 'StartSyncFlowExecutionTask', {
        stateMachine: selfRefStateMachine,
        integrationPattern: sfn.IntegrationPattern.RUN_JOB, // .sync execution
        input: sfn.TaskInput.fromJsonPathAt('$.syncFlowExecutionInput'),
        resultPath: '$.syncFlowResult',
        resultSelector: {
            // The 'Output' from a sync execution is a stringified JSON.
            // We select it to be processed by the next step.
            'Output.$': '$.Output',
        },
    });
    startSyncFlowExecutionTask.addRetry(sfnTaskServiceErrorRetryPolicy);

    const finalizeTask = new sfnTasks.LambdaInvoke(this, 'FinalizeFlowExecutionTask', {
      lambdaFunction: finalizeFlowLambda,
      comment: 'Finalize flow execution and log results.',
      payloadResponseOnly: true,
      resultPath: '$',
    });
    finalizeTask.addRetry(lambdaServiceErrorRetryPolicy);

    const successState = new sfn.Succeed(this, 'FlowSucceeded');

    const failureState = new sfn.Fail(this, 'FlowFailed', {
      comment: 'Flow execution failed due to an unhandled error or explicit failure.',
      errorPath: '$.errorInfo.errorName',
      causePath: '$.errorInfo.errorMessage',
    });

    // --- ENHANCED MAIN ERROR NORMALIZATION LOGIC ---
    // Safely unwrap JSON causes instead of naively double-stringifying them.

    const normalizeStringErrorState = new sfn.Pass(this, 'NormalizeStringErrorState', {
      parameters: {
          'errorInfo': {
              'errorName.$': '$.errorInfo.Error',
              'errorMessage.$': '$.errorInfo.Cause'
          }
      }
    });

    const parseMainErrorCause = new sfn.Pass(this, 'ParseMainErrorCause', {
        parameters: {
            'parsedCause.$': 'States.StringToJson($.errorInfo.Cause)'
        },
        resultPath: '$.errorInfo',
    });

    const formatMainLogicalError = new sfn.Pass(this, 'FormatMainLogicalError', {
        parameters: {
            'errorInfo': {
                'errorName.$': '$.errorInfo.parsedCause.errorName',
                'errorMessage.$': '$.errorInfo.parsedCause.errorMessage',
            }
        },
    });

    const formatMainLambdaError = new sfn.Pass(this, 'FormatMainLambdaError', {
        parameters: {
            'errorInfo': {
                'errorName.$': '$.errorInfo.parsedCause.errorType',
                'errorMessage.$': '$.errorInfo.parsedCause.errorMessage',
            }
        },
    });

    const formatMainSfnDataLimitError = new sfn.Pass(this, 'FormatMainSfnDataLimitError', {
        parameters: {
            'errorInfo': {
                'errorName.$': '$.errorInfo.parsedCause.error',
                'errorMessage.$': '$.errorInfo.parsedCause.cause',
            }
        }
    });

    const formatMainSfnExecutionError = new sfn.Pass(this, 'FormatMainSfnExecutionError', {
        parameters: {
            'errorInfo': {
                'errorName.$': '$.errorInfo.parsedCause.Error',
                'errorMessage.$': '$.errorInfo.parsedCause.Cause',
            }
        },
    });

    const formatMainSfnExecutionErrorNoCause = new sfn.Pass(this, 'FormatMainSfnExecutionErrorNoCause', {
        parameters: {
            'errorInfo': {
                'errorName.$': '$.errorInfo.parsedCause.Error',
                'errorMessage': 'Sub-execution failed. No cause provided.',
            }
        },
    });

    const formatMainUnknownJsonError = new sfn.Pass(this, 'FormatMainUnknownJsonError', {
        parameters: {
            'errorInfo': {
                'errorName.$': '$.errorInfo.Error',
                'errorMessage.$': '$.errorInfo.Cause',
            }
        },
    });

    const checkMainJsonCauseType = new sfn.Choice(this, 'CheckMainJsonCauseType')
        .when(sfn.Condition.isPresent('$.errorInfo.parsedCause.errorName'), formatMainLogicalError)
        .when(sfn.Condition.isPresent('$.errorInfo.parsedCause.errorType'), formatMainLambdaError)
        .when(sfn.Condition.isPresent('$.errorInfo.parsedCause.error'), formatMainSfnDataLimitError)
        .when(sfn.Condition.and(
            sfn.Condition.isPresent('$.errorInfo.parsedCause.Error'),
            sfn.Condition.isPresent('$.errorInfo.parsedCause.Cause')
        ), formatMainSfnExecutionError)
        .when(sfn.Condition.isPresent('$.errorInfo.parsedCause.Error'), formatMainSfnExecutionErrorNoCause)
        .otherwise(formatMainUnknownJsonError);

    const normalizeErrorState = new sfn.Choice(this, 'NormalizeErrorState')
        .when(sfn.Condition.stringMatches('$.errorInfo.Cause', '{*'), parseMainErrorCause.next(checkMainJsonCauseType))
        .otherwise(normalizeStringErrorState);

    formatMainLogicalError.next(failureState);
    formatMainLambdaError.next(failureState);
    formatMainSfnDataLimitError.next(failureState);
    formatMainSfnExecutionError.next(failureState);
    formatMainSfnExecutionErrorNoCause.next(failureState);
    formatMainUnknownJsonError.next(failureState);
    normalizeStringErrorState.next(failureState);

    // --- END ENHANCED MAIN ERROR NORMALIZATION LOGIC ---


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
        },
    });
    parallelMapState.itemProcessor(this.createBranchProcessorChain('InMemoryMap', selfRefStateMachine, sfnTaskServiceErrorRetryPolicy));

    const s3MapProcessorChain = this.createBranchProcessorChain('S3Map', selfRefStateMachine, sfnTaskServiceErrorRetryPolicy);

    const parallelMapStateFromS3 = new sfn.DistributedMap(this, 'ExecuteBranchesFromS3', {
        resultPath: '$.mapResultsArray',
        itemReader: new sfn.S3JsonItemReader({
            bucket: props.executionTracesBucket,
            key: sfn.JsonPath.stringAt('$.s3ItemReader.key'),
        }),
        maxConcurrencyPath: sfn.JsonPath.stringAt('$.s3ItemReader.aggregationConfig.maxConcurrency'),
        itemSelector: {
            'mapContext': {
                'runtimeState.$': '$.runtimeState',
                'aggregationConfig.$': '$.s3ItemReader.aggregationConfig',
                'originalStepInstanceId.$': '$.s3ItemReader.originalStepInstanceId',
            },
            'branchItem.$': '$$.Map.Item.Value',
        },
    });
    parallelMapStateFromS3.itemProcessor(s3MapProcessorChain);
    
    const transformS3MapOutput = new sfn.Pass(this, 'TransformS3MapOutputToStandard', {
        parameters: {
            'mapContext': {
                'runtimeState.$': '$.runtimeState',
                'aggregationConfig.$': '$.s3ItemReader.aggregationConfig',
                'originalStepInstanceId.$': '$.s3ItemReader.originalStepInstanceId'
            },
            'mapResultsArray.$': '$.mapResultsArray'
        },
        resultPath: '$'
    });

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
    .when(sfn.Condition.stringEquals('$.sfnAction', SfnActionType.START_SYNC_FLOW_EXECUTION), startSyncFlowExecutionTask)
    .when(sfn.Condition.stringEquals('$.sfnAction', SfnActionType.PARALLEL_FORK), prepareForMapPassState)
    .when(sfn.Condition.stringEquals('$.sfnAction', SfnActionType.PARALLEL_FORK_S3), parallelMapStateFromS3)
    .otherwise(iterativeStepTask);

    const isBranchOrMainChoice = new sfn.Choice(this, 'IsBranchOrMainChoice');
    const checkBranchStatusChoice = new sfn.Choice(this, 'CheckBranchStatusChoice');
    const checkFinalOutputChoice = new sfn.Choice(this, 'CheckFinalOutputChoice');

    const extractSpecificOutput = new sfn.Pass(this, 'ExtractBranchOutput', {
      comment: 'Extracts the final result from $.runtimeState.currentContextData.output to be the sub-flow output.',
      outputPath: '$.runtimeState.currentContextData.output',
    });

    const extractS3ContextPointer = new sfn.Pass(this, 'ExtractS3ContextPointer', {
      comment: 'Extracts the S3 context pointer if the context was offloaded.',
      parameters: {
          '_branch_context_s3_pointer.$': '$.runtimeState.currentContextData._s3_context_pointer'
      },
    });

    const returnEmptyOutput = new sfn.Pass(this, 'ReturnEmptyOutput', {
        comment: 'Returns an empty object as the branch output since no specific "output" property was set.',
        result: sfn.Result.fromObject({}),
    });
    
    const formatLogicalFailureState = new sfn.Pass(this, 'FormatLogicalFailure', {
        parameters: {
            'Error.$': '$.runtimeState.errorInfo.errorName',
            'Cause.$': 'States.JsonToString($.runtimeState.errorInfo)',
        },
    });

    const branchSucceededState = new sfn.Succeed(this, 'BranchSucceeded');
    const branchLogicalFailedState = new sfn.Fail(this, 'BranchLogicalFailed', {
        errorPath: '$.Error',
        causePath: '$.Cause',
    });

    formatLogicalFailureState.next(branchLogicalFailedState);
    extractSpecificOutput.next(branchSucceededState);
    extractS3ContextPointer.next(branchSucceededState);
    returnEmptyOutput.next(branchSucceededState);

    checkFinalOutputChoice
        .when(sfn.Condition.isPresent('$.runtimeState.currentContextData._s3_context_pointer'), extractS3ContextPointer)
        .when(sfn.Condition.isPresent('$.runtimeState.currentContextData.output'), extractSpecificOutput)
        .otherwise(returnEmptyOutput);

    checkBranchStatusChoice
        .when(sfn.Condition.stringEquals('$.runtimeState.status', 'FAILED'), formatLogicalFailureState)
        .otherwise(checkFinalOutputChoice);

    isBranchOrMainChoice
        .when(sfn.Condition.isPresent('$.runtimeState.branchId'), checkBranchStatusChoice)
        .otherwise(finalizeTask);

    const checkISPCompletionChoice = new sfn.Choice(this, 'CheckISPCompletionChoice')
      .when(sfn.Condition.isPresent('$.runtimeState.currentStepInstanceId'), chooseNextSfnTaskType)
      .otherwise(isBranchOrMainChoice);

    const checkInitChoice = new sfn.Choice(this, 'IsInitializedChoice')
        .when(sfn.Condition.isPresent('$.runtimeState'), chooseNextSfnTaskType)
        .otherwise(initTask);

    initTask.next(chooseNextSfnTaskType);
    waitForEventTask.next(processAsyncResultAndContinue);
    pollingSubFlowTask.next(processAsyncResultAndContinue);
    startSyncFlowExecutionTask.next(processAsyncResultAndContinue);

    prepareForMapPassState.next(parallelMapState);
    parallelMapState.next(prepareForAggregationPassState);

    parallelMapStateFromS3.next(transformS3MapOutput);
    transformS3MapOutput.next(prepareForAggregationPassState);
    
    prepareForAggregationPassState.next(iterativeStepTask);
    iterativeStepTask.next(checkISPCompletionChoice);
    processAsyncResultAndContinue.next(checkISPCompletionChoice); 

    const failureCatchConfig: sfn.CatchProps = {
      resultPath: '$.errorInfo',
    };
  
    // Apply our robust Choice State catch router
    initTask.addCatch(normalizeErrorState, failureCatchConfig);
    iterativeStepTask.addCatch(normalizeErrorState, failureCatchConfig);
    finalizeTask.addCatch(normalizeErrorState, failureCatchConfig);
    waitForEventTask.addCatch(normalizeErrorState, failureCatchConfig);
    pollingSubFlowTask.addCatch(normalizeErrorState, failureCatchConfig);
    startSyncFlowExecutionTask.addCatch(normalizeErrorState, failureCatchConfig);
    processAsyncResultAndContinue.addCatch(normalizeErrorState, failureCatchConfig);
    parallelMapStateFromS3.addCatch(normalizeErrorState, failureCatchConfig);

    iterativeStepTask.addRetry(lambdaServiceErrorRetryPolicy);
    iterativeStepTask.addRetry({
        errors: [
            RETRYABLE_STEP_ERROR_NAME, 
            CONTENT_BASED_RETRYABLE_ERROR_NAME,
            TRANSIENT_STEP_ERROR_NAME
        ],
        interval: cdk.Duration.seconds(10),
        maxAttempts: 3,
        backoffRate: 2.0,
    });
  
    const definition = checkInitChoice;

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

  private createBranchProcessorChain(
    idPrefix: string, 
    selfRefStateMachine: sfn.IStateMachine, 
    retryPolicy: cdk.aws_stepfunctions.RetryProps
    ): sfn.IChainable {
        const prepareBranchInput = new sfn.Pass(this, `${idPrefix}PrepareBranchInput`, {
            parameters: {
                'mapContext.$': '$.mapContext',
                'branchItem.$': '$.branchItem',
                'uniqueBranchExecutionId': sfn.JsonPath.format(
                    '{}-{}-{}',
                    sfn.JsonPath.stringAt('$.mapContext.runtimeState.flowExecutionId'),
                    sfn.JsonPath.stringAt('$.branchItem.branchId'),
                    sfn.JsonPath.uuid()
                ),
                'mergedContextData.$': 'States.JsonMerge($.mapContext.runtimeState.currentContextData, $.branchItem.branchInput, false)',
            },
        });

        const executeBranch = new sfnTasks.StepFunctionsStartExecution(this, `${idPrefix}ExecuteBranch`, {
            stateMachine: selfRefStateMachine,
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
                    'currentContextData.$': '$.mergedContextData',
                    '_internal': {
                        'branchDefinition.$': '$.branchItem.branchDefinition',
                        'currentStepStartTime.$': '$$.State.EnteredTime',
                        'executionName.$': '$.uniqueBranchExecutionId',
                    }
                }
            }),

            resultSelector: { 'Output.$': '$.Output' },
            resultPath: '$.sfnSubExecutionResult',
        });
        executeBranch.addRetry(retryPolicy);

        const parseOutput = new sfn.Pass(this, `${idPrefix}ParseOutput`, {
            parameters: {
                'branchId.$': '$.branchItem.branchId',
                'output.$': '$.sfnSubExecutionResult.Output'
            },
        });

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

        const formatSfnExecutionError = new sfn.Pass(this, `${idPrefix}FormatSfnExecutionError`, {
            comment: 'Formats a standard error object from a parsed SFN sub-execution error.',
            parameters: {
                'branchId.$': '$.branchItem.branchId',
                'error': {
                    'errorName.$': '$.errorInfo.parsedCause.Error',
                    'errorMessage.$': '$.errorInfo.parsedCause.Cause',
                    'isRetryable': false,
                }
            },
            resultPath: '$',
        });

        const formatSfnExecutionErrorNoCause = new sfn.Pass(this, `${idPrefix}FormatSfnExecutionErrorNoCause`, {
            comment: 'Formats a standard error object from a parsed SFN sub-execution error without a cause.',
            parameters: {
                'branchId.$': '$.branchItem.branchId',
                'error': {
                    'errorName.$': '$.errorInfo.parsedCause.Error',
                    'errorMessage': 'Sub-execution failed. No cause provided.',
                    'isRetryable': false,
                }
            },
            resultPath: '$',
        });

        const formatUnknownJsonCause = new sfn.Pass(this, `${idPrefix}FormatUnknownJsonCause`, {
            comment: 'Formats a standard error object for an unrecognized JSON Cause.',
            parameters: {
                'branchId.$': '$.branchItem.branchId',
                'error': {
                    'errorName': 'UnknownSubflowError',
                    'errorMessage.$': 'States.JsonToString($.errorInfo.parsedCause)', // Stringify the unrecognized JSON
                    'isRetryable': false,
                }
            },
            resultPath: '$',
        });

        const checkJsonCauseType = new sfn.Choice(this, `${idPrefix}CheckJsonCauseType`)
            .when(sfn.Condition.isPresent('$.errorInfo.parsedCause.errorName'), formatLogicalError)
            .when(sfn.Condition.isPresent('$.errorInfo.parsedCause.errorType'), formatLambdaError)
            .when(sfn.Condition.isPresent('$.errorInfo.parsedCause.error'), formatSfnDataLimitError)
            .when(sfn.Condition.and(
                sfn.Condition.isPresent('$.errorInfo.parsedCause.Error'),
                sfn.Condition.isPresent('$.errorInfo.parsedCause.Cause')
            ), formatSfnExecutionError)
            .when(sfn.Condition.isPresent('$.errorInfo.parsedCause.Error'), formatSfnExecutionErrorNoCause)
            .otherwise(formatUnknownJsonCause);

        const handleBranchErrorChoice = new sfn.Choice(this, `${idPrefix}IsCauseJsonChoice`)
            .when(sfn.Condition.stringMatches('$.errorInfo.Cause', '{*'), parseJsonCause.next(checkJsonCauseType))
            .otherwise(formatStringCause);

        prepareBranchInput.next(executeBranch);
        executeBranch.next(parseOutput);

        executeBranch.addCatch(handleBranchErrorChoice, {
            resultPath: '$.errorInfo'
        });

        return prepareBranchInput;
    }
}