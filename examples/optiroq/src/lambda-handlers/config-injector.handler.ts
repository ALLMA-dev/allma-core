import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { CloudFormationCustomResourceEvent } from 'aws-lambda';
import * as https from 'https';
import { URL } from 'url';

const s3Client = new S3Client({});

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

  const parsedUrl = new URL(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'PUT',
    headers: {
      'content-type': '',
      'content-length': responseBody.length,
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      response.on('data', () => {});
      response.on('end', () => resolve());
    });
    request.on('error', (error) => reject(error));
    request.write(responseBody);
    request.end();
  });
}

export const handler = async (event: CloudFormationCustomResourceEvent): Promise<void> => {
  try {
    if (event.RequestType === 'Delete') {
      await sendCfnResponse(event, 'SUCCESS');
      return;
    }

    const { DestinationBucketName, IndexHtmlContent, RuntimeConfig } = event.ResourceProperties as any;

    if (!DestinationBucketName || !IndexHtmlContent || !RuntimeConfig) {
      throw new Error('Missing required properties: DestinationBucketName, IndexHtmlContent, or RuntimeConfig.');
    }

    const configScript = `<script>window.runtimeConfig = ${JSON.stringify(RuntimeConfig)};</script>`;
    const modifiedIndexHtml = IndexHtmlContent.replace('</head>', `${configScript}</head>`);

    await s3Client.send(new PutObjectCommand({
      Bucket: DestinationBucketName,
      Key: 'index.html',
      Body: modifiedIndexHtml,
      ContentType: 'text/html; charset=utf-8',
    }));

    await sendCfnResponse(event, 'SUCCESS');
  } catch (error: any) {
    console.error('Failed to inject runtime config:', error);
    await sendCfnResponse(event, 'FAILED', undefined, `Failed to process and upload index.html: ${error.message}`);
  }
};