import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ENV_VAR_NAMES, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';
import { AdminAuthentication } from './admin-authentication.js';
import { AllmaAdminApi } from './admin-api.js';
import { StageConfig } from 'lib/config/stack-config.js';

const __filename_api = fileURLToPath(import.meta.url);
const __dirname_api = dirname(__filename_api);

export interface ApiConstructProps {
  stageConfig: StageConfig;
  configTable: dynamodb.Table;
  flowExecutionLogTable: dynamodb.Table;
  executionTracesBucket: s3.IBucket;
  orchestrationLambdaRole: iam.Role;
  iterativeStepProcessorLambda: lambda.IFunction;
  resumeFlowLambda: lambda.IFunction;
  flowTriggerApiLambda: lambda.IFunction;
}

/**
 * Encapsulates all AWS resources related to the Admin API.
 * This includes authentication (Cognito), the API Gateway itself, and all
 * Lambda functions that handle the API routes.
 */
export class ApiConstruct extends Construct {
    public readonly userPool: cdk.aws_cognito.IUserPool;
    public readonly userPoolClient: cdk.aws_cognito.IUserPoolClient;
    public readonly httpApi: apigwv2.HttpApi;
    public readonly apiDomainName: apigwv2.DomainName | undefined;
  
    constructor(scope: Construct, id: string, props: ApiConstructProps) {
        super(scope, id);
        const { stageConfig, configTable, flowExecutionLogTable, executionTracesBucket, iterativeStepProcessorLambda, orchestrationLambdaRole, resumeFlowLambda, flowTriggerApiLambda } = props;

        // --- Authentication ---
        const adminAuth = new AdminAuthentication(this, 'AllmaAdminAuth', { stageConfig });
        this.userPool = adminAuth.userPool;
        this.userPoolClient = adminAuth.userPoolClient;

        // --- IAM Roles for API Lambdas ---
        const adminApiLambdaRole = new iam.Role(this, 'AllmaAdminApiLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: `IAM Role for ALLMA Admin API Lambdas (${stageConfig.stage})`,
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });
        configTable.grantReadWriteData(adminApiLambdaRole);
        flowExecutionLogTable.grantReadData(adminApiLambdaRole);
        executionTracesBucket.grantRead(adminApiLambdaRole);

