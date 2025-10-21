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
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface WebAppDeploymentProps {
  /**
   * The path to the directory containing the built static assets of the web application.
   */
  assetPath: string;

  /**
   * The runtime configuration object that will be injected into the index.html.
   * This will be available on `window.runtimeConfig`.
   */
  runtimeConfig: Record<string, any>;

  /**
   * A unique identifier for the deployment, used to name resources.
   */
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

/**
 * A generic CDK construct for deploying a Single Page Application (SPA) to S3 and CloudFront.
 *
 * This construct handles:
 * - Creating an S3 bucket for static assets.
 * - Creating a CloudFront distribution to serve the assets with caching.
 * - Using an Origin Access Identity (OAI) to keep the S3 bucket private.
 * - Securely injecting a runtime configuration into the `index.html` file using a custom resource.
 * - Deploying the static assets to the S3 bucket.
 */
export class WebAppDeployment extends Construct {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: WebAppDeploymentProps) {
    super(scope, id);

    // 1. Create the S3 bucket for the web app's static assets
    const assetsBucket = new s3.Bucket(this, `${props.deploymentId}AssetsBucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // 2. Create an Origin Access Identity (OAI) to allow CloudFront to access the S3 bucket
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, `${props.deploymentId}OAI`);
    assetsBucket.grantRead(originAccessIdentity);

    // 3. Create the CloudFront distribution
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
    if (props.domainName && props.certificateArn && props.hostedZoneId) {
      const certificate = acm.Certificate.fromCertificateArn(this, `${props.deploymentId}Certificate`, props.certificateArn);
      distributionProps = {
        ...distributionProps,
        domainNames: [props.domainName],
        certificate,
      };
    }

    this.distribution = new cloudfront.Distribution(this, `${props.deploymentId}Distribution`, distributionProps);

    // Create a Route 53 alias record if a custom domain is configured
    if (props.domainName && props.hostedZoneId) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, `${props.deploymentId}HostedZone`, {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.domainName,
      });

      new route53.ARecord(this, `${props.deploymentId}AliasRecord`, {
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(this.distribution)),
        recordName: props.domainName,
      });
    }

    // 4. Securely inject the runtime configuration into index.html using a Lambda-backed custom resource
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
    // Grant least-privilege permission to write only the index.html file
    assetsBucket.grantPut(configInjectorRole, 'index.html');

    const configInjectorLambda = new lambdaNodejs.NodejsFunction(this, `${props.deploymentId}ConfigInjectorLambda`, {
      entry: path.resolve(__dirname, '..', '..', '..', 'lib', 'lambda-handlers', 'config-injector.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
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
        // Trigger an update whenever the source index.html or the config changes.
        UpdateTrigger: crypto.createHash('md5').update(indexHtmlContent + JSON.stringify(props.runtimeConfig)).digest('hex'),
      },
    });


    // 5. Deploy the rest of the static assets to the S3 bucket
    new s3deploy.BucketDeployment(this, `${props.deploymentId}AssetDeployment`, {
      sources: [s3deploy.Source.asset(props.assetPath)],
      destinationBucket: assetsBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      exclude: ['index.html'], // Exclude index.html as it's handled by the custom resource
    });

    // Ensure the bucket exists before the custom resource tries to write to it.
    configInjector.node.addDependency(assetsBucket);

    // Output the CloudFront distribution domain name
    new cdk.CfnOutput(this, `${props.deploymentId}WebAppUrl`, {
      value: `https://${this.distribution.distributionDomainName}`,
      description: `The URL for the ${props.deploymentId} web application.`,
    });
  }
}