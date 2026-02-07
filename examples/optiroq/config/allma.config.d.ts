import { DeepPartial, StageConfig } from '@allma/core-cdk';
/**
 *
 * This configuration demonstrates how to override the default settings.
 * Only the properties that differ from the defaults need to be specified.
 *
 * IMPORTANT:
 * - You MUST provide `awsAccountId` and `awsRegion`.
 * - S3 bucket names (`allmaExecutionTracesBucketName`) must be globally unique.
 */
export declare const devConfig: DeepPartial<StageConfig>;
