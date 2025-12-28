import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ENV_VAR_NAMES, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';
import { AdminAuthentication } from './admin-authentication.js';
import { AllmaAdminApi } from './admin-api.js';
import { LambdaArchitectureType, StageConfig } from '../config/stack-config.js';

const __filename_api = fileURLToPath(import.meta.url);
const __dirname_api = dirname(__filename_api);

export interface ApiConstructProps {
  eventBridgeSchedulerRoleArn: string;
  flowStartRequestQueueArn: string;
  stageConfig: StageConfig;
  configTable: dynamodb.Table;
  flowExecutionLogTable: dynamodb.Table;
  emailToFlowMappingTable: dynamodb.Table; // NEW
  executionTracesBucket: s3.IBucket;
  orchestrationLambdaRole: iam.Role;
  iterativeStepProcessorLambda: lambda.IFunction;
  resumeFlowLambda: lambda.IFunction;
  flowTriggerApiLambda: lambda.IFunction;
  flowOrchestratorStateMachine: sfn.IStateMachine;
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
    public readonly apiStage: apigwv2.HttpStage; // Expose the stage for URL construction
    private readonly stageConfig: StageConfig;
  
    constructor(scope: Construct, id: string, props: ApiConstructProps) {
        super(scope, id);
        this.stageConfig = props.stageConfig;
        const { stageConfig, configTable, flowExecutionLogTable, emailToFlowMappingTable, executionTracesBucket, iterativeStepProcessorLambda, orchestrationLambdaRole, resumeFlowLambda, flowTriggerApiLambda, flowOrchestratorStateMachine } = props;

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
        emailToFlowMappingTable.grantReadWriteData(adminApiLambdaRole); // NEW
        executionTracesBucket.grantRead(adminApiLambdaRole);

        // Grant permissions for EventBridge Scheduler
        adminApiLambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ['scheduler:CreateSchedule', 'scheduler:UpdateSchedule', 'scheduler:DeleteSchedule', 'scheduler:GetSchedule'],
            resources: [`arn:aws:scheduler:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:schedule/default/*`],
        }));
        adminApiLambdaRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['secretsmanager:GetSecretValue'],
            resources: [`arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:*`],
            conditions: {
                StringEquals: { 'secretsmanager:ResourceTag/allma-mcp-secret': 'true' },
            },
        }));
        adminApiLambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ['iam:PassRole'],
            resources: [props.eventBridgeSchedulerRoleArn],
        }));

        const adminFlowControlLambdaRole = new iam.Role(this, 'AllmaAdminFlowControlRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: `IAM Role for Admin Flow Control Lambda (${stageConfig.stage})`,
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });
        adminFlowControlLambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ['states:StartExecution'],
            resources: [flowOrchestratorStateMachine.stateMachineArn],
        }));
        flowExecutionLogTable.grantReadData(adminFlowControlLambdaRole);
        configTable.grantReadData(adminFlowControlLambdaRole);
        iterativeStepProcessorLambda.grantInvoke(adminFlowControlLambdaRole);

        // Grant the flow control lambda permission to read the debug logs from the S3 bucket.
        executionTracesBucket.grantRead(adminFlowControlLambdaRole);

        // --- API Lambda Functions ---
        const defaultLambdaTimeout = cdk.Duration.seconds(stageConfig.lambdaTimeouts.defaultSeconds);
        const adminApiLambdaMemory = stageConfig.lambdaMemorySizes.adminApiHandler;

        const commonEnvVars = {
            [ENV_VAR_NAMES.STAGE_NAME]: stageConfig.stage,
            [ENV_VAR_NAMES.LOG_LEVEL]: stageConfig.logging.logLevel,
            [ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME]: configTable.tableName,
            [ENV_VAR_NAMES.ALLMA_FLOW_EXECUTION_LOG_TABLE_NAME]: flowExecutionLogTable.tableName,
            'EMAIL_TO_FLOW_MAPPING_TABLE_NAME': emailToFlowMappingTable.tableName, // NEW
            [ENV_VAR_NAMES.ALLMA_EXECUTION_TRACES_BUCKET_NAME]: executionTracesBucket.bucketName,
            [ENV_VAR_NAMES.EVENTBRIDGE_SCHEDULER_ROLE_ARN]: props.eventBridgeSchedulerRoleArn,
            [ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_ARN]: props.flowStartRequestQueueArn,
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        };

        const adminFlowManagementLambda = this.createNodejsLambda('AdminFlowManagementLambda', `AllmaAdminFlowMgmt-${stageConfig.stage}`, 'allma-admin/flow-management.js', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);
        const adminStepManagementLambda = this.createNodejsLambda('AdminStepManagementLambda', `AllmaAdminStepMgmt-${stageConfig.stage}`, 'allma-admin/step-management.js', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);
        const adminExecutionMonitoringLambda = this.createNodejsLambda('AdminExecutionMonitoringLambda', `AllmaAdminExecMonitor-${stageConfig.stage}`, 'allma-admin/execution-monitoring.js', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);
        const adminPromptTemplateManagementLambda = this.createNodejsLambda('AdminPromptTemplateManagementLambda', `AllmaAdminPromptTmplMgmt-${stageConfig.stage}`, 'allma-admin/prompt-template-management.js', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);
        const adminDashboardStatsLambda = this.createNodejsLambda('AdminDashboardStatsLambda', `AllmaAdminDashboardStats-${stageConfig.stage}`, 'allma-admin/dashboard-stats.js', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);
        const adminFlowControlLambda = this.createNodejsLambda('AdminFlowControlLambda', `AllmaAdminFlowControl-${stageConfig.stage}`, 'allma-admin/flow-control.js', adminFlowControlLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, {
            ...commonEnvVars,
            [ENV_VAR_NAMES.ITERATIVE_STEP_PROCESSOR_LAMBDA_ARN]: iterativeStepProcessorLambda.functionArn,
            [ENV_VAR_NAMES.ALLMA_STATE_MACHINE_ARN]: flowOrchestratorStateMachine.stateMachineArn,
        });
        const adminImportExportLambda = this.createNodejsLambda('AdminImportExportLambda', `AllmaAdminImportExport-${stageConfig.stage}`, 'allma-admin/import-export.js', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);
        const adminMcpConnectionManagementLambda = this.createNodejsLambda('AdminMcpConnectionManagementLambda', `AllmaAdminMcpConnectionMgmt-${stageConfig.stage}`, 'allma-admin/mcp-connection-management.js', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);

        const adminAgentManagementLambda = this.createNodejsLambda('AdminAgentManagementLambda', `AllmaAdminAgentMgmt-${stageConfig.stage}`, 'allma-admin/agent-management.js', adminApiLambdaRole, defaultLambdaTimeout, adminApiLambdaMemory, commonEnvVars);

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
            adminMcpConnectionManagementLambda,
            adminAgentManagementLambda,
        });
        this.httpApi = adminApi.httpApi;
        this.apiStage = new apigwv2.HttpStage(this, 'ApiGatewayStage', {
            httpApi: this.httpApi as any,
            stageName: stageConfig.adminApi.apiMappingKey,
            autoDeploy: true,
        });
        if (stageConfig.adminApi.domainName && stageConfig.adminApi.certificateArn) {
            const certificate = acm.Certificate.fromCertificateArn(this, 'AdminApiCert', stageConfig.adminApi.certificateArn);
            this.apiDomainName = new apigwv2.DomainName(this, 'AdminApiCustomDomain', {
              domainName: stageConfig.adminApi.domainName,
              certificate: certificate,
              endpointType: apigwv2.EndpointType.REGIONAL,
            });
      
            new apigwv2.ApiMapping(this, 'AdminApiMapping', {
              api: this.httpApi,
              domainName: this.apiDomainName,
              stage: this.apiStage,
              apiMappingKey: stageConfig.adminApi.apiMappingKey,
            });
      
            if (stageConfig.adminApi.hostedZoneId && stageConfig.adminApi.hostedZoneName) {
              const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'AdminApiHostedZone', {
                hostedZoneId: stageConfig.adminApi.hostedZoneId,
                zoneName: stageConfig.adminApi.hostedZoneName,
              });
              const recordName = stageConfig.adminApi.domainName.replace(new RegExp(`\\.?${stageConfig.adminApi.hostedZoneName.replace(/\./g, '\\.')}$`), '');
      
              new route53.ARecord(this, 'AdminApiDnsRecord', {
                zone: zone,
                recordName: recordName,
                target: route53.RecordTarget.fromAlias(new route53Targets.ApiGatewayv2DomainProperties(this.apiDomainName.regionalDomainName, this.apiDomainName.regionalHostedZoneId)),
              });
            } else {
              new cdk.CfnOutput(this, 'AllmaAdminApiCustomDomainTargetOutput', {
                value: this.apiDomainName.regionalDomainName,
                description: `CNAME target for ALLMA Admin API custom domain ${stageConfig.adminApi.domainName}`,
              });
            }
      
            new cdk.CfnOutput(this, 'AdminApiDomainNameOutput', {
              value: this.apiDomainName.name,
              description: 'The FQDN of the shared Admin API Gateway custom domain.',
              exportName: `AllmaPlatform-${stageConfig.stage}-AdminApiCustomDomainName`,
            });
      
            new cdk.CfnOutput(this, 'AdminApiRegionalDomainNameOutput', {
              value: this.apiDomainName.regionalDomainName,
              description: 'The regional domain name of the shared Admin API Gateway.',
              exportName: `AllmaPlatform-${stageConfig.stage}-AdminApiDomainName`,
            });
      
            new cdk.CfnOutput(this, 'AdminApiRegionalHostedZoneIdOutput', {
              value: this.apiDomainName.regionalHostedZoneId,
              description: 'The regional hosted zone ID of the shared Admin API Gateway.',
              exportName: `AllmaPlatform-${stageConfig.stage}-AdminApiHostedZoneId`,
            });
          }

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
            // FIX: Construct the URL from the explicit stage
            value: this.apiStage.url,
            description: 'URL of the ALLMA Admin API Gateway',
        });
        new cdk.CfnOutput(this, 'AllmaResumeApiUrlOutputExport', {
            // FIX: Construct the URL from the explicit stage
            value: `${this.apiStage.url.slice(0, -1)}${ALLMA_ADMIN_API_ROUTES.RESUME}`,
            description: 'Full URL for the public flow resume endpoint',
            exportName: `${stackPrefix}-ResumeApiUrl`,
        });
    }

    private createNodejsLambda(
        id: string, functionName: string, entry: string, role: iam.IRole,
        timeout: cdk.Duration, memorySize: number, environment: { [key: string]: string },
    ): lambdaNodejs.NodejsFunction {
        const architecture =
          this.stageConfig.lambdaArchitecture === LambdaArchitectureType.ARM_64
            ? lambda.Architecture.ARM_64
            : lambda.Architecture.X86_64;

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
                externalModules: ['aws-sdk', '@aws-sdk/*', '@smithy/*'],
                forceDockerBundling: false,
            },
            architecture: architecture,
        });
    }
}
