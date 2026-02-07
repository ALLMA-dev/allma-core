import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';

export interface WebAppDeploymentProps {
    assetPath: string;
    runtimeConfig: Record<string, any>;
    deploymentId: string;

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

export class WebAppDeployment extends Construct {
    public readonly distribution: cloudfront.Distribution;

    constructor(scope: Construct, id: string, props: WebAppDeploymentProps) {
        super(scope, id);

        const assetsBucket = new s3.Bucket(this, `${props.deploymentId}AssetsBucket`, {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
        });

        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, `${props.deploymentId}OAI`);
        assetsBucket.grantRead(originAccessIdentity);

        let distributionProps: cloudfront.DistributionProps = {
            defaultRootObject: 'index.html',
            defaultBehavior: {
                origin: new origins.S3Origin(assetsBucket, { originAccessIdentity }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                compress: true,
            },
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
            ],
        };

        // Add custom domain configuration if provided
        if (props.domainName && props.certificateArn) {
            const certificate = acm.Certificate.fromCertificateArn(this, `${props.deploymentId}Certificate`, props.certificateArn);
            // @ts-ignore
            distributionProps.domainNames = [props.domainName];
            // @ts-ignore
            distributionProps.certificate = certificate;
        }

        this.distribution = new cloudfront.Distribution(this, `${props.deploymentId}Distribution`, distributionProps);

        // Create a Route 53 alias record if a custom domain is configured
        if (props.domainName && props.hostedZoneId) {
            const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, `${props.deploymentId}HostedZone`, {
                hostedZoneId: props.hostedZoneId,
                zoneName: props.domainName, // User must provide the correct zone name for the given ID.
            });

            new route53.ARecord(this, `${props.deploymentId}AliasRecord`, {
                zone: hostedZone,
                target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(this.distribution)),
                recordName: props.domainName,
            });
        }

        const indexPath = path.join(props.assetPath, 'index.html');
        if (!fs.existsSync(indexPath)) {
            throw new Error(`The specified assetPath "${props.assetPath}" does not contain an index.html file.`);
        }
        const indexHtmlContent = fs.readFileSync(indexPath, 'utf8');

        const configInjectorRole = new iam.Role(this, `${props.deploymentId}ConfigInjectorRole`, {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
            ],
        });
        assetsBucket.grantPut(configInjectorRole, 'index.html');

        const configInjectorLambda = new lambdaNodejs.NodejsFunction(this, `${props.deploymentId}ConfigInjectorLambda`, {
            entry: path.join(__dirname, '../../src/lambda-handlers/config-injector.handler.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            role: configInjectorRole,
            timeout: cdk.Duration.minutes(1),
            bundling: {
                minify: true,
                sourceMap: true,
                externalModules: ['@aws-sdk/client-s3'],
            },
        });

        const configInjector = new cdk.CustomResource(this, `${props.deploymentId}ConfigInjector`, {
            serviceToken: configInjectorLambda.functionArn,
            properties: {
                DestinationBucketName: assetsBucket.bucketName,
                IndexHtmlContent: indexHtmlContent,
                RuntimeConfig: props.runtimeConfig,
                UpdateTrigger: crypto.createHash('md5').update(indexHtmlContent + JSON.stringify(props.runtimeConfig)).digest('hex'),
            },
        });

        new s3deploy.BucketDeployment(this, `${props.deploymentId}AssetDeployment`, {
            sources: [s3deploy.Source.asset(props.assetPath)],
            destinationBucket: assetsBucket,
            distribution: this.distribution,
            distributionPaths: ['/*'],
            exclude: ['index.html'],
        });

        configInjector.node.addDependency(assetsBucket);

        new cdk.CfnOutput(this, `${props.deploymentId}WebAppUrl`, {
            value: `https://${this.distribution.distributionDomainName}`,
            description: `The URL for the ${props.deploymentId} web application.`,
        });
    }
}