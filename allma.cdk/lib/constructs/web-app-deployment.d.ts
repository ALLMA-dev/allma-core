import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
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
export declare class WebAppDeployment extends Construct {
    readonly distribution: cloudfront.Distribution;
    constructor(scope: Construct, id: string, props: WebAppDeploymentProps);
}
