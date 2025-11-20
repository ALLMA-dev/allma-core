import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import { Construct } from 'constructs';
import { ALLMA_ADMIN_API_ROUTES, ENV_VAR_NAMES } from '@allma/core-types';
import { defaultConfig } from './config/default-config.js';
import { WebAppDeployment } from './constructs/web-app-deployment.js';
import { AllmaDataStores } from './constructs/data-stores.js';
import { AllmaCompute } from './constructs/compute.js';
import { AllmaOrchestration } from './constructs/orchestration.js';
import { ApiConstruct } from './constructs/api.construct.js';
import { PollingOrchestrator } from './constructs/polling-orchestrator.js';
import { BranchOrchestrator } from './constructs/branch-orchestrator.js';
import { EmailIntegration } from './constructs/email-integration.js';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { DeepPartial, StageConfig, WebAppConfig } from './config/stack-config.js';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import * as customResources from 'aws-cdk-lib/custom-resources';

export * from './config/stack-config.js';

// A simple deep merge function for configs
function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      const targetValue = target[key as keyof T];
      const sourceValue = source[key as keyof typeof source];
      if (isObject(targetValue) && isObject(sourceValue)) {
        output[key as keyof T] = deepMerge(targetValue, sourceValue as DeepPartial<typeof targetValue>);
      } else {
        output[key as keyof T] = sourceValue as T[keyof T];
      }
    });
  }
  return output;
}

function isObject(item: any): item is Record<string, any> {
  return (item && typeof item === 'object' && !Array.isArray(item));
}


/**
 * Properties required to initialize the AllmaStack.
 */
export interface AllmaStackProps extends cdk.StackProps {
  /**
   * User-provided configuration for the Allma instance.
   * This will be merged with the default configuration.
   * At a minimum, `awsAccountId` and `aiApiKeySecretArn` must be provided.
   */
  stageConfig: DeepPartial<StageConfig>;

  /**
   * Optional configuration for deploying the Admin Shell web application.
   * If provided, the Admin Shell will be deployed to S3/CloudFront.
   */
  adminShell?: WebAppConfig;

}

/**
 * The primary CDK construct for deploying the Allma platform.
 * This stack encapsulates all the necessary AWS resources.
 *
 * @example
 * ```typescript
 * import * as cdk from 'aws-cdk-lib';
 * import { AllmaStack } from '@allma/core-cdk';
 * import { myAppConfig } from './config'; // User-defined configuration
 *
 * const app = new cdk.App();
 * new AllmaStack(app, 'MyAllmaDeployment', {
 *   env: {
 *     account: myAppConfig.awsAccountId,
 *     region: myAppConfig.awsRegion,
 *   },
 *   stageConfig: myAppConfig,
 * });
 * ```
 */
export class AllmaStack extends cdk.Stack {
  public readonly flowStartRequestQueue: sqs.IQueue; // Expose the queue object
  public readonly allmaFlowOutputTopic: sns.ITopic; // Expose the SNS topic
  public readonly adminUserPool: cdk.aws_cognito.IUserPool; // Expose the User Pool object
  public readonly adminUserPoolClient: cdk.aws_cognito.IUserPoolClient; // Expose the client
  public readonly orchestrationLambdaRole: iam.IRole;


