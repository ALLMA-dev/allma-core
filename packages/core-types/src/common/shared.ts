/**
 * Defines the deployment stages for the application.
 */
export enum Stage {
    DEV = 'dev',
    ALPHA = 'alpha',
    BETA = 'beta',
    GAMMA = 'gamma',
    PROD = 'prod',
}

/**
 * A centralized constant object for environment variable names used across the system.
 * This helps prevent typos and provides a single source of truth.
 */
export const ENV_VAR_NAMES = {
    // Table and Bucket Names
    ALLMA_CONFIG_TABLE_NAME: "ALLMA_CONFIG_TABLE_NAME",
    ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME: "ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME",
    ALLMA_EXECUTION_TRACES_BUCKET_NAME: "ALLMA_EXECUTION_TRACES_BUCKET_NAME",
    ALLMA_CONTINUATION_TABLE_NAME: "ALLMA_CONTINUATION_TABLE_NAME",
    EMAIL_TO_FLOW_MAPPING_TABLE_NAME: "EMAIL_TO_FLOW_MAPPING_TABLE_NAME",

    // SQS Queues and SNS Topics
    ALLMA_FLOW_START_REQUEST_QUEUE_URL: "ALLMA_FLOW_START_REQUEST_QUEUE_URL",
    ALLMA_FLOW_START_REQUEST_QUEUE_ARN: "ALLMA_FLOW_START_REQUEST_QUEUE_ARN",
    ALLMA_FLOW_OUTPUT_TOPIC_ARN: "ALLMA_FLOW_OUTPUT_TOPIC_ARN",
    // Pub/sub topic for execution lifecycle events (STARTED / CHECKPOINT / TERMINAL).
    ALLMA_EXECUTION_STATUS_TOPIC_ARN: "ALLMA_EXECUTION_STATUS_TOPIC_ARN",

    // State Machine ARNs
    ALLMA_STATE_MACHINE_ARN: "ALLMA_STATE_MACHINE_ARN",
    ALLMA_POLLING_STATE_MACHINE_ARN: "ALLMA_POLLING_STATE_MACHINE_ARN",

    // Lambda Function ARNs and URLs
    ITERATIVE_STEP_PROCESSOR_LAMBDA_ARN: "ITERATIVE_STEP_PROCESSOR_LAMBDA_ARN",
    CRAWLER_WORKER_LAMBDA_ARN: "CRAWLER_WORKER_LAMBDA_ARN",
    ALLMA_RESUME_API_URL: "ALLMA_RESUME_API_URL",
     
    // General Configuration
    STAGE_NAME: "STAGE_NAME",
    LOG_LEVEL: "LOG_LEVEL",

    // Secrets and Credentials
    AI_API_KEY_SECRET_ARN: "AI_API_KEY_SECRET_ARN",
    COGNITO_USER_POOL_ID: "COGNITO_USER_POOL_ID",

    // Gemini via Vertex AI
    // When 'true', the Gemini adapter calls Vertex AI instead of the key-based
    // Developer API. The remaining vars supply the Vertex project/location and
    // (optionally) a service-account key secret; omit the key secret to rely on
    // Application Default Credentials / Workload Identity Federation.
    GEMINI_USE_VERTEX: "GEMINI_USE_VERTEX",
    GCP_PROJECT_ID: "GCP_PROJECT_ID",
    GCP_LOCATION: "GCP_LOCATION",
    GCP_SA_KEY_SECRET_ARN: "GCP_SA_KEY_SECRET_ARN",
    EVENTBRIDGE_SCHEDULER_ROLE_ARN: "EVENTBRIDGE_SCHEDULER_ROLE_ARN",

    // System Limits and Behavior Configs
    LOG_RETENTION_DAYS: "LOG_RETENTION_DAYS",
    MAX_CONTEXT_DATA_SIZE_BYTES: "MAX_CONTEXT_DATA_SIZE_BYTES",
    // Max concurrent executions for throttling logic
    MAX_CONCURRENT_STEP_EXECUTIONS: "MAX_CONCURRENT_STEP_EXECUTIONS",
} as const;