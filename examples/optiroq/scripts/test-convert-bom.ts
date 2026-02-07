/**
 * Local Test Runner for the 'convert-bom-to-json' Lambda.
 *
 * This script provides a simple way to test the Excel parsing logic locally
 * with a real Excel file without needing to deploy or mock S3 manually.
 *
 * How to use:
 * 1. Place your test Excel file in the `test-data` directory. By default, it looks for 'sample-bom.xlsx'.
 * 2. Run the script from the 'examples/optiroq' directory using the command:
 *    `npm run test:local:convert-bom`
 * 3. The parsed JSON output will be printed to the console and saved to a .json file
 *    next to the input Excel file (e.g., 'sample-bom.json').
 */
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { mockClient } from 'aws-sdk-client-mock';

// The handler function we want to test
import { handler } from '../src/optiroq-lambdas/allma-steps/optiroq-process-bom-upload/extract-workbook-data.step';

// --- Configuration ---
const TEST_FILE_NAME = 'sample-bom.xlsx';

// --- Path setup for CommonJS environment ---
// In a CommonJS module executed by Node, `__dirname` is a global variable
// representing the directory of the current script.
const testFilePath = path.join(__dirname, '..', 'test-data', TEST_FILE_NAME);

// --- Mock AWS SDK ---
// We create a mock of the S3Client.
const s3Mock = mockClient(S3Client);

async function main() {
  console.log(`Attempting to test with file: ${testFilePath}`);

  // 1. Check if the test file exists
  if (!fs.existsSync(testFilePath)) {
    console.error(`\n[ERROR] Test file not found!`);
    console.error(`Please create a 'test-data' directory in 'examples/optiroq/' and place a file named '${TEST_FILE_NAME}' inside it.\n`);
    process.exit(1);
  }

  // 2. Read the local file and prepare it as a stream
  const fileBuffer = fs.readFileSync(testFilePath);
  const stream = sdkStreamMixin(Readable.from([fileBuffer]));

  // 3. Set up the S3 mocks
  // Mock the GetObjectCommand to return our local file stream instead of calling S3.
  s3Mock.on(GetObjectCommand).resolves({ Body: stream });
  // Mock the PutObjectCommand to prevent errors when the handler tries to upload images.
  s3Mock.on(PutObjectCommand).resolves({});

  // 4. Set required environment variables for the handler
  process.env.ARTEFACTS_BUCKET = 'mock-artefacts-bucket-for-local-test';

  // 5. Define the mock event payload for the handler
  const event = {
    stepInput: {
      s3Bucket: 'mock-bucket', // Value doesn't matter, it's intercepted by the mock
      s3Key: 'mock-key.xlsx',   // Value doesn't matter
      correlationId: `local-test-${new Date().toISOString()}`,
    },
  };

  // 6. Execute the handler and print the result
  try {
    console.log('\nInvoking handler...');
    const result = await handler(event);

    console.log('\n✅ Handler executed successfully!');
    console.log('--- Parsed JSON Output ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('--------------------------\n');

    // Save the output to a JSON file next to the input Excel file
    const outputPath = testFilePath.replace(/\.xlsx$/i, '.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`💾 Output saved to: ${outputPath}\n`);
  } catch (error) {
    console.error('\n❌ Handler execution failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();