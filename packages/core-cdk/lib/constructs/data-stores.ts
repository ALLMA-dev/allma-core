import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { StageConfig } from '../config/stack-config.js';

interface AllmaDataStoresProps {
  stageConfig: StageConfig;
}

/**
 * Defines all primary data stores for the Allma platform, including DynamoDB tables and S3 buckets.
 * This construct centralizes data layer infrastructure definitions.
 */
export class AllmaDataStores extends Construct {
  public readonly allmaConfigTable: dynamodb.Table;
  public readonly allmaFlowExecutionLogTable: dynamodb.Table;
  public readonly allmaExecutionTracesBucket: s3.Bucket;
  public readonly allmaFlowContinuationStateTable: dynamodb.Table;
  public readonly emailToFlowMappingTable: dynamodb.Table; // NEW

  constructor(scope: Construct, id: string, props: AllmaDataStoresProps) {
    super(scope, id);

    const { stageConfig } = props;
    const isProd = stageConfig.stage === 'prod';
    const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // --- ALLMA Configuration Table ---
    // Stores FlowDefinitions, StepDefinitions, PromptTemplates (if ALLMA specific)
    this.allmaConfigTable = new dynamodb.Table(this, 'AllmaConfigTable', {
      tableName: stageConfig.allmaConfigTableName,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      pointInTimeRecovery: isProd,
    });

    // GSI for querying by itemType and primary ID (e.g., flowId, stepDefinitionId)
    this.allmaConfigTable.addGlobalSecondaryIndex({
      indexName: 'GSI_ItemType_Id',
      partitionKey: { name: 'itemType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'id', type: dynamodb.AttributeType.STRING }, // Assumes 'id' attribute exists on items
      projectionType: dynamodb.ProjectionType.ALL, // Adjust as needed
    });

    // --- GSI for listing items ---
    
    this.allmaConfigTable.addGlobalSecondaryIndex({
        indexName: 'GSI_ListItems',
        partitionKey: { name: 'itemType', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'name', type: dynamodb.AttributeType.STRING },
        nonKeyAttributes: ['id', 'description', 'latestVersion', 'publishedVersion', 'tags', 'updatedAt', 'stepType'],
        projectionType: dynamodb.ProjectionType.INCLUDE,
    });

    this.allmaConfigTable.addGlobalSecondaryIndex({
        indexName: 'GSI_ListItems_v2',
        partitionKey: { name: 'itemType', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'name', type: dynamodb.AttributeType.STRING },
        nonKeyAttributes: ['id', 'description', 'latestVersion', 'publishedVersion', 'tags', 'updatedAt', 'stepType', 'emailTriggerAddress'],
        projectionType: dynamodb.ProjectionType.INCLUDE,
    });

    // GSI for listing published flows
    this.allmaConfigTable.addGlobalSecondaryIndex({
        indexName: 'GSI_PublishedFlows',
        partitionKey: { name: 'itemType_isPublished', type: dynamodb.AttributeType.STRING }, // e.g., "ALLMA_FLOW_DEFINITION#true"
        sortKey: { name: 'name', type: dynamodb.AttributeType.STRING }, // Sort by name for easier listing
        projectionType: dynamodb.ProjectionType.INCLUDE,
        nonKeyAttributes: ['id', 'description', 'version', 'updatedAt'],
    });

    // --- ALLMA Flow Execution Log Table ---
    this.allmaFlowExecutionLogTable = new dynamodb.Table(this, 'AllmaFlowExecutionLogTable', {
      tableName: stageConfig.allmaFlowExecutionLogTableName,
      partitionKey: { name: 'flowExecutionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'eventTimestamp_stepInstanceId_attempt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      pointInTimeRecovery: isProd,
      timeToLiveAttribute: 'ttl', // For automatic cleanup of old logs
    });

    this.allmaFlowExecutionLogTable.addGlobalSecondaryIndex({
      indexName: 'GSI_ByFlow',
      partitionKey: { name: 'flowDefinitionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'flow_sort_key', type: dynamodb.AttributeType.STRING }, // e.g., "v#1#s#COMPLETED#t#2023-..."
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: [
        'flowExecutionId',
        'status',
        'startTime',
        'endTime',
        'overallDurationMs',
        'triggerSource',
        'flowDefinitionVersion',
      ],
    });

    // GSI for Admin UI to list executions sorted by start time.
    this.allmaFlowExecutionLogTable.addGlobalSecondaryIndex({
      indexName: 'GSI_ByFlow_StartTime',
      partitionKey: { name: 'flowDefinitionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startTime', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      // Project the same attributes as the original GSI for consistency.
      nonKeyAttributes: [
        'flowExecutionId',
        'status',
        'endTime',
        'triggerSource',
        'flowDefinitionVersion',
        'itemType', // Include itemType for efficient filtering
      ],
    });

    // GSI for Admin UI Dashboard to query all executions globally by time.
    this.allmaFlowExecutionLogTable.addGlobalSecondaryIndex({
      indexName: 'GSI_ByItemType_StartTime',
      partitionKey: { name: 'itemType', type: dynamodb.AttributeType.STRING }, // e.g., 'ALLMA_FLOW_EXECUTION_RECORD'
      sortKey: { name: 'startTime', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      // Project attributes needed for the dashboard calculations to avoid fetching from the main table.
      nonKeyAttributes: [
        'flowExecutionId',
        'status',
        'endTime',
        'flowDefinitionId',
        'flowDefinitionVersion',
        'errorInfo',
      ],
    });

    // Table to store task tokens for paused flows.
    this.allmaFlowContinuationStateTable = new dynamodb.Table(this, 'AllmaFlowContinuationStateTable', {
      tableName: `AllmaFlowContinuationState-${stageConfig.stage}`,
      // The key that links the wait to the external world (e.g., 'whatsapp:123456789')
      partitionKey: { name: 'correlationKey', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      // A TTL is CRITICAL to clean up abandoned flows.
      // e.g., if a user never replies, the token will be deleted after N days.
      timeToLiveAttribute: 'ttl',
    });

    // --- Email Trigger to Flow Mapping Table ---
    this.emailToFlowMappingTable = new dynamodb.Table(this, 'EmailToFlowMappingTable', {
        tableName: `AllmaEmailToFlowMapping-${stageConfig.stage}`,
        partitionKey: { name: 'emailAddress', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'keyword', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy,
        pointInTimeRecovery: isProd,
    });

    this.emailToFlowMappingTable.addGlobalSecondaryIndex({
        indexName: 'GSI_ByFlow',
        partitionKey: { name: 'flowDefinitionId', type: dynamodb.AttributeType.STRING },
        projectionType: dynamodb.ProjectionType.ALL,
    });


    // --- S3 Bucket for Execution Traces ---
    this.allmaExecutionTracesBucket = new s3.Bucket(this, 'AllmaExecutionTracesBucket', {
      bucketName: `${stageConfig.allmaExecutionTracesBucketName}-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: isProd,
      removalPolicy,
      autoDeleteObjects: !isProd, // Useful for non-prod cleanup
      lifecycleRules: [{
        id: 'TraceLogRetention',
        expiration: cdk.Duration.days(stageConfig.logging.retentionDays.traces),
        transitions: isProd ? [{
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(stageConfig.logging.retentionDays.traces - 2),
        }] : [],
      }],
    });
  }
}
