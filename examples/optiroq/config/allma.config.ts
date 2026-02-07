import { Stage, LogLevel } from '@allma/core-types';
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
export const devConfig: DeepPartial<StageConfig> = {
  // --- Core AWS Environment (Required) ---
  awsAccountId: '871610744338',
  awsRegion: 'us-west-2', // e.g. us-east-1
  stage: Stage.BETA,

  // --- Logging (Override of default value) ---
  logging: {
    logLevel: LogLevel.DEBUG,
  },

  // --- Secrets (Required to store AI LLM API keys) ---
  aiApiKeySecretArn: 'arn:aws:secretsmanager:us-west-2:871610744338:secret:GeminiApiKey-hYr6CY',

  adminApi: {
    domainName: 'allma-api-beta.optiroq.com',
    certificateArn: 'arn:aws:acm:us-west-2:871610744338:certificate/abd60f5e-3018-4e3e-bf2e-d047bd0d7349',
  },

  ses: {
    verifiedDomain: "mail-beta.optiroq.com",
    fromEmailAddress: "agent@mail-beta.optiroq.com"
  },

  initialAllmaConfigPath: "./config/flows",
};
