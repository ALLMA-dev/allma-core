import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { StageConfig } from '@allma/core-cdk';
import { WebAppDeployment } from './constructs/web-app-deployment.js';
import { NagSuppressions } from 'cdk-nag';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cr from 'aws-cdk-lib/custom-resources';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as fs from 'fs';
import { marshall } from '@aws-sdk/util-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { SystemSettings, Commodity, SupplierField } from '@optiroq/types';

export interface OptiroqStageConfig extends StageConfig {
    optiroqApi: {
        domainName: string;
        certificateArn: string;
        hostedZoneId?: string;
        hostedZoneName?: string;
        allowedOrigins: string[]
    },
    optiroqPortal: {
        domainName: string;
        certificateArn: string;
        hostedZoneId?: string;
    }
}

interface OptiroqModuleStackProps extends cdk.StackProps {
    stageConfig: OptiroqStageConfig;
    stageName: string;
    allmaOrchestrationRoleArn: string;
}

export class OptiroqModuleStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: OptiroqModuleStackProps) {
        super(scope, id, props);

        const { stageName, allmaOrchestrationRoleArn, stageConfig } = props;
        const isProd = stageConfig.stage === 'prod';
        const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
        const coreStackExportPrefix = `AllmaPlatform-${stageConfig.stage}`;

        // --- Import Core Allma Resources ---
        const allmaFlowStartQueueArn = cdk.Fn.importValue(`${coreStackExportPrefix}-FlowStartRequestQueueArn`);
        const allmaFlowStartQueueUrl = cdk.Fn.importValue(`${coreStackExportPrefix}-FlowStartRequestQueueUrl`);
        const allmaFlowStartQueue = sqs.Queue.fromQueueArn(this, 'AllmaFlowStartQueue', allmaFlowStartQueueArn);

        // --- Optiroq Data Stores ---
        const entityGraphTable = new dynamodb.Table(this, 'OptiroqEntityGraph', {
            tableName: `OptiroqEntityGraph-${stageName}`,
            partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy,
            pointInTimeRecovery: isProd,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        });

        entityGraphTable.addGlobalSecondaryIndex({
            indexName: 'GSI1',
            partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
        });

        // GSI for querying suppliers by commodity.
        entityGraphTable.addGlobalSecondaryIndex({
            indexName: 'GSI2',
            partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
        });

        // Table for storing currency exchange rates.
        const fxRatesTable = new dynamodb.Table(this, 'OptiroqFxRates', {
            tableName: `OptiroqFxRates-${stageName}`,
            partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy,
            timeToLiveAttribute: 'ttl', // Allows expiring old daily rates automatically.
        });

        const commodityPricesTable = new dynamodb.Table(this, 'OptiroqCommodityPrices', {
            tableName: `OptiroqCommodityPrices-${stageName}`,
            partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy,
        });

