import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
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
export declare class WebAppDeployment extends Construct {
    readonly distribution: cloudfront.Distribution;
    constructor(scope: Construct, id: string, props: WebAppDeploymentProps);
}
