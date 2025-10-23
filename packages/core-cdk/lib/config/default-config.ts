import { Stage, LogLevel } from '@allma/core-types';
import { StageConfig } from './stack-config';

/**
 * Default configuration for the Allma platform.
 * This serves as the base, and user-provided configurations will be merged on top of it.
 */
export const defaultConfig: StageConfig = {
  // --- Core AWS Account & Region ---
  // These MUST be overridden in the user's config.
  awsAccountId: 'YOUR_ACCOUNT_ID',
  awsRegion: 'us-east-1',
  
  // --- Stage Identifier ---
  stage: Stage.DEV,

  // --- Resource Naming ---
  allmaConfigTableName: 'AllmaConfigTable',
  allmaFlowExecutionLogTableName: 'AllmaFlowExecutionLogTable',
  allmaExecutionTracesBucketName: 'allma-execution-traces',

  // --- Admin API Configuration ---
  adminApi: {
    domainName: '', // Leave empty to use auto-generated APIGW URL.
    certificateArn: '', // Required if domainName is set.
    hostedZoneId: '',   // Optional: For automatic Route53 record creation.
    hostedZoneName: '', // Optional: For automatic Route53 record creation.
    allowedOrigins: ['http://localhost:3001', 'http://localhost:5173'], // For CORS
    apiMappingKey: 'v1',
  },

  // --- Cognito Configuration ---
  cognito: {
    userPoolName: 'AllmaAdminUserPool',
    adminGroupName: 'Admins',
  },

  // --- Lambda Resource Settings ---
  lambdaMemorySizes: {
    default: 256,
    iterativeStepProcessor: 1024,
    adminApiHandler: 256,
    flowStartRequestListener: 256,
    crawlerWorker: 3008,
  },
  lambdaTimeouts: {
    defaultSeconds: 60,
    iterativeStepProcessorMinutes: 15,
    crawlerWorkerMinutes: 15,
  },

  // --- Step Functions Timeouts ---
  sfnTimeouts: {
    mainOrchestratorDays: 7,
    branchOrchestratorMinutes: 15,
    pollingOrchestratorHours: 2,
  },

  // --- SQS Settings ---
  sqsSettings: {
    flowStartRequestQueue: {
      visibilityTimeoutSeconds: 60,
      receiveMessageWaitTimeSeconds: 10,
    },
  },

  // --- Application Limits ---
  limits: {
    maxContextDataSizeBytes: 10 * 1024, // 10KB
  },

  // --- Logging Configuration ---
  logging: {
    logLevel: LogLevel.INFO,
    retentionDays: {
      default: 7,
      traces: 7,
      executionLogs: 30,
      sfn: 7,
    }
  },

  // --- Secrets ---
  // This MUST be overridden in the user's config.
  aiApiKeySecretArn: 'YOUR_AI_API_KEY_SECRET_ARN'
};
