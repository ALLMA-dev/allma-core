import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';
import { StageConfig } from '../config/stack-config.js';

interface AllmaAdminApiProps {
  stageConfig: StageConfig;

  adminUserPool: cognito.IUserPool;
  adminUserPoolClient: cognito.IUserPoolClient;

  // Lambdas from AllmaCompute construct
  resumeFlowLambda: lambda.IFunction;
  flowTriggerApiLambda: lambda.IFunction;
  adminFlowManagementLambda: lambda.IFunction;
  adminStepManagementLambda: lambda.IFunction;
  adminExecutionMonitoringLambda: lambda.IFunction;
  adminPromptTemplateManagementLambda: lambda.IFunction;
  adminFlowControlLambda: lambda.IFunction;
  adminDashboardStatsLambda: lambda.IFunction;
  adminImportExportLambda: lambda.IFunction;
  adminMcpConnectionManagementLambda: lambda.IFunction;

  // Role from AllmaCompute to grant API invoke permissions to
  orchestrationLambdaRole: iam.Role;
}

export class AllmaAdminApi extends Construct {
  public readonly httpApi: apigwv2.HttpApi;
  public readonly apiDomainName?: apigwv2.DomainName;

  constructor(scope: Construct, id: string, props: AllmaAdminApiProps) {
    super(scope, id);

    const {
      stageConfig,
      adminUserPoolClient,
      adminFlowManagementLambda,
      adminStepManagementLambda,
      adminExecutionMonitoringLambda,
      adminPromptTemplateManagementLambda,
      adminFlowControlLambda,
      adminDashboardStatsLambda,
      adminImportExportLambda,
      adminMcpConnectionManagementLambda
    } = props;

    const adminAuthorizer = new HttpUserPoolAuthorizer('AdminCognitoAuthorizer', props.adminUserPool, {
      userPoolClients: [adminUserPoolClient],
    });

    // CORS is now handled explicitly via a dedicated Lambda and a catch-all OPTIONS route
    // defined in the AllmaStack. This provides a more robust and debuggable solution for
    // handling the circular dependency with the Admin UI's dynamic CloudFront URL.
    this.httpApi = new apigwv2.HttpApi(this, 'AllmaAdminHttpApi', {
      apiName: `AllmaAdminApi-${stageConfig.stage}`,
      description: `Admin API for ALLMA Platform (${stageConfig.stage})`,
      corsPreflight: {
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token', 'X-Amz-User-Agent'],
        allowMethods: [
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowOrigins: stageConfig.adminApi.allowedOrigins, // Initialize with static origins
        maxAge: cdk.Duration.days(1),
      },
      createDefaultStage: false,
      defaultAuthorizer: adminAuthorizer,
    });

    // --- Public Routes (No Cognito Auth) ---

    const resumeFlowIntegration = new HttpLambdaIntegration('ResumeFlowIntegration', props.resumeFlowLambda);
    this.httpApi.addRoutes({
      path: ALLMA_ADMIN_API_ROUTES.RESUME,
      methods: [apigwv2.HttpMethod.POST],
      integration: resumeFlowIntegration,
      authorizer: new apigwv2.HttpNoneAuthorizer(),
    });

    // Public route to trigger a flow. Secure with an API key in production.
    const flowTriggerIntegration = new HttpLambdaIntegration('FlowTriggerIntegration', props.flowTriggerApiLambda);
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOWS}/{flowId}/trigger`,
      methods: [apigwv2.HttpMethod.POST],
      integration: flowTriggerIntegration,
      authorizer: new apigwv2.HttpNoneAuthorizer(),
    });

    // --- Admin-Only Routes (Cognito Auth) ---

    // Prompt Template Routes (Versioned)
    const promptTemplateIntegration = new HttpLambdaIntegration('PromptTemplateIntegration', adminPromptTemplateManagementLambda);

    // List all prompts / Create new prompt
    this.httpApi.addRoutes({
      path: ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATES,
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: promptTemplateIntegration,
    });

    // Clone a prompt
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATES}/{promptId}/clone`,
      methods: [apigwv2.HttpMethod.POST],
      integration: promptTemplateIntegration,
    });

    // List versions of a specific prompt
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATES}/{promptId}/versions`,
      methods: [apigwv2.HttpMethod.GET],
      integration: promptTemplateIntegration,
    });

    // Create a new version for a prompt
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATES}/{promptId}/versions`,
      methods: [apigwv2.HttpMethod.POST],
      integration: promptTemplateIntegration,
    });

    // Get, Update, Delete a specific version
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATES}/{promptId}/versions/{versionNumber}`,
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: promptTemplateIntegration,
    });

    // Publish a version
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATES}/{promptId}/versions/{versionNumber}/publish`,
      methods: [apigwv2.HttpMethod.POST],
      integration: promptTemplateIntegration,
    });

    // Unpublish a version
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.PROMPT_TEMPLATES}/{promptId}/versions/{versionNumber}/unpublish`,
      methods: [apigwv2.HttpMethod.POST],
      integration: promptTemplateIntegration,
    });


    // Flow Definitions
    const adminFlowManagementIntegration = new HttpLambdaIntegration('AdminFlowManagementIntegration', adminFlowManagementLambda);
    this.httpApi.addRoutes({
      path: ALLMA_ADMIN_API_ROUTES.FLOWS,
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.GET],
      integration: adminFlowManagementIntegration,
      authorizer: adminAuthorizer,
    });
    this.httpApi.addRoutes({
      path: ALLMA_ADMIN_API_ROUTES.FLOW_TAGS,
      methods: [apigwv2.HttpMethod.GET],
      integration: adminFlowManagementIntegration,
      authorizer: adminAuthorizer,
    });
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOWS}/{flowId}`, // For getting/updating settings, or deleting all versions
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: adminFlowManagementIntegration,
      authorizer: adminAuthorizer,
    });
    // Clone a flow
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOWS}/{flowId}/clone`,
      methods: [apigwv2.HttpMethod.POST],
      integration: adminFlowManagementIntegration,
      authorizer: adminAuthorizer,
    });
    // List versions of a flow
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOWS}/{flowId}/versions`,
      methods: [apigwv2.HttpMethod.GET],
      integration: adminFlowManagementIntegration,
      authorizer: adminAuthorizer,
    });
    // Create new version of a flow
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOWS}/{flowId}/versions`,
      methods: [apigwv2.HttpMethod.POST],
      integration: adminFlowManagementIntegration,
      authorizer: adminAuthorizer,
    });
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOWS}/{flowId}/versions/{versionNumber}`,
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: adminFlowManagementIntegration,
      authorizer: adminAuthorizer,
    });
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOWS}/{flowId}/versions/{versionNumber}/publish`,
      methods: [apigwv2.HttpMethod.POST], // Publish a draft version
      integration: adminFlowManagementIntegration,
      authorizer: adminAuthorizer,
    });
    // Unpublish a version
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOWS}/{flowId}/versions/{versionNumber}/unpublish`,
      methods: [apigwv2.HttpMethod.POST],
      integration: adminFlowManagementIntegration,
      authorizer: adminAuthorizer,
    });

    // Integrations for flow control and execution monitoring
    const adminFlowControlIntegration = new HttpLambdaIntegration('AdminFlowControlIntegration', adminFlowControlLambda);
    const executionMonitoringIntegration = new HttpLambdaIntegration('ExecutionMonitoringIntegration', adminExecutionMonitoringLambda);

    // Sandbox step execution
    this.httpApi.addRoutes({
      path: ALLMA_ADMIN_API_ROUTES.FLOW_SANDBOX_STEP,
      methods: [apigwv2.HttpMethod.POST],
      integration: adminFlowControlIntegration,
      authorizer: adminAuthorizer,
    });

    // Test execution of a specific flow version
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOWS}/{flowId}/versions/{versionNumber}/execute`,
      methods: [apigwv2.HttpMethod.POST],
      integration: adminFlowControlIntegration,
      authorizer: adminAuthorizer,
    });

    // Flow Execution Monitoring
    this.httpApi.addRoutes({
      path: ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTIONS, // Query params for filtering
      methods: [apigwv2.HttpMethod.GET],
      integration: executionMonitoringIntegration,
      authorizer: adminAuthorizer,
    });

    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTIONS}/{flowExecutionId}`,
      methods: [apigwv2.HttpMethod.GET],
      integration: executionMonitoringIntegration,
      authorizer: adminAuthorizer,
    });

    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTIONS}/{flowExecutionId}/branch-steps`,
      methods: [apigwv2.HttpMethod.GET],
      integration: executionMonitoringIntegration,
      authorizer: adminAuthorizer,
    });

    // Step Definitions
    const adminStepManagementIntegration = new HttpLambdaIntegration('AdminStepManagementIntegration', adminStepManagementLambda);
    this.httpApi.addRoutes({
      path: ALLMA_ADMIN_API_ROUTES.STEP_DEFINITIONS,
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.GET],
      integration: adminStepManagementIntegration,
      authorizer: adminAuthorizer,
    });
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.STEP_DEFINITIONS}/{stepDefinitionId}`,
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: adminStepManagementIntegration,
      authorizer: adminAuthorizer,
    });

    // Admin Redrive Flow Route (Simple Redrive)
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTIONS}/{flowExecutionId}/redrive`,
      methods: [apigwv2.HttpMethod.POST],
      integration: adminFlowControlIntegration,
      authorizer: adminAuthorizer,
    });

    // Stateful Redrive Route
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.FLOW_EXECUTIONS}/{flowExecutionId}/stateful-redrive`,
      methods: [apigwv2.HttpMethod.POST],
      integration: adminFlowControlIntegration,
      authorizer: adminAuthorizer,
    });

    const dashboardStatsIntegration = new HttpLambdaIntegration('DashboardStatsIntegration', adminDashboardStatsLambda);
    this.httpApi.addRoutes({
      path: ALLMA_ADMIN_API_ROUTES.DASHBOARD_STATS,
      methods: [apigwv2.HttpMethod.GET],
      integration: dashboardStatsIntegration,
      authorizer: adminAuthorizer,
    });

    // Import / Export Routes
    const importExportIntegration = new HttpLambdaIntegration('ImportExportIntegration', adminImportExportLambda);
    this.httpApi.addRoutes({
      path: ALLMA_ADMIN_API_ROUTES.IMPORT,
      methods: [apigwv2.HttpMethod.POST],
      integration: importExportIntegration,
      authorizer: adminAuthorizer,
    });
    this.httpApi.addRoutes({
      path: ALLMA_ADMIN_API_ROUTES.EXPORT,
      methods: [apigwv2.HttpMethod.POST],
      integration: importExportIntegration,
      authorizer: adminAuthorizer,
    });

    // MCP Connection Routes
    const mcpConnectionIntegration = new HttpLambdaIntegration('McpConnectionIntegration', adminMcpConnectionManagementLambda);
    this.httpApi.addRoutes({
      path: ALLMA_ADMIN_API_ROUTES.MCP_CONNECTIONS,
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: mcpConnectionIntegration,
      authorizer: adminAuthorizer,
    });
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.MCP_CONNECTIONS}/{connectionId}`,
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: mcpConnectionIntegration,
      authorizer: adminAuthorizer,
    });
    this.httpApi.addRoutes({
      path: `${ALLMA_ADMIN_API_ROUTES.MCP_CONNECTIONS}/{connectionId}/discover`,
      methods: [apigwv2.HttpMethod.POST],
      integration: mcpConnectionIntegration,
      authorizer: adminAuthorizer,
    });


    // Grant the orchestration role (used by finalizeFlowLambda) permission to invoke the resume API.
    // This is done here to break the circular dependency between the Compute and AdminApi constructs.
    const apiInvokePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:Invoke'],
      resources: [
        cdk.Stack.of(this).formatArn({
          service: 'execute-api',
          resource: `${this.httpApi.apiId}/${props.stageConfig.adminApi.apiMappingKey}/*${ALLMA_ADMIN_API_ROUTES.RESUME}`,
        }),
      ],
    });
    props.orchestrationLambdaRole.addToPolicy(apiInvokePolicy);


    // --- Custom Domain ---
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
  }
}