import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { AllmaImporterService } from '../services/allma-importer.service.js';
import { AllmaExportFormatSchema, AllmaExportFormat } from '@allma/core-types';
import { sendCloudFormationResponse, CloudFormationEvent } from '@allma/core-sdk';

const s3Client = new S3Client({});

async function downloadAndParseJson(bucket: string, key: string): Promise<AllmaExportFormat> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  const body = await response.Body!.transformToString();
  const data = JSON.parse(body);
  return AllmaExportFormatSchema.parse(data);
}

export async function handler(event: CloudFormationEvent): Promise<void> {
  const { RequestType, ResourceProperties } = event;
  const { S3Bucket, S3Key } = ResourceProperties;

  try {
    if (RequestType === 'Delete') {
      await sendCloudFormationResponse(event, 'SUCCESS');
      return;
    }

    if (RequestType === 'Create' || RequestType === 'Update') {
      const configData = await downloadAndParseJson(S3Bucket, S3Key);
      
      const importer = new AllmaImporterService();
      const result = await importer.import(configData, { overwrite: true });

      console.log('Import summary:', JSON.stringify(result, null, 2));

      if (result.errors.length > 0) {
        throw new Error(`Import failed with ${result.errors.length} errors. Check logs for details.`);
      }

      await sendCloudFormationResponse(event, 'SUCCESS', { ImportedItems: result.created.flows + result.created.steps });
      return;
    }

    await sendCloudFormationResponse(event, 'SUCCESS');
  } catch (error: any) {
    console.error('Failed to process CDK configuration import:', error);
    await sendCloudFormationResponse(event, 'FAILED', { Error: error.message });
  }
}
