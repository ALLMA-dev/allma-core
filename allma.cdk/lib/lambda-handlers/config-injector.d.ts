import type { CloudFormationCustomResourceEvent } from 'aws-lambda';
/**
 * This Lambda handler is invoked by a CDK CustomResource. Its job is to:
 * 1. Receive the raw content of the web app's index.html file.
 * 2. Receive a runtime configuration object (with resolved CDK token values).
 * 3. Inject the configuration into the HTML.
 * 4. Upload the modified index.html to the destination S3 bucket.
 * 5. **Crucially, send a SUCCESS or FAILED signal back to CloudFormation.**
 */
export declare const handler: (event: CloudFormationCustomResourceEvent) => Promise<void>;