        const adminFlowControlLambdaRole = new iam.Role(this, 'AllmaAdminFlowControlRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: `IAM Role for Admin Flow Control Lambda (${stageConfig.stage})`,
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });
        adminFlowControlLambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ['states:StartExecution'],
            resources: [cdk.Stack.of(this).formatArn({ service: 'states', resource: 'stateMachine', resourceName: `AllmaFlowOrchestrator-${stageConfig.stage}` })],
        }));
        flowExecutionLogTable.grantReadData(adminFlowControlLambdaRole);
        configTable.grantReadData(adminFlowControlLambdaRole);
        iterativeStepProcessorLambda.grantInvoke(adminFlowControlLambdaRole);

        // --- API Lambda Functions ---
        const defaultLambdaTimeout = cdk.Duration.seconds(stageConfig.lambdaTimeouts.defaultSeconds);
        const adminApiLambdaMemory = stageConfig.lambdaMemorySizes.adminApiHandler;

        const commonEnvVars = {
            [ENV_VAR_NAMES.STAGE_NAME]: stageConfig.stage,
            [ENV_VAR_NAMES.LOG_LEVEL]: stageConfig.logging.logLevel,
            [ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME]: configTable.tableName,
            [ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]: flowExecutionLogTable.tableName,
            [ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME]: executionTracesBucket.bucketName,
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        };

        const adminFlowManagementLambda = this.createNodejsLambda('AdminFlowManagementLambda', `AllmaAdminFlowMgmt-${stageConfig.stage}`, 'allma-admin/flow-management.ts', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);
        const adminStepManagementLambda = this.createNodejsLambda('AdminStepManagementLambda', `AllmaAdminStepMgmt-${stageConfig.stage}`, 'allma-admin/step-management.ts', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);
        const adminExecutionMonitoringLambda = this.createNodejsLambda('AdminExecutionMonitoringLambda', `AllmaAdminExecMonitor-${stageConfig.stage}`, 'allma-admin/execution-monitoring.ts', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);
        const adminPromptTemplateManagementLambda = this.createNodejsLambda('AdminPromptTemplateManagementLambda', `AllmaAdminPromptTmplMgmt-${stageConfig.stage}`, 'allma-admin/prompt-template-management.ts', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);
        const adminDashboardStatsLambda = this.createNodejsLambda('AdminDashboardStatsLambda', `AllmaAdminDashboardStats-${stageConfig.stage}`, 'allma-admin/dashboard-stats.ts', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);
        const adminFlowControlLambda = this.createNodejsLambda('AdminFlowControlLambda', `AllmaAdminFlowControl-${stageConfig.stage}`, 'allma-admin/flow-control.ts', adminFlowControlLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, {
            ...commonEnvVars,
            [ENV_VAR_NAMES.ITERATIVE_STEP_PROCESSOR_LAMBDA_ARN]: iterativeStepProcessorLambda.functionArn,
            [ENV_VAR_NAMES.ALLMA_STATE_MACHINE_ARN]: cdk.Stack.of(this).formatArn({ service: 'states', resource: 'stateMachine', resourceName: `AllmaFlowOrchestrator-${stageConfig.stage}` }),
        });
        const adminImportExportLambda = this.createNodejsLambda('AdminImportExportLambda', `AllmaAdminImportExport-${stageConfig.stage}`, 'allma-admin/import-export.ts', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);

        // --- API Gateway ---
        const adminApi = new AllmaAdminApi(this, 'AllmaAdminApi', {
            stageConfig,
            adminUserPool: this.userPool,
            adminUserPoolClient: this.userPoolClient,
            orchestrationLambdaRole, // Pass role from parent to grant invoke permissions
            // Pass Lambdas
            resumeFlowLambda,
            flowTriggerApiLambda,
            adminFlowManagementLambda,
            adminStepManagementLambda,
            adminExecutionMonitoringLambda,
            adminPromptTemplateManagementLambda,
            adminFlowControlLambda,
            adminDashboardStatsLambda,
            adminImportExportLambda,
        });
        this.httpApi = adminApi.httpApi;
        this.apiDomainName = adminApi.apiDomainName;
        
        // --- Outputs ---
        const stackPrefix = `AllmaPlatform-${stageConfig.stage}`;
        new cdk.CfnOutput(this, 'AdminUserPoolIdOutputExport', {
            value: this.userPool.userPoolId,
            description: 'ID of the ALLMA Admin Cognito User Pool',
            exportName: `${stackPrefix}-AdminUserPoolId`,
        });
        new cdk.CfnOutput(this, 'AdminUserPoolClientIdOutputExport', {
            value: this.userPoolClient.userPoolClientId,
            description: 'Client ID of the ALLMA Admin Cognito User Pool Client',
            exportName: `${stackPrefix}-AdminUserPoolClientId`,
        });
        new cdk.CfnOutput(this, 'AllmaAdminApiUrlOutput', {
            value: this.httpApi.url || (this.apiDomainName ? `https://${this.apiDomainName.name}` : 'API_URL_NOT_YET_AVAILABLE'),
            description: 'URL of the ALLMA Admin API Gateway',
        });
        new cdk.CfnOutput(this, 'AllmaResumeApiUrlOutputExport', {
            value: `${this.httpApi.url}${ALLMA_ADMIN_API_ROUTES.RESUME}`,
            description: 'Full URL for the public flow resume endpoint',
            exportName: `${stackPrefix}-ResumeApiUrl`,
        });
    }

    private createNodejsLambda(
        id: string, functionName: string, entry: string, role: iam.IRole,
        timeout: cdk.Duration, memorySize: number, environment: { [key: string]: string },
    ): lambdaNodejs.NodejsFunction {
        return new lambdaNodejs.NodejsFunction(this, id, {
            functionName,
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'handler',
            entry: path.join(__dirname_api, `../../../dist-logic/${entry}`),
            role,
            timeout,
            memorySize,
            environment,
            bundling: {
                minify: true,
                sourceMap: true,
                externalModules: ['aws-sdk', '@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb', '@aws-sdk/client-s3', '@aws-sdk/client-sqs', '@aws-sdk/client-sns', '@aws-sdk/client-lambda', '@aws-sdk/client-sfn', '@aws-sdk/client-bedrock-runtime'],
                forceDockerBundling: false,
            },
            architecture: lambda.Architecture.ARM_64,
        });
    }
}
