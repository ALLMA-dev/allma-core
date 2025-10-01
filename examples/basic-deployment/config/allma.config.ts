import { Stage, LogLevel } from '@allma/core-types';
import { DeepPartial, StageConfig } from '@allma/core-cdk';

/**
 * Example configuration for a 'dev' stage deployment.
 *
 * This configuration demonstrates how to override the default settings.
 * Only the properties that differ from the defaults need to be specified.
 *
 * IMPORTANT:
 * - You MUST provide `awsAccountId` and `awsRegion`.
 * - S3 bucket names (`allmaExecutionTracesBucketName`) must be globally unique.
 */
export const devConfig: DeepPartial<StageConfig> = {
  // --- Core AWS Environment (Required) ---
  awsAccountId: '[set your aws account id here]',
  awsRegion: '[set your aws account region here]', // e.g. us-east-1
  stage: Stage.DEV,

  // --- Admin API and Cognito (Example Override) ---
  adminApi: {
    domainName: 'allma-admin-api-dev.example.com', 
    certificateArn: 'arn:aws:acm:...',
    allowedOrigins: ['http://localhost:3001', 'http://localhost:5173', 'https://admin-ui-dev.example.com'],
  },

  // --- Logging (Override of default value) ---
  logging: {
    logLevel: LogLevel.DEBUG,
  },

  // --- Secrets (Required to store AI LLM API keys) ---
  aiApiKeySecretArn: 'arn:aws:secretsmanager:...',
};
