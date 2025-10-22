"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAppDeployment = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const constructs_1 = require("constructs");
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const route53Targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
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
class WebAppDeployment extends constructs_1.Construct {
    distribution;
    constructor(scope, id, props) {
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
        let distributionProps = {
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
            entry: path.join(__dirname, '..', 'lambda-handlers', 'config-injector.ts'),
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
exports.WebAppDeployment = WebAppDeployment;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLWFwcC1kZXBsb3ltZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2ViLWFwcC1kZXBsb3ltZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLDJDQUF1QztBQUN2Qyx1REFBeUM7QUFDekMsdUVBQXlEO0FBQ3pELDRFQUE4RDtBQUM5RCx3RUFBMEQ7QUFDMUQseURBQTJDO0FBQzNDLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsK0NBQWlDO0FBQ2pDLGlFQUFtRDtBQUNuRCxnRkFBa0U7QUFDbEUsd0VBQTBEO0FBQzFELDRFQUE4RDtBQUM5RCwrREFBaUQ7QUF5Q2pEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQWEsZ0JBQWlCLFNBQVEsc0JBQVM7SUFDN0IsWUFBWSxDQUEwQjtJQUV0RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTRCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsMERBQTBEO1FBQzFELE1BQU0sWUFBWSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsWUFBWSxjQUFjLEVBQUU7WUFDNUUsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtTQUMzQyxDQUFDLENBQUM7UUFFSCx3RkFBd0Y7UUFDeEYsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsWUFBWSxLQUFLLENBQUMsQ0FBQztRQUNuRyxZQUFZLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7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R0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7YUFDckg7U0FDRixDQUFDLENBQUM7UUFHSCwyREFBMkQ7UUFDM0QsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFlBQVksaUJBQWlCLEVBQUU7WUFDMUUsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pELGlCQUFpQixFQUFFLFlBQVk7WUFDL0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLGlCQUFpQixFQUFFLENBQUMsSUFBSSxDQUFDO1lBQ3pCLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLDREQUE0RDtTQUN0RixDQUFDLENBQUM7UUFFSCw0RUFBNEU7UUFDNUUsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFaEQsaURBQWlEO1FBQ2pELElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsWUFBWSxXQUFXLEVBQUU7WUFDeEQsS0FBSyxFQUFFLFdBQVcsSUFBSSxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsRUFBRTtZQUM1RCxXQUFXLEVBQUUsbUJBQW1CLEtBQUssQ0FBQyxZQUFZLG1CQUFtQjtTQUN0RSxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE3SEQsNENBNkhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xyXG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcclxuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XHJcbmltcG9ydCAqIGFzIHJvdXRlNTNUYXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xyXG5pbXBvcnQgKiBhcyBhY20gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XHJcbmltcG9ydCAqIGFzIGxhbWJkYU5vZGVqcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV2ViQXBwRGVwbG95bWVudFByb3BzIHtcclxuICAvKipcclxuICAgKiBUaGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IGNvbnRhaW5pbmcgdGhlIGJ1aWx0IHN0YXRpYyBhc3NldHMgb2YgdGhlIHdlYiBhcHBsaWNhdGlvbi5cclxuICAgKi9cclxuICBhc3NldFBhdGg6IHN0cmluZztcclxuXHJcbiAgLyoqXHJcbiAgICogVGhlIHJ1bnRpbWUgY29uZmlndXJhdGlvbiBvYmplY3QgdGhhdCB3aWxsIGJlIGluamVjdGVkIGludG8gdGhlIGluZGV4Lmh0bWwuXHJcbiAgICogVGhpcyB3aWxsIGJlIGF2YWlsYWJsZSBvbiBgd2luZG93LnJ1bnRpbWVDb25maWdgLlxyXG4gICAqL1xyXG4gIHJ1bnRpbWVDb25maWc6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcblxyXG4gIC8qKlxyXG4gICAqIEEgdW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBkZXBsb3ltZW50LCB1c2VkIHRvIG5hbWUgcmVzb3VyY2VzLlxyXG4gICAqL1xyXG4gIGRlcGxveW1lbnRJZDogc3RyaW5nO1xyXG5cclxuICAvKipcclxuICAgKiBUaGUgY3VzdG9tIGRvbWFpbiBuYW1lIGZvciB0aGUgd2ViIGFwcGxpY2F0aW9uIChlLmcuLCBgYWRtaW4uZXhhbXBsZS5jb21gKS5cclxuICAgKiBJZiBwcm92aWRlZCwgYGNlcnRpZmljYXRlQXJuYCBhbmQgYGhvc3RlZFpvbmVJZGAgbXVzdCBhbHNvIGJlIHByb3ZpZGVkLlxyXG4gICAqIEBkZWZhdWx0IC0gTm8gY3VzdG9tIGRvbWFpbiBpcyBjb25maWd1cmVkLlxyXG4gICAqL1xyXG4gIGRvbWFpbk5hbWU/OiBzdHJpbmc7XHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBBUk4gb2YgdGhlIEFDTSBjZXJ0aWZpY2F0ZSBmb3IgdGhlIGN1c3RvbSBkb21haW4uXHJcbiAgICogUmVxdWlyZWQgaWYgYGRvbWFpbk5hbWVgIGlzIHByb3ZpZGVkLlxyXG4gICAqIEBkZWZhdWx0IC0gTm8gY3VzdG9tIGRvbWFpbiBpcyBjb25maWd1cmVkLlxyXG4gICAqL1xyXG4gIGNlcnRpZmljYXRlQXJuPzogc3RyaW5nO1xyXG5cclxuICAvKipcclxuICAgKiBUaGUgSUQgb2YgdGhlIFJvdXRlIDUzIGhvc3RlZCB6b25lIGZvciB0aGUgY3VzdG9tIGRvbWFpbi5cclxuICAgKiBSZXF1aXJlZCBpZiBgZG9tYWluTmFtZWAgaXMgcHJvdmlkZWQuXHJcbiAgICogQGRlZmF1bHQgLSBObyBjdXN0b20gZG9tYWluIGlzIGNvbmZpZ3VyZWQuXHJcbiAgICovXHJcbiAgaG9zdGVkWm9uZUlkPzogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogQSBnZW5lcmljIENESyBjb25zdHJ1Y3QgZm9yIGRlcGxveWluZyBhIFNpbmdsZSBQYWdlIEFwcGxpY2F0aW9uIChTUEEpIHRvIFMzIGFuZCBDbG91ZEZyb250LlxyXG4gKlxyXG4gKiBUaGlzIGNvbnN0cnVjdCBoYW5kbGVzOlxyXG4gKiAtIENyZWF0aW5nIGFuIFMzIGJ1Y2tldCBmb3Igc3RhdGljIGFzc2V0cy5cclxuICogLSBDcmVhdGluZyBhIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIHRvIHNlcnZlIHRoZSBhc3NldHMgd2l0aCBjYWNoaW5nLlxyXG4gKiAtIFVzaW5nIGFuIE9yaWdpbiBBY2Nlc3MgSWRlbnRpdHkgKE9BSSkgdG8ga2VlcCB0aGUgUzMgYnVja2V0IHByaXZhdGUuXHJcbiAqIC0gU2VjdXJlbHkgaW5qZWN0aW5nIGEgcnVudGltZSBjb25maWd1cmF0aW9uIGludG8gdGhlIGBpbmRleC5odG1sYCBmaWxlIHVzaW5nIGEgY3VzdG9tIHJlc291cmNlLlxyXG4gKiAtIERlcGxveWluZyB0aGUgc3RhdGljIGFzc2V0cyB0byB0aGUgUzMgYnVja2V0LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFdlYkFwcERlcGxveW1lbnQgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBkaXN0cmlidXRpb246IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogV2ViQXBwRGVwbG95bWVudFByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIC8vIDEuIENyZWF0ZSB0aGUgUzMgYnVja2V0IGZvciB0aGUgd2ViIGFwcCdzIHN0YXRpYyBhc3NldHNcclxuICAgIGNvbnN0IGFzc2V0c0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgYCR7cHJvcHMuZGVwbG95bWVudElkfUFzc2V0c0J1Y2tldGAsIHtcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIDIuIENyZWF0ZSBhbiBPcmlnaW4gQWNjZXNzIElkZW50aXR5IChPQUkpIHRvIGFsbG93IENsb3VkRnJvbnQgdG8gYWNjZXNzIHRoZSBTMyBidWNrZXRcclxuICAgIGNvbnN0IG9yaWdpbkFjY2Vzc0lkZW50aXR5ID0gbmV3IGNsb3VkZnJvbnQuT3JpZ2luQWNjZXNzSWRlbnRpdHkodGhpcywgYCR7cHJvcHMuZGVwbG95bWVudElkfU9BSWApO1xyXG4gICAgYXNzZXRzQnVja2V0LmdyYW50UmVhZChvcmlnaW5BY2Nlc3NJZGVudGl0eSk7XHJcblxyXG4gICAgLy8gMy4gQ3JlYXRlIHRoZSBDbG91ZEZyb250IGRpc3RyaWJ1dGlvblxyXG4gICAgbGV0IGRpc3RyaWJ1dGlvblByb3BzOiBjbG91ZGZyb250LkRpc3RyaWJ1dGlvblByb3BzID0ge1xyXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxyXG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcclxuICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKGFzc2V0c0J1Y2tldCwgeyBvcmlnaW5BY2Nlc3NJZGVudGl0eSB9KSxcclxuICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcclxuICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcclxuICAgICAgICBjb21wcmVzczogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXHJcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcclxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXHJcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcclxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH07XHJcblxyXG4gICAgLy8gQWRkIGN1c3RvbSBkb21haW4gY29uZmlndXJhdGlvbiBpZiBwcm92aWRlZFxyXG4gICAgaWYgKHByb3BzLmRvbWFpbk5hbWUgJiYgcHJvcHMuY2VydGlmaWNhdGVBcm4pIHtcclxuICAgICAgY29uc3QgY2VydGlmaWNhdGUgPSBhY20uQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsIGAke3Byb3BzLmRlcGxveW1lbnRJZH1DZXJ0aWZpY2F0ZWAsIHByb3BzLmNlcnRpZmljYXRlQXJuKTtcclxuICAgICAgLy8gQHRzLWlnbm9yZVxyXG4gICAgICBkaXN0cmlidXRpb25Qcm9wcy5kb21haW5OYW1lcyA9IFtwcm9wcy5kb21haW5OYW1lXTtcclxuICAgICAgLy8gQHRzLWlnbm9yZVxyXG4gICAgICBkaXN0cmlidXRpb25Qcm9wcy5jZXJ0aWZpY2F0ZSA9IGNlcnRpZmljYXRlO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsIGAke3Byb3BzLmRlcGxveW1lbnRJZH1EaXN0cmlidXRpb25gLCBkaXN0cmlidXRpb25Qcm9wcyk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgUm91dGUgNTMgYWxpYXMgcmVjb3JkIGlmIGEgY3VzdG9tIGRvbWFpbiBpcyBjb25maWd1cmVkXHJcbiAgICBpZiAocHJvcHMuZG9tYWluTmFtZSAmJiBwcm9wcy5ob3N0ZWRab25lSWQpIHtcclxuICAgICAgY29uc3QgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tSG9zdGVkWm9uZUF0dHJpYnV0ZXModGhpcywgYCR7cHJvcHMuZGVwbG95bWVudElkfUhvc3RlZFpvbmVgLCB7XHJcbiAgICAgICAgaG9zdGVkWm9uZUlkOiBwcm9wcy5ob3N0ZWRab25lSWQsXHJcbiAgICAgICAgem9uZU5hbWU6IHByb3BzLmRvbWFpbk5hbWUsIC8vIFVzZXIgbXVzdCBwcm92aWRlIHRoZSBjb3JyZWN0IHpvbmUgbmFtZSBmb3IgdGhlIGdpdmVuIElELlxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgYCR7cHJvcHMuZGVwbG95bWVudElkfUFsaWFzUmVjb3JkYCwge1xyXG4gICAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXHJcbiAgICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMobmV3IHJvdXRlNTNUYXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQodGhpcy5kaXN0cmlidXRpb24pKSxcclxuICAgICAgICByZWNvcmROYW1lOiBwcm9wcy5kb21haW5OYW1lLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA0LiBTZWN1cmVseSBpbmplY3QgdGhlIHJ1bnRpbWUgY29uZmlndXJhdGlvbiBpbnRvIGluZGV4Lmh0bWwgdXNpbmcgYSBMYW1iZGEtYmFja2VkIGN1c3RvbSByZXNvdXJjZVxyXG4gICAgY29uc3QgaW5kZXhQYXRoID0gcGF0aC5qb2luKHByb3BzLmFzc2V0UGF0aCwgJ2luZGV4Lmh0bWwnKTtcclxuICAgIGlmICghZnMuZXhpc3RzU3luYyhpbmRleFBhdGgpKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHNwZWNpZmllZCBhc3NldFBhdGggXCIke3Byb3BzLmFzc2V0UGF0aH1cIiBkb2VzIG5vdCBjb250YWluIGFuIGluZGV4Lmh0bWwgZmlsZS5gKTtcclxuICAgIH1cclxuICAgIGNvbnN0IGluZGV4SHRtbENvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoaW5kZXhQYXRoLCAndXRmOCcpO1xyXG5cclxuICAgIGNvbnN0IGNvbmZpZ0luamVjdG9yUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCBgJHtwcm9wcy5kZXBsb3ltZW50SWR9Q29uZmlnSW5qZWN0b3JSb2xlYCwge1xyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXHJcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJylcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG4gICAgLy8gR3JhbnQgbGVhc3QtcHJpdmlsZWdlIHBlcm1pc3Npb24gdG8gd3JpdGUgb25seSB0aGUgaW5kZXguaHRtbCBmaWxlXHJcbiAgICBhc3NldHNCdWNrZXQuZ3JhbnRQdXQoY29uZmlnSW5qZWN0b3JSb2xlLCAnaW5kZXguaHRtbCcpO1xyXG5cclxuICAgIGNvbnN0IGNvbmZpZ0luamVjdG9yTGFtYmRhID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCBgJHtwcm9wcy5kZXBsb3ltZW50SWR9Q29uZmlnSW5qZWN0b3JMYW1iZGFgLCB7XHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnbGFtYmRhLWhhbmRsZXJzJywgJ2NvbmZpZy1pbmplY3Rvci50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICByb2xlOiBjb25maWdJbmplY3RvclJvbGUsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrL2NsaWVudC1zMyddLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgY29uZmlnSW5qZWN0b3IgPSBuZXcgY2RrLkN1c3RvbVJlc291cmNlKHRoaXMsIGAke3Byb3BzLmRlcGxveW1lbnRJZH1Db25maWdJbmplY3RvcmAsIHtcclxuICAgICAgc2VydmljZVRva2VuOiBjb25maWdJbmplY3RvckxhbWJkYS5mdW5jdGlvbkFybixcclxuICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgIERlc3RpbmF0aW9uQnVja2V0TmFtZTogYXNzZXRzQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgSW5kZXhIdG1sQ29udGVudDogaW5kZXhIdG1sQ29udGVudCxcclxuICAgICAgICBSdW50aW1lQ29uZmlnOiBwcm9wcy5ydW50aW1lQ29uZmlnLFxyXG4gICAgICAgIC8vIFRyaWdnZXIgYW4gdXBkYXRlIHdoZW5ldmVyIHRoZSBzb3VyY2UgaW5kZXguaHRtbCBvciB0aGUgY29uZmlnIGNoYW5nZXMuXHJcbiAgICAgICAgVXBkYXRlVHJpZ2dlcjogY3J5cHRvLmNyZWF0ZUhhc2goJ21kNScpLnVwZGF0ZShpbmRleEh0bWxDb250ZW50ICsgSlNPTi5zdHJpbmdpZnkocHJvcHMucnVudGltZUNvbmZpZykpLmRpZ2VzdCgnaGV4JyksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgLy8gNS4gRGVwbG95IHRoZSByZXN0IG9mIHRoZSBzdGF0aWMgYXNzZXRzIHRvIHRoZSBTMyBidWNrZXRcclxuICAgIG5ldyBzM2RlcGxveS5CdWNrZXREZXBsb3ltZW50KHRoaXMsIGAke3Byb3BzLmRlcGxveW1lbnRJZH1Bc3NldERlcGxveW1lbnRgLCB7XHJcbiAgICAgIHNvdXJjZXM6IFtzM2RlcGxveS5Tb3VyY2UuYXNzZXQocHJvcHMuYXNzZXRQYXRoKV0sXHJcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiBhc3NldHNCdWNrZXQsXHJcbiAgICAgIGRpc3RyaWJ1dGlvbjogdGhpcy5kaXN0cmlidXRpb24sXHJcbiAgICAgIGRpc3RyaWJ1dGlvblBhdGhzOiBbJy8qJ10sXHJcbiAgICAgIGV4Y2x1ZGU6IFsnaW5kZXguaHRtbCddLCAvLyBFeGNsdWRlIGluZGV4Lmh0bWwgYXMgaXQncyBoYW5kbGVkIGJ5IHRoZSBjdXN0b20gcmVzb3VyY2VcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEVuc3VyZSB0aGUgYnVja2V0IGV4aXN0cyBiZWZvcmUgdGhlIGN1c3RvbSByZXNvdXJjZSB0cmllcyB0byB3cml0ZSB0byBpdC5cclxuICAgIGNvbmZpZ0luamVjdG9yLm5vZGUuYWRkRGVwZW5kZW5jeShhc3NldHNCdWNrZXQpO1xyXG5cclxuICAgIC8vIE91dHB1dCB0aGUgQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gZG9tYWluIG5hbWVcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIGAke3Byb3BzLmRlcGxveW1lbnRJZH1XZWJBcHBVcmxgLCB7XHJcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke3RoaXMuZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcclxuICAgICAgZGVzY3JpcHRpb246IGBUaGUgVVJMIGZvciB0aGUgJHtwcm9wcy5kZXBsb3ltZW50SWR9IHdlYiBhcHBsaWNhdGlvbi5gLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==