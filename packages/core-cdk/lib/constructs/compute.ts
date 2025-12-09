import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ENV_VAR_NAMES } from '@allma/core-types';
import { LambdaArchitectureType, StageConfig } from '../config/stack-config.js';

const __filename_compute = fileURLToPath(import.meta.url);
const __dirname_compute = dirname(__filename_compute);

interface AllmaComputeProps {
  stageConfig: StageConfig;
  configTable: dynamodb.Table;
  flowExecutionLogTable: dynamodb.Table;
  executionTracesBucket: s3.IBucket;
  flowContinuationStateTable: dynamodb.Table;
  flowStartRequestQueue?: sqs.IQueue;
  emailToFlowMappingTable?: dynamodb.Table;
  allmaFlowOutputTopic: sns.ITopic;
  flowOrchestratorStateMachineArn: string;
  eventBridgeSchedulerRoleArn: string;
}

/**
 * Defines the core compute resources (Lambda functions and IAM roles)
 * for the Allma flow orchestration engine.
 */
export class AllmaCompute extends Construct {
  public readonly initializeFlowLambda: lambdaNodejs.NodejsFunction;
  public readonly iterativeStepProcessorLambda: lambdaNodejs.NodejsFunction;
  public readonly finalizeFlowLambda: lambdaNodejs.NodejsFunction;
  public readonly resumeFlowLambda: lambdaNodejs.NodejsFunction;
  public readonly apiPollingLambda: lambdaNodejs.NodejsFunction;
  public readonly flowStartRequestListenerLambda?: lambdaNodejs.NodejsFunction;
  public readonly flowTriggerApiLambda: lambdaNodejs.NodejsFunction;
  public readonly executionLoggerLambda: lambdaNodejs.NodejsFunction;
  public readonly orchestrationLambdaRole: iam.Role;
  public readonly configImporterLambda: lambdaNodejs.NodejsFunction;
  private readonly stageConfig: StageConfig;


  constructor(scope: Construct, id: string, props: AllmaComputeProps) {
    super(scope, id);
    this.stageConfig = props.stageConfig;

    const {
      stageConfig,
      configTable,
      flowExecutionLogTable,
      executionTracesBucket,
      flowContinuationStateTable,
      flowOrchestratorStateMachineArn,
      flowStartRequestQueue,
      allmaFlowOutputTopic,
      eventBridgeSchedulerRoleArn,
    } = props;

    const defaultLambdaTimeout = cdk.Duration.seconds(stageConfig.lambdaTimeouts.defaultSeconds);
    const defaultLambdaMemory = stageConfig.lambdaMemorySizes.default;

    const commonEnvVars = {
      [ENV_VAR_NAMES.STAGE_NAME]: stageConfig.stage,
      [ENV_VAR_NAMES.LOG_LEVEL]: stageConfig.logging.logLevel,
      [ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME]: configTable.tableName,
      [ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]: flowExecutionLogTable.tableName,
      [ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME]: executionTracesBucket.bucketName,
      [ENV_VAR_NAMES.ALLMA_CONTINUATION_TABLE_NAME!]: flowContinuationStateTable.tableName,
      [ENV_VAR_NAMES.ALLMA_STATE_MACHINE_ARN]: flowOrchestratorStateMachineArn,
      [ENV_VAR_NAMES.ALLMA_FLOW_OUTPUT_TOPIC_ARN!]: allmaFlowOutputTopic.topicArn,
      [ENV_VAR_NAMES.MAX_CONTEXT_DATA_SIZE_BYTES!]: String(stageConfig.limits.maxContextDataSizeBytes),
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    };

    // --- IAM Role for Core Orchestration Lambdas ---
    this.orchestrationLambdaRole = new iam.Role(this, 'AllmaOrchestrationLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `IAM Role for ALLMA Core Orchestration Lambdas (${stageConfig.stage})`,
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });

