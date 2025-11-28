import { LogLevel, Stage as AppStage } from '@allma/core-types';

/**
 * Defines the CPU architecture for Lambda functions.
 */
export enum LambdaArchitectureType {
  ARM_64 = 'ARM_64',
  X86_64 = 'X86_64',
}

/**
 * Recursively makes all properties of an object optional.
 */
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

/**
 * Defines the configuration for deploying a web application (like the Admin Shell or Docs site).
 */
export interface WebAppConfig {
  /**
   * The local file system path to the directory containing the built static assets.
   * @example path.join(__dirname, '../dist')
   */
  assetPath: string;

  /**
   * The custom domain name for the web application (e.g., `admin.example.com`).
   * If provided, `certificateArn` and `hostedZoneId` must also be provided.
   * @default - No custom domain is configured.
   */
  domainName?: string;

  /**
   * The ARN of the ACM certificate for the custom domain.
   * Required if `domainName` is provided.
   * @default - No custom domain is configured.
   */
  certificateArn?: string;

  /**
   * The ID of the Route 53 hosted zone for the custom domain.
   * Required if `domainName` is provided.
   * @default - No custom domain is configured.
   */
  hostedZoneId?: string;
}

/**
 * Defines the comprehensive configuration required for deploying an Allma stack.
 * This interface serves as the public contract for end-users.
 */
export interface StageConfig {
  /**
   * The AWS Account ID where the stack will be deployed.
   * @example '123456789012'
   */
  awsAccountId: string;

  /**
   * The AWS Region where the stack will be deployed.
   * @example 'us-east-1'
   */
  awsRegion: string;

  /**
   * The deployment stage identifier.
   * @example AppStage.DEV
   */
  stage: AppStage;

  /**
   * The name of the DynamoDB table for storing Allma configuration.
   * @example 'allma-config-dev'
   */
  allmaConfigTableName: string;

  /**
   * The name of the DynamoDB table for logging flow executions.
   * @example 'allma-flow-execution-log-dev'
   */
  allmaFlowExecutionLogTableName: string;

  /**
   * The name of the S3 bucket for storing execution traces.
   * @example 'allma-execution-traces-dev'
   */
  allmaExecutionTracesBucketName: string;

  /**
   * Configuration for the Admin API endpoint.
   */
  adminApi: {
    /**
     * The custom domain name for the API.
     * @example 'api.dev.allma.io'
     */
    domainName: string;

    /**
     * The ARN of the ACM certificate for the custom domain.
     * @example 'arn:aws:acm:us-east-1:123456789012:certificate/...'
     */
    certificateArn: string;

    /**
     * The Route 53 Hosted Zone ID for the domain (optional).
     */
    hostedZoneId?: string;

    /**
     * The Route 53 Hosted Zone Name for the domain (optional).
     */
    hostedZoneName?: string;

    /**
     * A list of allowed origins for CORS.
     * @example ['https://admin.allma.dev']
     */
    allowedOrigins: string[];

    /**
     * The base path mapping for the API Gateway.
     * @example 'v1'
     */
    apiMappingKey: string;
  };

  /**
   * Configuration for the Cognito User Pool.
   */
  cognito: {
    /**
     * The name of the Cognito User Pool.
     * @example 'allma-admin-users-dev'
     */
    userPoolName: string;

    /**
     * The name of the admin group within the User Pool.
     * @example 'allma-admins'
     */
    adminGroupName: string;
  };

  /**
   * Memory size settings for Lambda functions (in MB).
   */
  lambdaMemorySizes: {
    default: number;
    iterativeStepProcessor: number;
    adminApiHandler: number;
    flowStartRequestListener: number;
    crawlerWorker: number;
  };

  /**
   * The CPU architecture for Lambda functions.
   * @default LambdaArchitectureType.ARM_64
   */
  lambdaArchitecture: LambdaArchitectureType;

  /**
   * Timeout settings for Lambda functions.
   */
  lambdaTimeouts: {
    defaultSeconds: number;
    iterativeStepProcessorMinutes: number;
    crawlerWorkerMinutes: number;
  };

  /**
   * Timeout settings for Step Functions state machines.
   */
  sfnTimeouts: {
    mainOrchestratorDays: number;
    branchOrchestratorMinutes: number;
    pollingOrchestratorHours: number;
  };

  /**
   * Settings for SQS queues.
   */
  sqsSettings: {
    flowStartRequestQueue: {
      visibilityTimeoutSeconds: number;
      receiveMessageWaitTimeSeconds: number;
    };
  };

  /**
   * Various operational limits.
   */
  limits: {
    /**
     * The maximum size of context data in bytes.
     */
    maxContextDataSizeBytes: number;
  };

  /**
   * Maximum concurrent executions for the core Orchestrator Lambda.
   * This sets the ReservedConcurrentExecutions on the Lambda and guides
   * the Parallel Fork throttling logic.
   * 
   * If undefined, no reserved concurrency is set on the Lambda (it uses the account's unreserved pool).
   * This is recommended for dev/test accounts with low limits.
   * 
   * @default undefined
   */
  orchestratorConcurrency?: number;

  /**
   * Logging configuration.
   */
  logging: {
    /**
     * The minimum log level to record.
     */
    logLevel: LogLevel;

    /**
     * CloudWatch log retention periods in days.
     */
    retentionDays: {
      default: number;
      traces: number;
      executionLogs: number;
      sfn: number;
    }
  };

  /**
   * The ARN of the AWS Secrets Manager secret containing the AI API key.
   * @example 'arn:aws:secretsmanager:us-east-1:123456789012:secret:...'
   */
  aiApiKeySecretArn: string;

  /**
   * Optional configuration for AWS Simple Email Service (SES).
   * Required for email sending and receiving features.
   */
  ses?: {
    /**
     * A domain name that has been verified in AWS SES in the same region.
     * This is required for receiving emails.
     * @example 'your-domain.com'
     */
    verifiedDomain: string;
    /**
     * The default "From" address for sending emails.
     * This address must be verified in SES.
     * @example 'noreply@your-domain.com'
     */
    fromEmailAddress: string;
  };

  /**
   * Optional path to a file or directory containing an initial Allma configuration to load.
   * The path can point to either a single JSON file or a directory.
   *
   * If a directory is provided, all `.json` files within it will be bundled and imported.
   * Each JSON file must conform to the AllmaExportFormat structure, containing `stepDefinitions` and/or `flows` arrays.
   *
   * This is useful for initializing a new environment with a baseline configuration.
   *
   * @default - no initial configuration is loaded
   * @example './allma-config' or './allma-config.json'
   */
  initialAllmaConfigPath?: string;
}