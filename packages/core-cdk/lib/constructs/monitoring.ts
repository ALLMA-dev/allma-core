import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { StageConfig } from '../config/stack-config.js';

export interface AllmaMonitoringProps {
  stageConfig: StageConfig;
  flowOrchestratorStateMachineArn: string;
  pollingStateMachineArn: string;
}

/**
 * Encapsulates the monitoring and alerting infrastructure for the Allma platform.
 * This construct sets up EventBridge rules to proactively notify administrators
 * of failed Step Function executions via SNS topics.
 */
export class AllmaMonitoring extends Construct {
  public readonly alertsTopic: sns.ITopic;

  constructor(scope: Construct, id: string, props: AllmaMonitoringProps) {
    super(scope, id);

    const { stageConfig } = props;

    // 1. Resolve the Target SNS Topic
    // Use an existing topic if provided, otherwise spin up a new dedicated one.
    if (stageConfig.monitoring?.alertsTopicArn) {
      this.alertsTopic = sns.Topic.fromTopicArn(this, 'ImportedAlertsTopic', stageConfig.monitoring.alertsTopicArn);
    } else {
      this.alertsTopic = new sns.Topic(this, 'AllmaAlertsTopic', {
        topicName: `AllmaAlerts-${stageConfig.stage}`,
        displayName: `Allma System Alerts (${stageConfig.stage})`,
      });
    }

    // 2. Attach Email Subscriptions
    if (stageConfig.monitoring?.alertEmails && stageConfig.monitoring.alertEmails.length > 0) {
      stageConfig.monitoring.alertEmails.forEach((email) => {
        this.alertsTopic.addSubscription(new subscriptions.EmailSubscription(email));
      });
    }

    // 3. Create EventBridge Rule for Step Function Failures
    const sfnFailureRule = new events.Rule(this, 'StepFunctionFailureRule', {
      ruleName: `AllmaSfnFailures-${stageConfig.stage}`,
      description: 'Triggered when an Allma Step Function execution fails, times out, or is aborted.',
      eventPattern: {
        source: ['aws.states'],
        detailType: ['Step Functions Execution Status Change'],
        detail: {
          status: ['FAILED', 'TIMED_OUT', 'ABORTED'],
          stateMachineArn: [
            props.flowOrchestratorStateMachineArn,
            props.pollingStateMachineArn,
          ],
        },
      },
    });

    // 4. Use an Input Transformer to prevent 256KB SNS payload limits
    // Extracting only essential fields guarantees the SNS message is tiny (avoiding drop failures)
    // and makes the resulting email/alert highly readable for developers.
    sfnFailureRule.addTarget(new targets.SnsTopic(this.alertsTopic, {
      message: events.RuleTargetInput.fromText(
        `🚨 Allma Flow Execution Alert (${stageConfig.stage}) 🚨\n\n` +
        `Status: ${events.EventField.fromPath('$.detail.status')}\n` +
        `Execution ARN: ${events.EventField.fromPath('$.detail.executionArn')}\n` +
        `State Machine: ${events.EventField.fromPath('$.detail.stateMachineArn')}\n\n` +
        `Error: ${events.EventField.fromPath('$.detail.error')}\n` +
        `Cause: ${events.EventField.fromPath('$.detail.cause')}\n\n` +
        `View in AWS Console:\n` +
        `https://${cdk.Aws.REGION}.console.aws.amazon.com/states/home?region=${cdk.Aws.REGION}#/executions/details/${events.EventField.fromPath('$.detail.executionArn')}`
      )
    }));

    // --- Outputs ---
    new cdk.CfnOutput(this, 'AllmaAlertsTopicArnOutput', {
      value: this.alertsTopic.topicArn,
      description: 'ARN of the ALLMA Monitoring Alerts SNS Topic',
      exportName: `AllmaPlatform-${stageConfig.stage}-AlertsTopicArn`,
    });
  }
}