    if (stageConfig.aiApiKeySecretArn) {
      this.orchestrationLambdaRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [stageConfig.aiApiKeySecretArn],
      }));
    }

    this.orchestrationLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [`arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:*`],
      conditions: {
        StringEquals: { 'secretsmanager:ResourceTag/allma-mcp-secret': 'true' },
      },
    }));

    if (stageConfig.ses?.fromEmailAddress) {
        this.orchestrationLambdaRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ses:SendEmail',
                'ses:SendRawEmail'
            ],
            resources: [
                `arn:aws:ses:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:identity/*`,
                `arn:aws:ses:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:configuration-set/*`
            ],
        }));
    }

    configTable.grantReadData(this.orchestrationLambdaRole);
    executionTracesBucket.grantReadWrite(this.orchestrationLambdaRole);
    flowContinuationStateTable.grantReadWriteData(this.orchestrationLambdaRole);
    allmaFlowOutputTopic.grantPublish(this.orchestrationLambdaRole);
    if (flowStartRequestQueue) {
      flowStartRequestQueue.grantSendMessages(this.orchestrationLambdaRole);
    }
    this.orchestrationLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes', 'sqs:SendMessage'],
      resources: [`arn:aws:sqs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
    }));
    this.orchestrationLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
      resources: ['*'],
    }));
    this.orchestrationLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan', 'dynamodb:UpdateItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem'],
      resources: ['arn:aws:dynamodb:*:*:table/*'],
    }));
    this.orchestrationLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [
        cdk.Stack.of(this).formatArn({
          service: 'lambda',
          resource: 'function',
          resourceName: '*',
          arnFormat: cdk.ArnFormat.COLON_RESOURCE_NAME,
        }),
      ],
    }));

    // --- InitializeFlowExecutionLambda ---
    this.initializeFlowLambda = this.createNodejsLambda('InitializeFlowLambda', `AllmaInitializeFlow-${stageConfig.stage}`, 'allma-flows/initialize-flow.js', this.orchestrationLambdaRole, defaultLambdaTimeout, defaultLambdaMemory, commonEnvVars);

    // --- IterativeStepProcessorLambda ---
    const iterativeStepProcessorMemory = stageConfig.lambdaMemorySizes.iterativeStepProcessor;
    const iterativeStepProcessorTimeout = cdk.Duration.minutes(stageConfig.lambdaTimeouts.iterativeStepProcessorMinutes);
    
    this.iterativeStepProcessorLambda = this.createNodejsLambda(
        'IterativeStepProcessorLambda', 
        `AllmaIterativeStepProcessor-${stageConfig.stage}`, 
        'allma-flows/iterative-step-processor/index.js', 
        this.orchestrationLambdaRole, 
        iterativeStepProcessorTimeout, 
        iterativeStepProcessorMemory, 
        {
            ...commonEnvVars,
            [ENV_VAR_NAMES.AI_API_KEY_SECRET_ARN!]: stageConfig.aiApiKeySecretArn || '',
            [ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_URL!]: props.flowStartRequestQueue?.queueUrl || '',
            [ENV_VAR_NAMES.MAX_CONCURRENT_STEP_EXECUTIONS]: stageConfig.orchestratorConcurrency ? String(stageConfig.orchestratorConcurrency) : '',
        },
        undefined,
        undefined,
        stageConfig.orchestratorConcurrency 
    );

    // --- FinalizeFlowExecutionLambda ---
    this.finalizeFlowLambda = this.createNodejsLambda('FinalizeFlowLambda', `AllmaFinalizeFlow-${stageConfig.stage}`, 'allma-flows/finalize-flow.js', this.orchestrationLambdaRole, defaultLambdaTimeout, defaultLambdaMemory, commonEnvVars);

    // --- ResumeFlowLambda ---
    const resumeFlowLambdaRole = new iam.Role(this, 'AllmaResumeFlowLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });
    flowContinuationStateTable.grantReadWriteData(resumeFlowLambdaRole);
    resumeFlowLambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
      resources: ['*'],
    }));
    this.resumeFlowLambda = this.createNodejsLambda('ResumeFlowLambda', `AllmaResumeFlow-${stageConfig.stage}`, 'allma-flows/resume-flow.js', resumeFlowLambdaRole, defaultLambdaTimeout, defaultLambdaMemory, commonEnvVars);

    // --- Execution Logger ---
    const executionLoggerRole = new iam.Role(this, 'ExecutionLoggerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `IAM Role for ALLMA Execution Logger Lambda (${stageConfig.stage})`,
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });
    props.flowExecutionLogTable.grantReadWriteData(executionLoggerRole);
    this.executionLoggerLambda = this.createNodejsLambda('ExecutionLoggerLambda', `AllmaExecutionLogger-${stageConfig.stage}`, 'allma-core/execution-logger.js', executionLoggerRole, cdk.Duration.seconds(15), 128, {
      ...commonEnvVars,
      [ENV_VAR_NAMES.LOG_RETENTION_DAYS]: String(stageConfig.logging.retentionDays.executionLogs),
    });
    this.executionLoggerLambda.grantInvoke(this.orchestrationLambdaRole);

    // --- ApiPollingLambda ---
    const apiPollingLambdaRole = new iam.Role(this, 'ApiPollingLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });
    this.apiPollingLambda = this.createNodejsLambda('ApiPollingLambda', `AllmaApiPolling-${stageConfig.stage}`, 'allma-flows/api-polling.js', apiPollingLambdaRole, cdk.Duration.seconds(30), defaultLambdaMemory, commonEnvVars);

    // --- FlowStartRequestListenerLambda ---
    if (flowStartRequestQueue) {
      const flowStartListenerRole = new iam.Role(this, 'FlowStartListenerRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
      });
      flowStartRequestQueue.grantConsumeMessages(flowStartListenerRole);
      flowStartListenerRole.addToPolicy(new iam.PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [flowOrchestratorStateMachineArn],
      }));
      this.flowStartRequestListenerLambda = this.createNodejsLambda('FlowStartRequestListenerLambda', `AllmaFlowStartListener-${stageConfig.stage}`, 'allma-flows/flow-start-request-listener.js', flowStartListenerRole, cdk.Duration.seconds(30), stageConfig.lambdaMemorySizes.flowStartRequestListener, {
        [ENV_VAR_NAMES.STAGE_NAME]: stageConfig.stage,
        [ENV_VAR_NAMES.LOG_LEVEL]: stageConfig.logging.logLevel,
        [ENV_VAR_NAMES.ALLMA_STATE_MACHINE_ARN]: flowOrchestratorStateMachineArn,
        [ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_URL]: flowStartRequestQueue.queueUrl,
      });
    }
    
    // --- FlowTriggerApiLambda ---
    const flowTriggerApiLambdaRole = new iam.Role(this, 'AllmaFlowTriggerApiLambdaRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });
    if (props.flowStartRequestQueue) {
        props.flowStartRequestQueue.grantSendMessages(flowTriggerApiLambdaRole);
    }
    this.flowTriggerApiLambda = this.createNodejsLambda('FlowTriggerApiLambda', `AllmaFlowTriggerApi-${stageConfig.stage}`, 'allma-admin/flow-trigger.js', flowTriggerApiLambdaRole, defaultLambdaTimeout, defaultLambdaMemory, {
      ...commonEnvVars,
      [ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_URL!]: props.flowStartRequestQueue?.queueUrl || '',
    });

    const loggerArn = this.executionLoggerLambda.functionArn;
    const lambdasToUpdate = [this.initializeFlowLambda, this.finalizeFlowLambda, this.iterativeStepProcessorLambda];
    for (const lambdaFunc of lambdasToUpdate) {
        lambdaFunc.addEnvironment('EXECUTION_LOGGER_LAMBDA_ARN', loggerArn);
    }

    this.orchestrationLambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['states:StartExecution', 'states:DescribeExecution', 'states:StopExecution'],
      resources: [
        flowOrchestratorStateMachineArn,
        `arn:aws:states:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:execution:${cdk.Fn.select(6, cdk.Fn.split(':', flowOrchestratorStateMachineArn))}:*`,
      ],
    }));

    this.orchestrationLambdaRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [`arn:aws:bedrock:${cdk.Aws.REGION}::foundation-model/*`],
    }));

    this.orchestrationLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [`arn:aws:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:AllmaIngestion-*`],
    }));

    // --- Config Importer Lambda ---
    const configImporterLambdaRole = new iam.Role(this, 'ConfigImporterLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `IAM Role for CDK Config Importer Lambda (${stageConfig.stage})`,
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });
    configTable.grantReadWriteData(configImporterLambdaRole);
    executionTracesBucket.grantRead(configImporterLambdaRole); // For S3 assets
    // Grant DynamoDB permissions for email mapping (as FlowService uses it)
    props.emailToFlowMappingTable?.grantReadWriteData(configImporterLambdaRole);

    // Grant EventBridge Scheduler permissions
    configImporterLambdaRole.addToPolicy(new iam.PolicyStatement({
        actions: ['scheduler:CreateSchedule', 'scheduler:UpdateSchedule', 'scheduler:DeleteSchedule', 'scheduler:GetSchedule'],
        resources: [`arn:aws:scheduler:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:schedule/default/*`],
    }));
    configImporterLambdaRole.addToPolicy(new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [eventBridgeSchedulerRoleArn],
    }));

    this.configImporterLambda = this.createNodejsLambda('ConfigImporterLambda', `AllmaConfigImporter-${stageConfig.stage}`, 'allma-cdk/config-importer.js', configImporterLambdaRole, cdk.Duration.minutes(5), 256, {
      [ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME]: configTable.tableName,
      // Pass these env vars as the importer uses FlowDefinitionService which needs them
      [ENV_VAR_NAMES.EMAIL_TO_FLOW_MAPPING_TABLE_NAME]: props.emailToFlowMappingTable?.tableName || '',
      [ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_ARN]: props.flowStartRequestQueue?.queueArn || '',
      [ENV_VAR_NAMES.EVENTBRIDGE_SCHEDULER_ROLE_ARN]: eventBridgeSchedulerRoleArn,
    });
  }

  private createNodejsLambda(
    id: string, functionName: string, entry: string, role: iam.IRole,
    timeout: cdk.Duration, memorySize: number, environment: { [key: string]: string },
    bundlingOptions?: lambdaNodejs.BundlingOptions, layers?: lambda.ILayerVersion[],
    reservedConcurrentExecutions?: number, 
  ): lambdaNodejs.NodejsFunction {
    const architecture =
      this.stageConfig.lambdaArchitecture === LambdaArchitectureType.ARM_64
        ? lambda.Architecture.ARM_64
        : lambda.Architecture.X86_64;

    return new lambdaNodejs.NodejsFunction(this, id, {
      functionName,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname_compute, `../../../dist-logic/${entry}`),
      role,
      timeout,
      memorySize,
      environment,
      ...(reservedConcurrentExecutions !== undefined && { reservedConcurrentExecutions }),
      ...(layers && { layers }),
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk', '@aws-sdk/*', '@smithy/*'],
        forceDockerBundling: false,
        ...bundlingOptions,
      },
      architecture: architecture,
    });
  }
}