  constructor(scope: Construct, id: string, props: AllmaStackProps) {
    super(scope, id, props);

    // Merge user-provided config with defaults
    const stageConfig = deepMerge(defaultConfig, props.stageConfig) as StageConfig;

    // Validation for required fields
    if (stageConfig.awsAccountId === 'YOUR_ACCOUNT_ID') {
      throw new Error('The `awsAccountId` must be overridden in your stageConfig.');
    }
    if (stageConfig.aiApiKeySecretArn === 'YOUR_AI_API_KEY_SECRET_ARN') {
      throw new Error('The `aiApiKeySecretArn` must be overridden in your stageConfig.');
    }

    const stackPrefix = `AllmaPlatform-${stageConfig.stage}`;

    // --- Data Stores ---
    const dataStores = new AllmaDataStores(this, 'AllmaDataStores', {
      stageConfig,
    });

    // --- SQS Flow Start Request Queue ---
    const flowStartRequestDLQ = new sqs.Queue(this, 'AllmaFlowStartRequestDLQ', {
      queueName: `AllmaFlowStartRequestDLQ-${stageConfig.stage}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    const flowStartRequestQueue = new sqs.Queue(this, 'AllmaFlowStartRequestQueue', {
      queueName: `AllmaFlowStartRequestQueue-${stageConfig.stage}`,
      visibilityTimeout: cdk.Duration.seconds(stageConfig.sqsSettings.flowStartRequestQueue.visibilityTimeoutSeconds),
      receiveMessageWaitTime: cdk.Duration.seconds(stageConfig.sqsSettings.flowStartRequestQueue.receiveMessageWaitTimeSeconds),
      deadLetterQueue: {
        maxReceiveCount: 5,
        queue: flowStartRequestDLQ,
      },
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });
    new cdk.CfnOutput(this, 'AllmaFlowStartRequestQueueArnOutput', {
      value: flowStartRequestQueue.queueArn,
      description: 'ARN of the ALLMA Flow Start Request SQS Queue',
      exportName: `${stackPrefix}-FlowStartRequestQueueArn`,
    });
    new cdk.CfnOutput(this, 'AllmaFlowStartRequestQueueUrlOutput', {
      value: flowStartRequestQueue.queueUrl,
      description: 'URL of the ALLMA Flow Start Request SQS Queue',
      exportName: `${stackPrefix}-FlowStartRequestQueueUrl`
    });
    this.flowStartRequestQueue = flowStartRequestQueue;

    // --- SNS Topic for Flow Outputs ---
    const flowOutputTopic = new sns.Topic(this, 'AllmaFlowOutputTopic', {
      topicName: `AllmaFlowOutputTopic-${stageConfig.stage}`,
      displayName: `ALLMA Flow Outputs (${stageConfig.stage})`,
    });
    this.allmaFlowOutputTopic = flowOutputTopic;
    new cdk.CfnOutput(this, 'AllmaFlowOutputTopicArnExport', {
      value: flowOutputTopic.topicArn,
      description: 'ARN of the ALLMA Flow Output SNS Topic for client subscriptions',
      exportName: `${stackPrefix}-FlowOutputTopicArn`,
    });


    // --- Predictive ARNs to break circular dependencies ---
    const predictiveMainSfnArn = `arn:aws:states:${this.region}:${this.account}:stateMachine:AllmaFlowOrchestrator-${stageConfig.stage}`;


    // --- Core Orchestration Compute (Lambdas & Roles) ---
    const compute = new AllmaCompute(this, 'AllmaCompute', {
      stageConfig,
      configTable: dataStores.allmaConfigTable,
      flowExecutionLogTable: dataStores.allmaFlowExecutionLogTable,
      executionTracesBucket: dataStores.allmaExecutionTracesBucket,
      flowContinuationStateTable: dataStores.allmaFlowContinuationStateTable,
      flowStartRequestQueue: flowStartRequestQueue,
      allmaFlowOutputTopic: flowOutputTopic,
      flowOrchestratorStateMachineArn: predictiveMainSfnArn,
    });

    this.orchestrationLambdaRole = compute.orchestrationLambdaRole;

    // --- Sub-State Machines (Orchestration Helpers) ---
    const pollingOrchestrator = new PollingOrchestrator(this, 'AllmaPollingOrchestrator', {
      stageConfig,
      apiPollingLambda: compute.apiPollingLambda,
    });
    const branchOrchestrator = new BranchOrchestrator(this, 'AllmaBranchOrchestrator', {
      stageConfig,
      iterativeStepProcessorLambda: compute.iterativeStepProcessorLambda,
      orchestrationLambdaRole: compute.orchestrationLambdaRole,
    });


    // --- Main Orchestration (Step Function) ---
    const orchestration = new AllmaOrchestration(this, 'AllmaOrchestration', {
      stageConfig,
      initializeFlowLambda: compute.initializeFlowLambda,
      iterativeStepProcessorLambda: compute.iterativeStepProcessorLambda,
      finalizeFlowLambda: compute.finalizeFlowLambda,
      pollingStateMachineArn: pollingOrchestrator.pollingStateMachine.stateMachineArn,
      branchStateMachineArn: branchOrchestrator.branchStateMachine.stateMachineArn,
      executionTracesBucket: dataStores.allmaExecutionTracesBucket,
    });

    // Now that main SFN is created, perform actions that depend on it.
    if (compute.flowStartRequestListenerLambda) {
      compute.flowStartRequestListenerLambda.addEventSource(new SqsEventSource(flowStartRequestQueue, {
        batchSize: 5,
        maxBatchingWindow: cdk.Duration.seconds(0),
        reportBatchItemFailures: true,
        maxConcurrency: 50,
      }));
    }

    // --- IAM Role for EventBridge Scheduler ---
    const schedulerRole = new iam.Role(this, 'EventBridgeSchedulerSqsRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      description: 'Role for EventBridge Scheduler to send messages to SQS',
    });
    flowStartRequestQueue.grantSendMessages(schedulerRole);


    // --- Admin API Feature (API Gateway, Cognito, Lambdas) ---
    const api = new ApiConstruct(this, 'AllmaApiFeature', {
      eventBridgeSchedulerRoleArn: schedulerRole.roleArn,
      flowStartRequestQueueArn: flowStartRequestQueue.queueArn,
      stageConfig,
      configTable: dataStores.allmaConfigTable,
      flowExecutionLogTable: dataStores.allmaFlowExecutionLogTable,
      emailToFlowMappingTable: dataStores.emailToFlowMappingTable, // NEW
      executionTracesBucket: dataStores.allmaExecutionTracesBucket,
      iterativeStepProcessorLambda: compute.iterativeStepProcessorLambda,
      orchestrationLambdaRole: compute.orchestrationLambdaRole,
      resumeFlowLambda: compute.resumeFlowLambda,
      flowTriggerApiLambda: compute.flowTriggerApiLambda,
      flowOrchestratorStateMachine: orchestration.flowOrchestratorStateMachine,
    });
    this.adminUserPool = api.userPool;
    this.adminUserPoolClient = api.userPoolClient;

    // NEW: Email Integration (SES, S3, Lambda)
    if (stageConfig.ses?.verifiedDomain) {
        new EmailIntegration(this, 'AllmaEmailIntegration', {
            stageConfig,
            emailMappingTable: dataStores.emailToFlowMappingTable,
            flowStartQueue: this.flowStartRequestQueue,
            httpApi: api.httpApi,
        });
    }

    // The L2 HttpApi's `.url` property returns the execute-api URL, not the custom domain.
    // We must construct the URL conditionally to ensure correctness.
    const apiRootUrl = stageConfig.adminApi.domainName
        ? `https://${stageConfig.adminApi.domainName}`
        : api.httpApi.apiEndpoint;

    const fullApiBaseUrl = `${apiRootUrl}/${stageConfig.adminApi.apiMappingKey}`;
    const resumeApiUrl = `${fullApiBaseUrl}${ALLMA_ADMIN_API_ROUTES.RESUME}`;
    
    compute.finalizeFlowLambda.addEnvironment(ENV_VAR_NAMES.ALLMA_RESUME_API_URL, resumeApiUrl);

    // --- UI Deployments (Admin Shell & Docs) ---
    if (props.adminShell) {
      if (!fs.existsSync(props.adminShell.assetPath)) {
        throw new Error(`Admin Shell assetPath not found at ${props.adminShell.assetPath}. Please ensure the path is correct and the application has been built.`);
      }
      const adminShellDeployment = new WebAppDeployment(this, 'AdminShellDeployment', {
        deploymentId: 'AdminShell',
        ...props.adminShell,
        runtimeConfig: {
          VITE_ADMIN_STAGE_NAME: stageConfig.stage,
          VITE_AWS_REGION: this.region,
          VITE_COGNITO_USER_POOL_ID: api.userPool.userPoolId,
          VITE_COGNITO_USER_POOL_CLIENT_ID: api.userPoolClient.userPoolClientId,
          VITE_API_BASE_URL: apiRootUrl,
        },
      });

      // --- Explicit CORS Handling to Resolve Circular Dependency ---
      // We explicitly override the API Gateway CORS configuration here because the Admin Shell
      // URL (the origin) is only known after the WebAppDeployment construct is instantiated.
      // This breaks the circular dependency between API setup (needs origins) and UI setup (needs API URL).
      
      const adminShellCloudFrontUrl = `https://${adminShellDeployment.distribution.distributionDomainName}`;
      const allowedOrigins = [...stageConfig.adminApi.allowedOrigins, adminShellCloudFrontUrl];

      // Ensure the custom domain for the Admin Shell is also allowed if configured.
      if (props.adminShell.domainName) {
        allowedOrigins.push(`https://${props.adminShell.domainName}`);
      }
      
      const finalOrigins = Array.from(new Set(allowedOrigins));
      
      const cfnApi = api.httpApi.node.defaultChild as cdk.aws_apigatewayv2.CfnApi;
      cfnApi.addPropertyOverride('CorsConfiguration.AllowOrigins', finalOrigins);
    }

    // --- Core CloudFormation Outputs ---
    new cdk.CfnOutput(this, 'AllmaConfigTableNameOutput', {
      value: dataStores.allmaConfigTable.tableName,
      description: 'Name of the ALLMA Configuration DynamoDB Table',
      exportName: `${stackPrefix}-ConfigTableName`,
    });
    new cdk.CfnOutput(this, 'AllmaFlowExecutionLogTableNameOutput', {
      value: dataStores.allmaFlowExecutionLogTable.tableName,
      description: 'Name of the ALLMA Flow Execution Log DynamoDB Table',
    });
    new cdk.CfnOutput(this, 'AllmaExecutionTracesBucketNameOutput', {
      value: dataStores.allmaExecutionTracesBucket.bucketName,
      description: 'Name of the S3 Bucket for ALLMA Execution Traces',
    });
    new cdk.CfnOutput(this, 'AllmaFlowOrchestratorStateMachineArnOutput', {
      value: orchestration.flowOrchestratorStateMachine.stateMachineArn,
      description: 'ARN of the ALLMA Flow Orchestrator Step Functions State Machine',
    });
    new cdk.CfnOutput(this, 'AllmaPollingStateMachineArnOutput', {
      value: pollingOrchestrator.pollingStateMachine.stateMachineArn,
      description: 'ARN of the ALLMA API Polling Sub-State Machine',
    });
    new cdk.CfnOutput(this, 'AllmaBranchStateMachineArnOutput', {
      value: branchOrchestrator.branchStateMachine.stateMachineArn,
      description: 'ARN of the ALLMA Branch Sub-State Machine',
    });
    new cdk.CfnOutput(this, 'AllmaIterativeStepProcessorLambdaArnOutput', {
      value: compute.iterativeStepProcessorLambda.functionArn,
      description: 'ARN of the Iterative Step Processor Lambda.',
    });
    if (compute.flowStartRequestListenerLambda) {
      new cdk.CfnOutput(this, 'AllmaFlowStartRequestListenerLambdaArnOutput', {
        value: compute.flowStartRequestListenerLambda.functionArn,
        description: 'ARN of the Flow Start Request Listener Lambda.',
      });
    }

    // --- Exported Values for other Stacks ---
    new cdk.CfnOutput(this, 'AllmaContinuationTableNameOutputExport', {
      value: dataStores.allmaFlowContinuationStateTable.tableName,
      description: 'Name of the ALLMA Flow Continuation State DynamoDB Table',
      exportName: `${stackPrefix}-ContinuationTableName`,
    });
    new cdk.CfnOutput(this, 'OrchestrationLambdaRoleArnOutput', {
      value: compute.orchestrationLambdaRole.roleArn,
      description: 'ARN of the core orchestration Lambda role for cross-stack permissions.',
      exportName: `${stackPrefix}-OrchestrationLambdaRoleArn`,
    });

    // --- CDK-driven Config Import ---
    if (stageConfig.initialAllmaConfigPath) {
      const configAsset = new s3_assets.Asset(this, 'AllmaInitialConfigAsset', {
        path: stageConfig.initialAllmaConfigPath,
      });

      configAsset.grantRead(compute.configImporterLambda);

      const customResource = new customResources.AwsCustomResource(this, 'AllmaConfigImporterResource', {
        onCreate: {
          service: 'Lambda',
          action: 'invoke',
          parameters: {
            FunctionName: compute.configImporterLambda.functionName,
            Payload: JSON.stringify({
              ResourceProperties: {
                S3Bucket: configAsset.s3BucketName,
                S3Key: configAsset.s3ObjectKey,
              }
            }),
          },
          physicalResourceId: customResources.PhysicalResourceId.of(`allma-config-importer-${Date.now()}`),
        },
        onUpdate: {
          service: 'Lambda',
          action: 'invoke',
          parameters: {
            FunctionName: compute.configImporterLambda.functionName,
            Payload: JSON.stringify({
              ResourceProperties: {
                S3Bucket: configAsset.s3BucketName,
                S3Key: configAsset.s3ObjectKey,
              }
            }),
          },
          physicalResourceId: customResources.PhysicalResourceId.of(`allma-config-importer-${Date.now()}`),
        },
        policy: customResources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [compute.configImporterLambda.functionArn],
        }),
      });

      customResource.node.addDependency(dataStores.allmaConfigTable);
    }
  }
}