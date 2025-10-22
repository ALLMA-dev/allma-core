import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { CloudFormationCustomResourceEvent } from 'aws-lambda';
import * as https from 'https';
import { URL } from 'url';

const s3Client = new S3Client({});

/**
 * Sends a response signal to the CloudFormation pre-signed URL.
 * This is a mandatory step for all Lambda-backed custom resources.
 */
async function sendCfnResponse(
  event: CloudFormationCustomResourceEvent,
  status: 'SUCCESS' | 'FAILED',
  data?: Record<string, any>,
  reason?: string
): Promise<void> {
  const responseBody = JSON.stringify({
    Status: status,
    Reason: reason || `See the details in CloudWatch Log Stream: ${process.env.AWS_LAMBDA_LOG_STREAM_NAME}`,
    PhysicalResourceId: (event as any).PhysicalResourceId || `${event.LogicalResourceId}-${event.RequestId}`,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data,
  });

  console.log('Sending CloudFormation response:', responseBody);

  const parsedUrl = new URL(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'PUT',
    headers: {
      'content-type': '', // Must be empty
      'content-length': responseBody.length,
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      console.log(`CloudFormation response status: ${response.statusCode}`);
      response.on('data', () => {}); // Consume response data
      response.on('end', () => resolve());
    });

    request.on('error', (error) => {
      console.error('Failed to send CloudFormation response:', error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
}

/**
 * This Lambda handler is invoked by a CDK CustomResource. Its job is to:
 * 1. Receive the raw content of the web app's index.html file.
 * 2. Receive a runtime configuration object (with resolved CDK token values).
 * 3. Inject the configuration into the HTML.
 * 4. Upload the modified index.html to the destination S3 bucket.
 * 5. **Crucially, send a SUCCESS or FAILED signal back to CloudFormation.**
 */
export const handler = async (event: CloudFormationCustomResourceEvent): Promise<void> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // On stack deletion, we just need to send a SUCCESS signal.
    if (event.RequestType === 'Delete') {
      console.log('RequestType is Delete. Sending SUCCESS signal.');
      await sendCfnResponse(event, 'SUCCESS');
      return;
    }

    const { DestinationBucketName, IndexHtmlContent, RuntimeConfig } = event.ResourceProperties as any;

    if (!DestinationBucketName || !IndexHtmlContent || !RuntimeConfig) {
      throw new Error('Missing required properties: DestinationBucketName, IndexHtmlContent, or RuntimeConfig.');
    }

    // 1. Create the script tag with the stringified runtime configuration.
    const configScript = `<script>window.runtimeConfig = ${JSON.stringify(RuntimeConfig)};</script>`;

    // 2. Inject the script tag right before the closing </head> tag.
    const modifiedIndexHtml = IndexHtmlContent.replace('</head>', `${configScript}</head>`);

    // 3. Upload the modified file to the S3 bucket.
    const putCommand = new PutObjectCommand({
      Bucket: DestinationBucketName,
      Key: 'index.html',
      Body: modifiedIndexHtml,
      ContentType: 'text/html; charset=utf-8',
    });

    console.log(`Uploading modified index.html to bucket: ${DestinationBucketName}`);
    await s3Client.send(putCommand);
    console.log('Successfully injected runtime config and uploaded index.html.');

    // 4. Send the SUCCESS signal back to CloudFormation.
    await sendCfnResponse(event, 'SUCCESS');

  } catch (error: any) {
    console.error('Failed to inject runtime config:', error);
    // 5. If anything fails, send the FAILED signal back to CloudFormation.
    await sendCfnResponse(event, 'FAILED', undefined, `Failed to process and upload index.html: ${error.message}`);
  }
};
