/**
 * Local Test Runner for the 'sanitize-rfq-document-excel' Lambda.
 *
 * This script provides a simple way to test the Excel parsing logic locally
 * with a real Excel file without needing to deploy or mock S3 manually.
 *
 * How to use:
 * 1. Place your test Excel file in the `test-data` directory. It must be named 'sample-rfq.xlsx'.
 * 2. Run the script from the 'examples/optiroq' directory using the command:
 *    `npm run test:local:sanitize-rfq-excel`
 * 3. The parsed JSON output will be printed to the console and saved to 'sanitized-rfq-excel.json'
 *    in the `test-data` directory.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../src/optiroq-lambdas/allma-steps/rfq-upload/sanitize-rfq-document-excel.step';

const TEST_FILE_NAME = 'sample-bom.xlsx';
const testFilePath = path.join(__dirname, '..', 'test-data', TEST_FILE_NAME);
const s3Mock = mockClient(S3Client);

async function main() {
  console.log(`Attempting to test with file: ${testFilePath}`);
  if (!fs.existsSync(testFilePath)) {
    console.error(`\n[ERROR] Test file not found at ${testFilePath}`);
    console.error(`Please create a 'test-data' directory in 'examples/optiroq/' and place a file named '${TEST_FILE_NAME}' inside it.\n`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(testFilePath);
  const stream = sdkStreamMixin(Readable.from([fileBuffer]));

  s3Mock.on(GetObjectCommand).resolves({ Body: stream });
  s3Mock.on(PutObjectCommand).resolves({}); // Mock for offloadIfLarge

  process.env.ARTEFACTS_BUCKET = 'mock-artefacts-bucket';

  const event = {
    stepInput: {
      s3Bucket: 'mock-bucket',
      s3Key: 'mock-key.xlsx',
      correlationId: `local-test-excel-${new Date().toISOString()}`,
    },
  };

  try {
    console.log('\nInvoking handler...');
    const result = await handler(event);

    console.log('\n✅ Handler executed successfully!');
    console.log('--- Sanitized Text Output ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('----------------------------\n');

    const outputPath = path.join(__dirname, '..', 'test-data', 'sanitized-rfq-excel.json');
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