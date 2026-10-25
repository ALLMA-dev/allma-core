import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { IConstruct } from 'constructs';
import { StageConfig } from '../config/stack-config.js';

const FINITE_RETENTION_DAYS = (Object.values(logs.RetentionDays).filter(
  (value): value is logs.RetentionDays => typeof value === 'number' && value !== logs.RetentionDays.INFINITE,
)).sort((a, b) => a - b);

/**
 * Maps a day count to the smallest finite CloudWatch Logs retention tier that keeps logs at least
 * that long. Never returns `RetentionDays.INFINITE`.
 */
export function resolveLogRetentionDays(
  days: number | undefined,
  fallback: logs.RetentionDays = logs.RetentionDays.ONE_WEEK,
): logs.RetentionDays {
  if (days === undefined || !(days > 0)) return fallback;
  return FINITE_RETENTION_DAYS.find(tier => tier >= days) ?? logs.RetentionDays.TEN_YEARS;
}

export function defaultLambdaLogRetention(stageConfig: StageConfig): logs.RetentionDays {
  return resolveLogRetentionDays(stageConfig.logging.retentionDays.default);
}

/**
 * Gives every log group and every Lambda in its scope a finite retention, including Lambdas CDK
 * synthesizes for custom resources (e.g. `Custom::S3AutoDeleteObjects`), which accept no
 * retention setting of their own.
 */
export class ApplyLambdaLogRetentionAspect implements cdk.IAspect {
  constructor(private readonly retention: logs.RetentionDays) {}

  public visit(node: IConstruct): void {
    if (node instanceof logs.CfnLogGroup) {
      if (node.retentionInDays === undefined) node.retentionInDays = this.retention;
      return;
    }
    if (!(node instanceof cdk.CfnResource) || node.cfnResourceType !== 'AWS::Lambda::Function') return;

    const scope = node.node.scope;
    if (!scope || scope.node.tryFindChild('LogRetention')) return;
    // The log-retention provider sets a one-day retention on its own log group.
    if (scope.node.id.startsWith('LogRetention')) return;
    if (node instanceof lambda.CfnFunction && hasExplicitLogGroup(node)) return;

    new logs.LogRetention(scope, 'LogRetention', {
      logGroupName: `/aws/lambda/${node.ref}`,
      retention: this.retention,
    });
  }
}

function hasExplicitLogGroup(fn: lambda.CfnFunction): boolean {
  const config = fn.loggingConfig;
  return config !== undefined && (cdk.Tokenization.isResolvable(config) || config.logGroup !== undefined);
}
