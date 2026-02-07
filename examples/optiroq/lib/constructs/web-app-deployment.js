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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const route53Targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
class WebAppDeployment extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const assetsBucket = new s3.Bucket(this, `${props.deploymentId}AssetsBucket`, {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
        });
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, `${props.deploymentId}OAI`);
        assetsBucket.grantRead(originAccessIdentity);
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
exports.WebAppDeployment = WebAppDeployment;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLWFwcC1kZXBsb3ltZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2ViLWFwcC1kZXBsb3ltZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywyQ0FBdUM7QUFDdkMsdURBQXlDO0FBQ3pDLHVFQUF5RDtBQUN6RCw0RUFBOEQ7QUFDOUQsd0VBQTBEO0FBQzFELHlEQUEyQztBQUMzQyx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLCtDQUFpQztBQUNqQyw0RUFBOEQ7QUFDOUQsK0RBQWlEO0FBQ2pELHdFQUEwRDtBQUMxRCxpRUFBbUQ7QUFDbkQsZ0ZBQWtFO0FBNkJsRSxNQUFhLGdCQUFpQixTQUFRLHNCQUFTO0lBRzNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNEI7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLFlBQVksR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFlBQVksY0FBYyxFQUFFO1lBQzFFLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxVQUFVLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVU7U0FDN0MsQ0FBQyxDQUFDO1FBRUgsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsWUFBWSxLQUFLLENBQUMsQ0FBQztRQUNuRyxZQUFZLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFN0MsSUFBSSxpQkFBaUIsR0FBaUM7WUFDbEQsaUJBQWlCLEVBQUUsWUFBWTtZQUMvQixlQUFlLEVBQUU7Z0JBQ2IsTUFBTSxFQUFFLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxDQUFDO2dCQUNwRSxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCO2dCQUN2RSxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUI7Z0JBQ3JELFFBQVEsRUFBRSxJQUFJO2FBQ2pCO1lBQ0QsY0FBYyxFQUFFO2dCQUNaO29CQUNJLFVBQVUsRUFBRSxHQUFHO29CQUNmLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7aUJBQ2xDO2dCQUNEO29CQUNJLFVBQVUsRUFBRSxHQUFHO29CQUNmLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7aUJBQ2xDO2FBQ0o7U0FDSixDQUFDO1FBRUYsOENBQThDO1FBQzlDLElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDM0MsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsWUFBWSxhQUFhLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3ZILGFBQWE7WUFDYixpQkFBaUIsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkQsYUFBYTtZQUNiLGlCQUFpQixDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDaEQsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxZQUFZLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRTlHLGtFQUFrRTtRQUNsRSxJQUFJLEtBQUssQ0FBQyxVQUFVLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3pDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFlBQVksWUFBWSxFQUFFO2dCQUNwRyxZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVk7Z0JBQ2hDLFFBQVEsRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLDREQUE0RDthQUMzRixDQUFDLENBQUM7WUFFSCxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFlBQVksYUFBYSxFQUFFO2dCQUMxRCxJQUFJLEVBQUUsVUFBVTtnQkFDaEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksY0FBYyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDOUYsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO2FBQy9CLENBQUMsQ0FBQztRQUNQLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixLQUFLLENBQUMsU0FBUyx3Q0FBd0MsQ0FBQyxDQUFDO1FBQ3pHLENBQUM7UUFDRCxNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTVELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxZQUFZLG9CQUFvQixFQUFFO1lBQ3JGLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUMzRCxlQUFlLEVBQUU7Z0JBQ2IsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQzthQUN6RjtTQUNKLENBQUMsQ0FBQztRQUNILFlBQVksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFeEQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFlBQVksc0JBQXNCLEVBQUU7WUFDNUcsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHNEQUFzRCxDQUFDO1lBQ25GLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsSUFBSSxFQUFFLGtCQUFrQjtZQUN4QixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLFFBQVEsRUFBRTtnQkFDTixNQUFNLEVBQUUsSUFBSTtnQkFDWixTQUFTLEVBQUUsSUFBSTtnQkFDZixlQUFlLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQzthQUMxQztTQUNKLENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsWUFBWSxnQkFBZ0IsRUFBRTtZQUN2RixZQUFZLEVBQUUsb0JBQW9CLENBQUMsV0FBVztZQUM5QyxVQUFVLEVBQUU7Z0JBQ1IscUJBQXFCLEVBQUUsWUFBWSxDQUFDLFVBQVU7Z0JBQzlDLGdCQUFnQixFQUFFLGdCQUFnQjtnQkFDbEMsYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhO2dCQUNsQyxhQUFhLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2FBQ3ZIO1NBQ0osQ0FBQyxDQUFDO1FBRUgsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFlBQVksaUJBQWlCLEVBQUU7WUFDeEUsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pELGlCQUFpQixFQUFFLFlBQVk7WUFDL0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLGlCQUFpQixFQUFFLENBQUMsSUFBSSxDQUFDO1lBQ3pCLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQztTQUMxQixDQUFDLENBQUM7UUFFSCxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVoRCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFlBQVksV0FBVyxFQUFFO1lBQ3RELEtBQUssRUFBRSxXQUFXLElBQUksQ0FBQyxZQUFZLENBQUMsc0JBQXNCLEVBQUU7WUFDNUQsV0FBVyxFQUFFLG1CQUFtQixLQUFLLENBQUMsWUFBWSxtQkFBbUI7U0FDeEUsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUNKO0FBbkhELDRDQW1IQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcclxuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcclxuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYU5vZGVqcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xyXG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcclxuaW1wb3J0ICogYXMgcm91dGU1M1RhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdlYkFwcERlcGxveW1lbnRQcm9wcyB7XHJcbiAgICBhc3NldFBhdGg6IHN0cmluZztcclxuICAgIHJ1bnRpbWVDb25maWc6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbiAgICBkZXBsb3ltZW50SWQ6IHN0cmluZztcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBjdXN0b20gZG9tYWluIG5hbWUgZm9yIHRoZSB3ZWIgYXBwbGljYXRpb24gKGUuZy4sIGBhZG1pbi5leGFtcGxlLmNvbWApLlxyXG4gICAgICogSWYgcHJvdmlkZWQsIGBjZXJ0aWZpY2F0ZUFybmAgYW5kIGBob3N0ZWRab25lSWRgIG11c3QgYWxzbyBiZSBwcm92aWRlZC5cclxuICAgICAqIEBkZWZhdWx0IC0gTm8gY3VzdG9tIGRvbWFpbiBpcyBjb25maWd1cmVkLlxyXG4gICAgICovXHJcbiAgICBkb21haW5OYW1lPzogc3RyaW5nO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIEFSTiBvZiB0aGUgQUNNIGNlcnRpZmljYXRlIGZvciB0aGUgY3VzdG9tIGRvbWFpbi5cclxuICAgICAqIFJlcXVpcmVkIGlmIGBkb21haW5OYW1lYCBpcyBwcm92aWRlZC5cclxuICAgICAqIEBkZWZhdWx0IC0gTm8gY3VzdG9tIGRvbWFpbiBpcyBjb25maWd1cmVkLlxyXG4gICAgICovXHJcbiAgICBjZXJ0aWZpY2F0ZUFybj86IHN0cmluZztcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBJRCBvZiB0aGUgUm91dGUgNTMgaG9zdGVkIHpvbmUgZm9yIHRoZSBjdXN0b20gZG9tYWluLlxyXG4gICAgICogUmVxdWlyZWQgaWYgYGRvbWFpbk5hbWVgIGlzIHByb3ZpZGVkLlxyXG4gICAgICogQGRlZmF1bHQgLSBObyBjdXN0b20gZG9tYWluIGlzIGNvbmZpZ3VyZWQuXHJcbiAgICAgKi9cclxuICAgIGhvc3RlZFpvbmVJZD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFdlYkFwcERlcGxveW1lbnQgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGRpc3RyaWJ1dGlvbjogY2xvdWRmcm9udC5EaXN0cmlidXRpb247XHJcblxyXG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFdlYkFwcERlcGxveW1lbnRQcm9wcykge1xyXG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGFzc2V0c0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgYCR7cHJvcHMuZGVwbG95bWVudElkfUFzc2V0c0J1Y2tldGAsIHtcclxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXHJcbiAgICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgICAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3Qgb3JpZ2luQWNjZXNzSWRlbnRpdHkgPSBuZXcgY2xvdWRmcm9udC5PcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLCBgJHtwcm9wcy5kZXBsb3ltZW50SWR9T0FJYCk7XHJcbiAgICAgICAgYXNzZXRzQnVja2V0LmdyYW50UmVhZChvcmlnaW5BY2Nlc3NJZGVudGl0eSk7XHJcblxyXG4gICAgICAgIGxldCBkaXN0cmlidXRpb25Qcm9wczogY2xvdWRmcm9udC5EaXN0cmlidXRpb25Qcm9wcyA9IHtcclxuICAgICAgICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcclxuICAgICAgICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XHJcbiAgICAgICAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKGFzc2V0c0J1Y2tldCwgeyBvcmlnaW5BY2Nlc3NJZGVudGl0eSB9KSxcclxuICAgICAgICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxyXG4gICAgICAgICAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXHJcbiAgICAgICAgICAgICAgICBjb21wcmVzczogdHJ1ZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIEFkZCBjdXN0b20gZG9tYWluIGNvbmZpZ3VyYXRpb24gaWYgcHJvdmlkZWRcclxuICAgICAgICBpZiAocHJvcHMuZG9tYWluTmFtZSAmJiBwcm9wcy5jZXJ0aWZpY2F0ZUFybikge1xyXG4gICAgICAgICAgICBjb25zdCBjZXJ0aWZpY2F0ZSA9IGFjbS5DZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4odGhpcywgYCR7cHJvcHMuZGVwbG95bWVudElkfUNlcnRpZmljYXRlYCwgcHJvcHMuY2VydGlmaWNhdGVBcm4pO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXHJcbiAgICAgICAgICAgIGRpc3RyaWJ1dGlvblByb3BzLmRvbWFpbk5hbWVzID0gW3Byb3BzLmRvbWFpbk5hbWVdO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXHJcbiAgICAgICAgICAgIGRpc3RyaWJ1dGlvblByb3BzLmNlcnRpZmljYXRlID0gY2VydGlmaWNhdGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCBgJHtwcm9wcy5kZXBsb3ltZW50SWR9RGlzdHJpYnV0aW9uYCwgZGlzdHJpYnV0aW9uUHJvcHMpO1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgYSBSb3V0ZSA1MyBhbGlhcyByZWNvcmQgaWYgYSBjdXN0b20gZG9tYWluIGlzIGNvbmZpZ3VyZWRcclxuICAgICAgICBpZiAocHJvcHMuZG9tYWluTmFtZSAmJiBwcm9wcy5ob3N0ZWRab25lSWQpIHtcclxuICAgICAgICAgICAgY29uc3QgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tSG9zdGVkWm9uZUF0dHJpYnV0ZXModGhpcywgYCR7cHJvcHMuZGVwbG95bWVudElkfUhvc3RlZFpvbmVgLCB7XHJcbiAgICAgICAgICAgICAgICBob3N0ZWRab25lSWQ6IHByb3BzLmhvc3RlZFpvbmVJZCxcclxuICAgICAgICAgICAgICAgIHpvbmVOYW1lOiBwcm9wcy5kb21haW5OYW1lLCAvLyBVc2VyIG11c3QgcHJvdmlkZSB0aGUgY29ycmVjdCB6b25lIG5hbWUgZm9yIHRoZSBnaXZlbiBJRC5cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsIGAke3Byb3BzLmRlcGxveW1lbnRJZH1BbGlhc1JlY29yZGAsIHtcclxuICAgICAgICAgICAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgcm91dGU1M1RhcmdldHMuQ2xvdWRGcm9udFRhcmdldCh0aGlzLmRpc3RyaWJ1dGlvbikpLFxyXG4gICAgICAgICAgICAgICAgcmVjb3JkTmFtZTogcHJvcHMuZG9tYWluTmFtZSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpbmRleFBhdGggPSBwYXRoLmpvaW4ocHJvcHMuYXNzZXRQYXRoLCAnaW5kZXguaHRtbCcpO1xyXG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhpbmRleFBhdGgpKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHNwZWNpZmllZCBhc3NldFBhdGggXCIke3Byb3BzLmFzc2V0UGF0aH1cIiBkb2VzIG5vdCBjb250YWluIGFuIGluZGV4Lmh0bWwgZmlsZS5gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaW5kZXhIdG1sQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhpbmRleFBhdGgsICd1dGY4Jyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbmZpZ0luamVjdG9yUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCBgJHtwcm9wcy5kZXBsb3ltZW50SWR9Q29uZmlnSW5qZWN0b3JSb2xlYCwge1xyXG4gICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXHJcbiAgICAgICAgICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKVxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGFzc2V0c0J1Y2tldC5ncmFudFB1dChjb25maWdJbmplY3RvclJvbGUsICdpbmRleC5odG1sJyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbmZpZ0luamVjdG9yTGFtYmRhID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCBgJHtwcm9wcy5kZXBsb3ltZW50SWR9Q29uZmlnSW5qZWN0b3JMYW1iZGFgLCB7XHJcbiAgICAgICAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vc3JjL2xhbWJkYS1oYW5kbGVycy9jb25maWctaW5qZWN0b3IuaGFuZGxlci50cycpLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgICAgICByb2xlOiBjb25maWdJbmplY3RvclJvbGUsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxyXG4gICAgICAgICAgICBidW5kbGluZzoge1xyXG4gICAgICAgICAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc291cmNlTWFwOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrL2NsaWVudC1zMyddLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBjb25maWdJbmplY3RvciA9IG5ldyBjZGsuQ3VzdG9tUmVzb3VyY2UodGhpcywgYCR7cHJvcHMuZGVwbG95bWVudElkfUNvbmZpZ0luamVjdG9yYCwge1xyXG4gICAgICAgICAgICBzZXJ2aWNlVG9rZW46IGNvbmZpZ0luamVjdG9yTGFtYmRhLmZ1bmN0aW9uQXJuLFxyXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICBEZXN0aW5hdGlvbkJ1Y2tldE5hbWU6IGFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgICAgICAgICAgSW5kZXhIdG1sQ29udGVudDogaW5kZXhIdG1sQ29udGVudCxcclxuICAgICAgICAgICAgICAgIFJ1bnRpbWVDb25maWc6IHByb3BzLnJ1bnRpbWVDb25maWcsXHJcbiAgICAgICAgICAgICAgICBVcGRhdGVUcmlnZ2VyOiBjcnlwdG8uY3JlYXRlSGFzaCgnbWQ1JykudXBkYXRlKGluZGV4SHRtbENvbnRlbnQgKyBKU09OLnN0cmluZ2lmeShwcm9wcy5ydW50aW1lQ29uZmlnKSkuZGlnZXN0KCdoZXgnKSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgYCR7cHJvcHMuZGVwbG95bWVudElkfUFzc2V0RGVwbG95bWVudGAsIHtcclxuICAgICAgICAgICAgc291cmNlczogW3MzZGVwbG95LlNvdXJjZS5hc3NldChwcm9wcy5hc3NldFBhdGgpXSxcclxuICAgICAgICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IGFzc2V0c0J1Y2tldCxcclxuICAgICAgICAgICAgZGlzdHJpYnV0aW9uOiB0aGlzLmRpc3RyaWJ1dGlvbixcclxuICAgICAgICAgICAgZGlzdHJpYnV0aW9uUGF0aHM6IFsnLyonXSxcclxuICAgICAgICAgICAgZXhjbHVkZTogWydpbmRleC5odG1sJ10sXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbmZpZ0luamVjdG9yLm5vZGUuYWRkRGVwZW5kZW5jeShhc3NldHNCdWNrZXQpO1xyXG5cclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBgJHtwcm9wcy5kZXBsb3ltZW50SWR9V2ViQXBwVXJsYCwge1xyXG4gICAgICAgICAgICB2YWx1ZTogYGh0dHBzOi8vJHt0aGlzLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBgVGhlIFVSTCBmb3IgdGhlICR7cHJvcHMuZGVwbG95bWVudElkfSB3ZWIgYXBwbGljYXRpb24uYCxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufSJdfQ==