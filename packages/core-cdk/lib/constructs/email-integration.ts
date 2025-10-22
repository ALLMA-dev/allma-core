import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sesActions from 'aws-cdk-lib/aws-ses-actions';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ENV_VAR_NAMES, ALLMA_ADMIN_API_ROUTES } from '@allma/core-types';
import { StageConfig } from '../config/stack-config.js';

const __filename_email = fileURLToPath(import.meta.url);
const __dirname_email = dirname(__filename_email);

interface EmailIntegrationProps {
    stageConfig: StageConfig;
    emailMappingTable: dynamodb.Table; // FIX: Use concrete class instead of interface
    flowStartQueue: sqs.IQueue;
    httpApi: apigwv2.HttpApi; // FIX: Use concrete class instead of interface
}

/**
 * Encapsulates all AWS resources for receiving emails via SES and triggering flows.
 */
export class EmailIntegration extends Construct {
    constructor(scope: Construct, id: string, props: EmailIntegrationProps) {
        super(scope, id);

        const { stageConfig, emailMappingTable, flowStartQueue, httpApi } = props;

        // 1. S3 Bucket to store incoming emails
        const incomingEmailsBucket = new s3.Bucket(this, 'IncomingEmailsBucket', {
            bucketName: `allma-incoming-emails-${cdk.Aws.ACCOUNT_ID}-${stageConfig.stage}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            lifecycleRules: [{ expiration: cdk.Duration.days(7) }],
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: stageConfig.stage !== 'prod',
        });

        // 2. IAM Role for the Email Ingress Lambda
        const emailIngressRole = new iam.Role(this, 'EmailIngressLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: `IAM Role for ALLMA Email Ingress Lambda (${stageConfig.stage})`,
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });

        // Grant necessary permissions to the role
        incomingEmailsBucket.grantRead(emailIngressRole);
        emailMappingTable.grantReadData(emailIngressRole);
        flowStartQueue.grantSendMessages(emailIngressRole);

        // Grant permission to invoke the public /resume endpoint
        emailIngressRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['execute-api:Invoke'],
            resources: [
              cdk.Stack.of(this).formatArn({
                service: 'execute-api',
                resource: `${httpApi.apiId}/*/*${ALLMA_ADMIN_API_ROUTES.RESUME}`,
              }),
            ],
          }));

        // 3. Lambda function to process emails
        const emailIngressLambda = new lambdaNodejs.NodejsFunction(this, 'EmailIngressLambda', {
            functionName: `AllmaEmailIngress-${stageConfig.stage}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'handler',
            entry: path.join(__dirname_email, `../../../dist-logic/allma-flows/email-ingress.ts`),
            role: emailIngressRole,
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: {
                [ENV_VAR_NAMES.STAGE_NAME]: stageConfig.stage,
                [ENV_VAR_NAMES.LOG_LEVEL]: stageConfig.logging.logLevel,
                [ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_URL]: flowStartQueue.queueUrl,
                [ENV_VAR_NAMES.ALLMA_RESUME_API_URL]: `${httpApi.apiEndpoint}/${stageConfig.adminApi.apiMappingKey}${ALLMA_ADMIN_API_ROUTES.RESUME}`,
                'EMAIL_TO_FLOW_MAPPING_TABLE_NAME': emailMappingTable.tableName,
            },
            bundling: {
                minify: true,
                sourceMap: true,
                externalModules: ['aws-sdk', '@aws-sdk/client-s3', '@aws-sdk/client-dynamodb', '@aws-sdk/client-sqs'],
            },
            architecture: lambda.Architecture.ARM_64,
        });

        // 4. SES Receipt Rule
        // A rule set must exist. We create one and make it active if it doesn't already exist.
        const ruleSet = new ses.ReceiptRuleSet(this, 'AllmaReceiptRuleSet', {
            receiptRuleSetName: `AllmaRuleSet-${stageConfig.stage}`,
            dropSpam: true,
        });

        const rule = ruleSet.addRule('AllmaEmailIngressRule', {
            recipients: [stageConfig.ses!.verifiedDomain],
            enabled: true,
            actions: [
                // Action 1: Store the email in S3
                new sesActions.S3({
                    bucket: incomingEmailsBucket,
                    objectKeyPrefix: 'inbound/',
                }),
                // Action 2: Trigger our Lambda function
                new sesActions.Lambda({
                    function: emailIngressLambda,
                    invocationType: sesActions.LambdaInvocationType.EVENT, // Asynchronous
                }),
            ],
        });
        
        // FIX: Construct the rule ARN manually for the permission
        const ruleArn = cdk.Stack.of(this).formatArn({
            service: 'ses',
            resource: `receipt-rule-set/${ruleSet.receiptRuleSetName}/receipt-rule/${rule.receiptRuleName}`,
        });

        // Ensure the Lambda has permission to be invoked by SES
        emailIngressLambda.addPermission('AllowSesInvoke', {
            principal: new iam.ServicePrincipal('ses.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceAccount: cdk.Aws.ACCOUNT_ID,
            sourceArn: ruleArn,
        });

        // Grant SES permission to write to our S3 bucket
        incomingEmailsBucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:PutObject'],
            resources: [incomingEmailsBucket.arnForObjects('*')],
            principals: [new iam.ServicePrincipal('ses.amazonaws.com')],
            conditions: {
                StringEquals: {
                    'aws:SourceAccount': cdk.Aws.ACCOUNT_ID,
                },
            },
        }));
    }
}