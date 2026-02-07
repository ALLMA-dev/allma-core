/**
 * Local Test Runner for the 'sanitize-rfq-document-ocr' Lambda.
 *
 * This script tests the OCR logic by mocking the AWS Textract client,
 * eliminating the need for a real file or AWS credentials.
 *
 * How to use:
 * 1. Run the script from the 'examples/optiroq' directory using the command:
 *    `npm run test:local:sanitize-rfq-ocr`
 * 2. The extracted text output will be printed and saved to 'sanitized-rfq-ocr.json'.
 */
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../src/optiroq-lambdas/allma-steps/rfq-upload/sanitize-rfq-document-ocr.step.js';

const s3Mock = mockClient(S3Client);
const textractMock = mockClient(TextractClient);

async function main() {
  console.log(`Testing OCR handler with mocked Textract...`);

  s3Mock.on(PutObjectCommand).resolves({}); // Mock for offloadIfLarge
  textractMock.on(StartDocumentTextDetectionCommand).resolves({ JobId: 'fake-job-id' });
  textractMock.on(GetDocumentTextDetectionCommand)
    .resolvesOnce({ JobStatus: 'IN_PROGRESS' }) // First poll
    .resolvesOnce({ // Second poll
      JobStatus: 'SUCCEEDED',
      Blocks: [
        { BlockType: 'LINE', Text: 'RFQ for Project `X`' },
        { BlockType: 'LINE', Text: 'Please quote on the following items.' },
      ],
    });

  process.env.ARTEFACTS_BUCKET = 'mock-artefacts-bucket';

  const event = {
    stepInput: {
      s3Bucket: 'mock-bucket',
      s3Key: 'mock-document.pdf',
      correlationId: `local-test-ocr-${new Date().toISOString()}`,
    },
  };

  try {
    console.log('\nInvoking handler (will poll for ~2 seconds)...');
    const result = await handler(event);

    console.log('\n✅ Handler executed successfully!');
    console.log('--- Sanitized Text Output ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('----------------------------\n');

    const outputPath = path.join(__dirname, '..', 'test-data', 'sanitized-rfq-ocr.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`💾 Output saved to: ${outputPath}\n`);
  } catch (error) {
    console.error('\n❌ Handler execution failed:', error);
    process.exit(1);
  } finally {
    delete process.env.ARTEFACTS_BUCKET;
  }
}

main();