        const artefactsBucket = new s3.Bucket(this, 'ArtefactsBucket', {
            bucketName: `optiroq-artefacts-${this.account}-${stageName.toLowerCase()}`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: isProd,
            removalPolicy,
            autoDeleteObjects: !isProd,
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: true,
                ignorePublicAcls: true,
                blockPublicPolicy: false,
                restrictPublicBuckets: false,
            }),
        });

        artefactsBucket.addCorsRule({
            allowedMethods: [
                s3.HttpMethods.GET,
                s3.HttpMethods.POST,
                s3.HttpMethods.PUT,
                s3.HttpMethods.HEAD,
            ],
            allowedOrigins: stageConfig.optiroqApi.allowedOrigins,
            allowedHeaders: ['*'],
            exposedHeaders: ['ETag'],
        });

        // --- Initial Config Seeding (Master Field List & System Settings) ---
        const chunkArray = <T>(array: T[], size: number): T[][] => {
            const chunks: T[][] = [];
            for (let i = 0; i < array.length; i += size) { chunks.push(array.slice(i, i + size)); }
            return chunks;
        };

        // Seed Master Field List
        const masterFieldListPath = path.join(__dirname, '../config/master-fields.json');
        const masterFieldList: any[] = JSON.parse(fs.readFileSync(masterFieldListPath, 'utf8'));
        const masterFieldPutRequests = masterFieldList.map(field => ({
            PutRequest: { Item: marshall({ PK: 'CONFIG#MASTER_FIELD_LIST', SK: `FIELD#${field.key}`, entityType: 'CONFIGURATION_FIELD', ...field }) },
        }));
        chunkArray(masterFieldPutRequests, 25).forEach((chunk, chunkIndex) => {
            const sdkCall: cr.AwsSdkCall = {
                service: 'DynamoDB',
                action: 'batchWriteItem',
                parameters: { RequestItems: { [entityGraphTable.tableName]: chunk } },
                physicalResourceId: cr.PhysicalResourceId.of(`OptiroqMasterFieldListConfig-Chunk${chunkIndex + 1}`),
            };
            const customResource = new cr.AwsCustomResource(this, `MasterFieldListCustomResource-Chunk${chunkIndex + 1}`, {
                onCreate: sdkCall,
                onUpdate: sdkCall,
                logRetention: RetentionDays.ONE_WEEK,
                policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: [entityGraphTable.tableArn] }),
            });
            entityGraphTable.grantWriteData(customResource);
        });

        // Seed Supplier Field List
        const supplierFieldListPath = path.join(__dirname, '../config/supplier-fields.json');
        const supplierFieldList: SupplierField[] = JSON.parse(fs.readFileSync(supplierFieldListPath, 'utf8'));
        const supplierFieldPutRequests = supplierFieldList.map(field => ({
            PutRequest: { Item: marshall({ PK: 'CONFIG#SUPPLIER_FIELD_LIST', SK: `FIELD#${field.key}`, entityType: 'SUPPLIER_FIELD', ...field }) },
        }));
        chunkArray(supplierFieldPutRequests, 25).forEach((chunk, chunkIndex) => {
            const sdkCall: cr.AwsSdkCall = {
                service: 'DynamoDB', action: 'batchWriteItem',
                parameters: { RequestItems: { [entityGraphTable.tableName]: chunk } },
                physicalResourceId: cr.PhysicalResourceId.of(`OptiroqSupplierFieldListConfig-Chunk${chunkIndex + 1}`),
            };
            const customResource = new cr.AwsCustomResource(this, `SupplierFieldListCustomResource-Chunk${chunkIndex + 1}`, {
                onCreate: sdkCall, onUpdate: sdkCall, logRetention: RetentionDays.ONE_WEEK,
                policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: [entityGraphTable.tableArn] }),
            });
            entityGraphTable.grantWriteData(customResource);
        });

        // Seed Commodities List
        // Seed Commodities List (with new categorized structure)
        const commoditiesPath = path.join(__dirname, '../config/commodities.json');
        const categorizedCommodities: { category: string; categoryDescription?: string; commodities: Omit<Commodity, 'PK' | 'SK' | 'entityType' | 'category' | 'categoryDescription'>[] }[] = JSON.parse(fs.readFileSync(commoditiesPath, 'utf8'));

        const commodityPutRequests = categorizedCommodities.flatMap(category =>
            category.commodities.map(commodity => ({
                PutRequest: {
                    Item: marshall({
                        PK: 'CONFIG#COMMODITIES',
                        SK: `COMMODITY#${commodity.commodityId}`,
                        entityType: 'COMMODITY',
                        category: category.category,
                        categoryDescription: category.categoryDescription || null,
                        ...commodity,
                    })
                },
            }))
        );

        chunkArray(commodityPutRequests, 25).forEach((chunk, chunkIndex) => {
            const sdkCall: cr.AwsSdkCall = {
                service: 'DynamoDB', action: 'batchWriteItem',
                parameters: { RequestItems: { [entityGraphTable.tableName]: chunk } },
                physicalResourceId: cr.PhysicalResourceId.of(`OptiroqCommoditiesConfig-Chunk${chunkIndex + 1}`),
            };
            const customResource = new cr.AwsCustomResource(this, `CommoditiesCustomResource-Chunk${chunkIndex + 1}`, {
                onCreate: sdkCall, onUpdate: sdkCall, logRetention: RetentionDays.ONE_WEEK,
                policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: [entityGraphTable.tableArn] }),
            });
            entityGraphTable.grantWriteData(customResource);
        });

        // Seed System Settings for base units from a dedicated config file.
        const systemSettingsPath = path.join(__dirname, '../config/system-settings.json');
        const systemSettingsContent = fs.readFileSync(systemSettingsPath, 'utf8');
        const systemSettingsData = JSON.parse(systemSettingsContent);

        const systemSettings: SystemSettings = {
            PK: 'CONFIG#SYSTEM_SETTINGS',
            SK: 'BASE_UNITS',
            entityType: 'CONFIGURATION',
            ...systemSettingsData,
        };
        const settingsSdkCall: cr.AwsSdkCall = {
            service: 'DynamoDB',
            action: 'putItem',
            parameters: {
                TableName: entityGraphTable.tableName,
                Item: marshall(systemSettings),
            },
            physicalResourceId: cr.PhysicalResourceId.of('OptiroqSystemSettingsConfig-v1'),
        };
        const settingsCustomResource = new cr.AwsCustomResource(this, 'SystemSettingsCustomResource', {
            onCreate: settingsSdkCall,
            onUpdate: settingsSdkCall,
            logRetention: RetentionDays.ONE_WEEK,
            policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: [entityGraphTable.tableArn] }),
        });
        entityGraphTable.grantWriteData(settingsCustomResource);

        // --- Cognito User Pool for Portal ---
        const userPool = new UserPool(this, 'OptiroqUserPool', {
            userPoolName: `OptiroqPortalUsers-${stageName}`,
            selfSignUpEnabled: true,
            signInAliases: { email: true },
            removalPolicy,
        });
        const userPoolClient = new UserPoolClient(this, 'OptiroqUserPoolClient', { userPool });

        // --- FX Rate Fetcher Service ---
        const fxApiKeySecret = secretsmanager.Secret.fromSecretNameV2(this, 'FxApiKeySecret', `OptiroqFxApiKey-${stageName}`);
        const commodityApiKeySecret = secretsmanager.Secret.fromSecretNameV2(this, 'CommodityApiKeySecret', `OptiroqCommodityApiKey-${stageName}`);

        const fxRateFetcherLambda = new NodejsFunction(this, 'FxRateFetcherLambda', {
            functionName: `optiroq-fxratefetcher-${stageName.toLowerCase()}`,
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'handler',
            entry: path.join(__dirname, `../src/optiroq-lambdas/services/fx-rate-fetcher.handler.ts`),
            timeout: cdk.Duration.minutes(1),
            memorySize: 256,
            environment: {
                FX_RATES_TABLE: fxRatesTable.tableName,
                FX_API_KEY_SECRET_ARN: fxApiKeySecret.secretArn,
                FX_API_URL: 'https://v6.exchangerate-api.com/v6',
                BASE_CURRENCY: systemSettings.baseCurrency,
            },
            bundling: { externalModules: ['@aws-sdk/*'] },
        });

        fxRatesTable.grantWriteData(fxRateFetcherLambda);
        fxApiKeySecret.grantRead(fxRateFetcherLambda);

        new events.Rule(this, 'FxRateFetcherSchedule', {
            ruleName: `OptiroqFxRateFetcherSchedule-${stageName}`,
            schedule: events.Schedule.rate(cdk.Duration.days(1)),
            targets: [new targets.LambdaFunction(fxRateFetcherLambda)],
        });
        
        // --- Central IAM Role for Optiroq Lambdas ---
        const optiroqLambdaRole = new iam.Role(this, 'OptiroqLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });
        entityGraphTable.grantReadWriteData(optiroqLambdaRole);
        fxRatesTable.grantReadData(optiroqLambdaRole);
        commodityPricesTable.grantReadData(optiroqLambdaRole);
        artefactsBucket.grantReadWrite(optiroqLambdaRole);
        artefactsBucket.grantPut(optiroqLambdaRole, 'bom-uploads/*');
        artefactsBucket.grantPut(optiroqLambdaRole, 'rfq-uploads/*');
        allmaFlowStartQueue.grantSendMessages(optiroqLambdaRole);
        optiroqLambdaRole.addToPolicy(new iam.PolicyStatement({ actions: ['secretsmanager:GetSecretValue'], resources: ['*'] }));
        optiroqLambdaRole.addToPolicy(new iam.PolicyStatement({ actions: ['textract:*'], resources: ['*'] }));

        const allmaIncomingEmailsBucketName = `allma-incoming-emails-${this.account}-${stageName.toLowerCase()}`;
        const allmaExecutionTracesBucketName = `allma-execution-traces-${this.account}-${stageName.toLowerCase()}`;
        optiroqLambdaRole.addToPolicy(new iam.PolicyStatement({
            sid: 'AllowReadFromAllmaCoreBuckets',
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetObject'],
            resources: [
                `arn:aws:s3:::${allmaIncomingEmailsBucketName}/*`,
                `arn:aws:s3:::${allmaExecutionTracesBucketName}/*`,
            ],
        }));

        // --- Lambda Layer & Factory Function ---
        const optiroqTypesLayer = new lambda.LayerVersion(this, 'OptiroqTypesLayer', {
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../packages/optiroq-types')),
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            description: 'Layer containing @optiroq/types for all Optiroq Lambdas',
        });

        const createLambda = (
            name: string,
            entry: string,
            timeout: cdk.Duration = cdk.Duration.seconds(30),
            environment: { [key: string]: string } = {}
        ): NodejsFunction => {
            return new NodejsFunction(this, `${name}Function`, {
                functionName: `optiroq-${name.toLowerCase()}-${stageName.toLowerCase()}`,
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'handler',
                entry: path.join(__dirname, `../src/optiroq-lambdas/${entry}`),
                role: optiroqLambdaRole,
                timeout,
                memorySize: 512,
                environment: {
                    ENTITY_GRAPH_TABLE: entityGraphTable.tableName,
                    ARTEFACTS_BUCKET: artefactsBucket.bucketName,
                    ALLOWED_ORIGINS: props.stageConfig.optiroqApi.allowedOrigins.join(','),
                    ...environment,
                },
                layers: [optiroqTypesLayer],
                bundling: {
                    externalModules: ['@optiroq/types'],
                    minify: true,
                    sourceMap: true
                },
            });
        };

        // --- Lambda Definitions ---
        const parseAndCorrelateEmailLambda = createLambda('ParseAndCorrelateEmail', 'allma-steps/communication/parse-and-correlate-email.step.ts');
        const parseEmailAndLoadContextLambda = createLambda('ParseEmailAndLoadContext', 'allma-steps/process-supplier-quote/parse-email-and-load-context.step.ts');
        const sanitizeQuoteDocumentStepLambda = createLambda('SanitizeQuoteDocumentStep', 'allma-steps/process-supplier-quote/sanitize-quote-document.step.ts');
        const normalizeQuoteDataStepLambda = createLambda('NormalizeQuoteDataStep', 'allma-steps/process-supplier-quote/normalize-quote-data.step.ts', cdk.Duration.seconds(45), {
            FX_RATES_TABLE: fxRatesTable.tableName,
        });
        const generateComparisonBoardStepLambda = createLambda('GenerateComparisonBoardStep', 'allma-steps/generate-comparison-board.step.ts', cdk.Duration.minutes(1));
        const ruleBasedAnomalyCheckLambda = createLambda('RuleBasedAnomalyCheck', 'allma-steps/process-supplier-quote/rule-based-anomaly-check.step.ts');
        const riskScoreCalculationLambda = createLambda('RiskScoreCalculation', 'allma-steps/process-supplier-quote/risk-score-calculation.step.ts');
        const composeBatchWriteLambda = createLambda('ComposeBatchWrite', 'allma-steps/process-supplier-quote/compose-batch-write.step.ts');

        const extractWorkbookDataLambda = createLambda('ExtractWorkbookData', 'allma-steps/process-bom-upload/extract-workbook-data.step.ts', cdk.Duration.minutes(3));
        const extractDataFromBomLambda = createLambda('ExtractDataFromBom', 'allma-steps/process-bom-upload/extract-data-from-bom.step.ts');
        const mapAndValidateBomDataLambda = createLambda('MapAndValidateBomData', 'allma-steps/process-bom-upload/map-and-validate-bom-data.step.ts', cdk.Duration.minutes(1), {
            FX_RATES_TABLE: fxRatesTable.tableName,
        });
        const updateProjectWithBomDataLambda = createLambda('UpdateProjectWithBomData', 'allma-steps/process-bom-upload/update-project-with-bom-data.step.ts');
        const persistClassifiedPartLambda = createLambda('PersistClassifiedPart', 'allma-steps/process-bom-upload/persist-classified-part.step.ts', cdk.Duration.seconds(45));

        // Supplier Import Lambdas
        const mapAndValidateSupplierDataLambda = createLambda('MapAndValidateSupplierData', 'allma-steps/supplier-import/map-and-validate-supplier-data.step.ts', cdk.Duration.minutes(1));
        const reconcileSupplierCommoditiesLambda = createLambda('ReconcileSupplierCommodities', 'allma-steps/supplier-import/reconcile-supplier-commodities.step.ts');
        const persistSupplierLambda = createLambda('PersistSupplier', 'allma-steps/supplier-import/persist-supplier.step.ts', cdk.Duration.seconds(45));

        // RFQ Upload Flow Lambdas
        const sanitizeRfqDocumentExcelLambda = createLambda('SanitizeRfqDocumentExcel', 'allma-steps/rfq-upload/sanitize-rfq-document-excel.step.ts', cdk.Duration.minutes(2));
        const sanitizeRfqDocumentOcrLambda = createLambda('SanitizeRfqDocumentOcr', 'allma-steps/rfq-upload/sanitize-rfq-document-ocr.step.ts', cdk.Duration.minutes(2));
        const sanitizeRfqDocumentPptLambda = createLambda('SanitizeRfqDocumentPpt', 'allma-steps/rfq-upload/sanitize-rfq-document-ppt.step.ts');
        const validateAndSaveRfqDraftLambda = createLambda('ValidateAndSaveRfqDraft', 'allma-steps/rfq-upload/validate-and-save-rfq-draft.step.ts', cdk.Duration.minutes(1));

        const generateAttachmentLinksLambda = createLambda('GenerateAttachmentLinks', 'allma-steps/communication/generate-attachment-links.step.ts');


        const getViewApiHandler = createLambda('GetViewApiHandler', 'api/get-view.handler.ts', cdk.Duration.seconds(30), {
            FX_RATES_TABLE: fxRatesTable.tableName,
            COMMODITY_PRICES_TABLE: commodityPricesTable.tableName,
        });
        const postCommandApiHandler = createLambda('PostCommandApiHandler', 'api/post-command.handler.ts', cdk.Duration.seconds(30), {
            ALLMA_START_QUEUE_URL: allmaFlowStartQueueUrl,
            FX_RATES_TABLE: fxRatesTable.tableName,
        });
        const getUploadUrlApiHandler = createLambda('GetUploadUrlApiHandler', 'api/get-upload-url.handler.ts');
        const updateProjectAggregatesStreamLambda = createLambda('UpdateProjectAggregatesStream', 'streams/update-project-aggregates.stream.ts');
        updateProjectAggregatesStreamLambda.addEventSource(new cdk.aws_lambda_event_sources.DynamoEventSource(entityGraphTable, {
            startingPosition: lambda.StartingPosition.LATEST,
        }));

        // --- API Gateway Setup ---
        const authorizer = new HttpUserPoolAuthorizer('OptiroqCognitoAuthorizer', userPool, { userPoolClients: [userPoolClient] });
        const httpApi = new apigw.HttpApi(this, 'OptiroqHttpApi', { apiName: `OptiroqApi-${stageName}`, defaultAuthorizer: authorizer, createDefaultStage: false });
        const apiStage = new apigw.HttpStage(this, 'OptiroqApiStage', { httpApi, stageName: stageName, autoDeploy: true });
        const certificate = acm.Certificate.fromCertificateArn(this, 'OptiroqApiCert', stageConfig.optiroqApi.certificateArn);
        const domainName = new apigw.DomainName(this, 'OptiroqApiCustomDomain', { domainName: stageConfig.optiroqApi.domainName, certificate });
        new apigw.ApiMapping(this, 'OptiroqApiMapping', { api: httpApi, domainName: domainName, stage: apiStage });


        if (stageConfig.optiroqApi.hostedZoneId && stageConfig.optiroqApi.hostedZoneName) {
            const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'OptiroqApiHostedZone', {
                hostedZoneId: stageConfig.optiroqApi.hostedZoneId,
                zoneName: stageConfig.optiroqApi.hostedZoneName,
            });
            new route53.ARecord(this, 'OptiroqApiDnsRecord', { zone: zone, recordName: stageConfig.optiroqApi.domainName, target: route53.RecordTarget.fromAlias(new route53Targets.ApiGatewayv2DomainProperties(domainName.regionalDomainName, domainName.regionalHostedZoneId)) });
        }

        const optiroqApiUrl = `https://${domainName.name}`;
        httpApi.addRoutes({ path: '/views/{viewName}', methods: [apigw.HttpMethod.GET], integration: new HttpLambdaIntegration('GetViewListIntegration', getViewApiHandler) });
        httpApi.addRoutes({ path: '/views/{viewName}/{id}', methods: [apigw.HttpMethod.GET], integration: new HttpLambdaIntegration('GetViewIntegration', getViewApiHandler) });
        httpApi.addRoutes({ path: '/commands/{entityType}', methods: [apigw.HttpMethod.POST], integration: new HttpLambdaIntegration('PostCommandCreationIntegration', postCommandApiHandler) });
        httpApi.addRoutes({ path: '/commands/{entityType}/{id}', methods: [apigw.HttpMethod.POST], integration: new HttpLambdaIntegration('PostCommandUpdateIntegration', postCommandApiHandler) });
        httpApi.addRoutes({ path: '/files/upload-url', methods: [apigw.HttpMethod.POST], integration: new HttpLambdaIntegration('GetUploadUrlIntegration', getUploadUrlApiHandler), authorizer: authorizer });
        
        // --- Frontend Portal Deployment ---
        const webApp = new WebAppDeployment(this, 'PortalWebApp', {
            deploymentId: `OptiroqPortal-${stageName}`,
            assetPath: path.join(__dirname, '../src/portal-ui/dist'),
            runtimeConfig: {
                VITE_AWS_REGION: this.region,
                VITE_COGNITO_USER_POOL_ID: userPool.userPoolId,
                VITE_COGNITO_USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                VITE_API_BASE_URL: optiroqApiUrl,
            },
            domainName: stageConfig.optiroqPortal.domainName,
            certificateArn: stageConfig.optiroqPortal.certificateArn
        });

        // --- CORS Configuration ---
        const portalCloudFrontUrl = `https://${webApp.distribution.distributionDomainName}`;
        const finalOrigins = Array.from(new Set([...stageConfig.optiroqApi.allowedOrigins, portalCloudFrontUrl]));
        const cfnApi = httpApi.node.defaultChild as apigw.CfnApi;
        cfnApi.addPropertyOverride('CorsConfiguration', {
            AllowOrigins: finalOrigins,
            AllowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            AllowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token', 'X-Amz-User-Agent'],
            MaxAge: 3600,
        });
        const allowedOriginsString = finalOrigins.join(',');
        [getViewApiHandler, postCommandApiHandler, getUploadUrlApiHandler].forEach(fn => {
            fn.addEnvironment('ALLOWED_ORIGINS', allowedOriginsString);
        });

        // --- Cross-Stack Permissions ---
        const allmaOrchestrationRole = iam.Role.fromRoleArn(this, 'AllmaOrchestrationRole', allmaOrchestrationRoleArn);
        const optiroqCustomStepLambdas = [
            generateAttachmentLinksLambda,
            parseAndCorrelateEmailLambda,
            parseEmailAndLoadContextLambda,
            sanitizeQuoteDocumentStepLambda, normalizeQuoteDataStepLambda, generateComparisonBoardStepLambda,
            extractWorkbookDataLambda, extractDataFromBomLambda, mapAndValidateBomDataLambda,
            updateProjectWithBomDataLambda, persistClassifiedPartLambda,
            // new quote processing lambdas
            ruleBasedAnomalyCheckLambda, riskScoreCalculationLambda, composeBatchWriteLambda,
            // supplier import lambdas
            mapAndValidateSupplierDataLambda, reconcileSupplierCommoditiesLambda, persistSupplierLambda,
            // RFQ upload lambdas
            sanitizeRfqDocumentExcelLambda, sanitizeRfqDocumentOcrLambda,
            sanitizeRfqDocumentPptLambda, validateAndSaveRfqDraftLambda,
        ];
        new iam.Policy(this, 'AllmaOptiroqInvokePolicy', {
            roles: [allmaOrchestrationRole],
            statements: [
                new iam.PolicyStatement({
                    sid: 'AllowAllmaToInvokeOptiroqLambdas',
                    effect: iam.Effect.ALLOW,
                    actions: ['lambda:InvokeFunction'],
                    resources: optiroqCustomStepLambdas.map(fn => fn.functionArn),
                }),
            ],
        });

        // --- CDK Outputs ---
        new cdk.CfnOutput(this, 'OptiroqEntityGraphTableName', { value: entityGraphTable.tableName });
        new cdk.CfnOutput(this, 'OptiroqArtefactsBucketName', { value: artefactsBucket.bucketName });
        new cdk.CfnOutput(this, 'OptiroqApiGatewayUrl', { value: domainName.regionalDomainName });
        new cdk.CfnOutput(this, 'OptiroqPortalUrl', { value: webApp.distribution.distributionDomainName });
        new cdk.CfnOutput(this, 'OptiroqFxRatesTableName', { value: fxRatesTable.tableName });
        new cdk.CfnOutput(this, 'OptiroqCommodityPricesTableName', { value: commodityPricesTable.tableName });

        // --- CDK Nag Suppressions ---
        NagSuppressions.addStackSuppressions(this, [{ id: 'AwsSolutions-IAM4', reason: 'Using AWS managed policies for simplicity.' }]);
        NagSuppressions.addStackSuppressions(this, [{ id: 'AwsSolutions-IAM5', reason: 'Wildcard permissions are used for brevity and within controlled scope.' }]);
    }
}