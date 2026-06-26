import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ENV_VAR_NAMES } from '@allma/core-types';
import { LambdaArchitectureType, StageConfig } from '../config/stack-config.js';

const __filename_notifications = fileURLToPath(import.meta.url);
const __dirname_notifications = dirname(__filename_notifications);

export interface AllmaNotificationsProps {
  stageConfig: StageConfig;
  flowExecutionLogTable: dynamodb.Table;
}

/**
 * Client-facing notification infrastructure (Pillar C of the real-time execution status design):
 *  - a pub/sub **execution status topic** for STARTED / CHECKPOINT / TERMINAL events, and
 *  - the crash-safe **execution-lifecycle dispatcher** Lambda that reconciles zombie-RUNNING
 *    executions and delivers / publishes the authoritative TERMINAL event.
 *
 * The dispatcher is wired to EventBridge by {@link AllmaMonitoring}; this construct owns the topic,
 * the Lambda, and its dead-letter queue.
 */
export class AllmaNotifications extends Construct {
  public readonly executionStatusTopic: sns.Topic;
  public readonly lifecycleDispatcherLambda: lambdaNodejs.NodejsFunction;
  public readonly dispatcherDlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: AllmaNotificationsProps) {
    super(scope, id);

    const { stageConfig, flowExecutionLogTable } = props;

    // --- Execution status topic (pub/sub broadcast) ---
    // Fixed name so the orchestrator can reference it via a predictive ARN without a cycle.
    this.executionStatusTopic = new sns.Topic(this, 'AllmaExecutionStatusTopic', {
      topicName: `AllmaExecutionStatusTopic-${stageConfig.stage}`,
      displayName: `ALLMA Execution Status Events (${stageConfig.stage})`,
    });

    // --- Dispatcher DLQ — backstop for failed terminal deliveries (EventBridge async retries first) ---
    this.dispatcherDlq = new sqs.Queue(this, 'AllmaLifecycleDispatcherDLQ', {
      queueName: `AllmaLifecycleDispatcherDLQ-${stageConfig.stage}`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // --- Dispatcher IAM role (least privilege) ---
    const dispatcherRole = new iam.Role(this, 'AllmaLifecycleDispatcherRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `IAM Role for the ALLMA execution-lifecycle dispatcher (${stageConfig.stage})`,
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });
    // Reconcile zombie-RUNNING metadata records and read notificationConfig.
    flowExecutionLogTable.grantReadWriteData(dispatcherRole);
    // Publish to the status topic.
    this.executionStatusTopic.grantPublish(dispatcherRole);
    // Deliver to consumer-owned SNS topics / SQS queues named in a per-trigger notificationConfig.
    dispatcherRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: ['*'],
    }));
    dispatcherRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sqs:SendMessage'],
      resources: ['*'],
    }));
    // Read consumer-owned HMAC signing secrets referenced by ARN in a notificationConfig. The
    // platform never stores raw secrets; it reads them at send time only.
    dispatcherRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['arn:aws:secretsmanager:*:*:secret:*'],
    }));

    const architecture =
      stageConfig.lambdaArchitecture === LambdaArchitectureType.ARM_64
        ? lambda.Architecture.ARM_64
        : lambda.Architecture.X86_64;

    this.lifecycleDispatcherLambda = new lambdaNodejs.NodejsFunction(this, 'AllmaLifecycleDispatcherLambda', {
      functionName: `AllmaLifecycleDispatcher-${stageConfig.stage}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname_notifications, '../../../dist-logic/allma-flows/execution-lifecycle-dispatcher.js'),
      role: dispatcherRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      // EventBridge invokes the dispatcher asynchronously; retry then DLQ on persistent failure.
      retryAttempts: 2,
      deadLetterQueue: this.dispatcherDlq,
      environment: {
        [ENV_VAR_NAMES.STAGE_NAME]: stageConfig.stage,
        [ENV_VAR_NAMES.LOG_LEVEL]: stageConfig.logging.logLevel,
        [ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]: flowExecutionLogTable.tableName,
        [ENV_VAR_NAMES.ALLMA_EXECUTION_STATUS_TOPIC_ARN]: this.executionStatusTopic.topicArn,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk', '@aws-sdk/*', '@smithy/*'],
        forceDockerBundling: false,
      },
      architecture,
    });

    new cdk.CfnOutput(this, 'AllmaExecutionStatusTopicArnOutput', {
      value: this.executionStatusTopic.topicArn,
      description: 'ARN of the ALLMA Execution Status SNS Topic for client subscriptions',
      exportName: `AllmaPlatform-${stageConfig.stage}-ExecutionStatusTopicArn`,
    });
  }
}
