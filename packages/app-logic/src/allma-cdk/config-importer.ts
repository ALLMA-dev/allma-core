import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { AllmaImporterService } from '../services/allma-importer.service.js';
import { AllmaExportFormatSchema, AllmaExportFormat, StepDefinition, FlowDefinition } from '@allma/core-types';
import { sendCloudFormationResponse, CloudFormationEvent } from '@allma/core-sdk';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { Readable } from 'stream';

const s3Client = new S3Client({});

/**
 * Downloads an asset from S3 to a local temporary file.
 * @param bucket The S3 bucket name.
 * @param key The S3 object key.
 * @returns The local file path where the asset was saved.
 */
async function downloadAsset(bucket: string, key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  const localPath = path.join('/tmp', path.basename(key));
  
  if (response.Body instanceof Readable) {
    const writer = fs.createWriteStream(localPath);
    response.Body.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(localPath));
      writer.on('error', reject);
    });
  }
  
  throw new Error('Failed to download asset from S3.');
}

/**
 * Aggregates step definitions and flows from a parsed JSON object into accumulator arrays.
 * @param data The parsed JSON data, expected to conform to AllmaExportFormat.
 * @param allStepDefinitions Accumulator for step definitions.
 * @param allFlows Accumulator for flows.
 */
function aggregateConfigData(data: unknown, allStepDefinitions: StepDefinition[], allFlows: FlowDefinition[]): void {
  const validationResult = AllmaExportFormatSchema.safeParse(data);
  if (!validationResult.success) {
    // Throw a more informative error
    const errorDetails = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Configuration file is invalid: ${errorDetails}`);
  }

  const config = validationResult.data;
  if (config.stepDefinitions) {
    allStepDefinitions.push(...config.stepDefinitions);
  }
  if (config.flows) {
    allFlows.push(...config.flows);
  }
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
      const localAssetPath = await downloadAsset(S3Bucket, S3Key);

      const allStepDefinitions: StepDefinition[] = [];
      const allFlows: FlowDefinition[] = [];

      if (S3Key.endsWith('.zip')) {
        const zip = new AdmZip(localAssetPath);
        const zipEntries = zip.getEntries();

        for (const entry of zipEntries) {
          if (!entry.isDirectory && entry.entryName.endsWith('.json')) {
            const fileContent = entry.getData().toString('utf8');
            const jsonData = JSON.parse(fileContent);
            aggregateConfigData(jsonData, allStepDefinitions, allFlows);
          }
        }
      } else {
        const fileContent = fs.readFileSync(localAssetPath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        aggregateConfigData(jsonData, allStepDefinitions, allFlows);
      }

      const finalConfig: AllmaExportFormat = {
        formatVersion: '1.0',
        exportedAt: new Date().toISOString(),
        stepDefinitions: allStepDefinitions,
        flows: allFlows,
      };

      const importer = new AllmaImporterService();
      const result = await importer.import(finalConfig, { overwrite: true });

      console.log('Import summary:', JSON.stringify(result, null, 2));

      if (result.errors.length > 0) {
        const errorSummary = result.errors.map(e => e.message).join('; ');
        throw new Error(`Import failed with ${result.errors.length} errors: ${errorSummary}`);
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
