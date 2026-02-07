/**
 * Local Test Runner for the 'extract-data-from-bom' Lambda.
 *
 * This script provides a simple way to test the data extraction logic locally
 * using a JSON representation of a workbook and an extraction plan.
 *
 * How to use:
 * 1. Ensure you have the input JSON files in the `test-data` directory:
 *    - `sample-bom.json` (the output from the 'extract-workbook-data' step)
 *    - `extraction-plan.json` (the LLM-generated plan)
 * 2. Run the script from the 'examples/optiroq' directory using the command:
 *    `npm run test:local:extract-data`
 * 3. The extracted data will be printed to the console and saved to 'extracted-data.json'.
 */
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { BomExtractionPlan, WorkbookExtractionResult } from '@optiroq/types';

// The handler function we want to test
import { handler } from '../src/optiroq-lambdas/allma-steps/optiroq-process-bom-upload/extract-data-from-bom.step';

// --- Configuration ---
const TEST_WORKBOOK_DATA_FILE = 'sample-bom.json';
const TEST_EXTRACTION_PLAN_FILE = 'extraction-plan.json';

// --- Path setup ---
const testDataDir = path.join(__dirname, '..', 'test-data');
const workbookDataPath = path.join(testDataDir, TEST_WORKBOOK_DATA_FILE);
const extractionPlanPath = path.join(testDataDir, TEST_EXTRACTION_PLAN_FILE);

// --- Mock AWS SDK ---
// We mock S3 to prevent any actual AWS calls if the code were to change.
const s3Mock = mockClient(S3Client);

async function main() {
  console.log(`Attempting to test with workbook data: ${workbookDataPath}`);
  console.log(`Using extraction plan: ${extractionPlanPath}`);

  // 1. Check if the test files exist
  if (!fs.existsSync(workbookDataPath) || !fs.existsSync(extractionPlanPath)) {
    console.error(`\n[ERROR] Test file(s) not found!`);
    if (!fs.existsSync(workbookDataPath)) {
        console.error(`- Missing workbook data file: ${workbookDataPath}`);
        console.error(`  (You can generate this by running 'npm run test:local:convert-bom')`);
    }
    if (!fs.existsSync(extractionPlanPath)) {
        console.error(`- Missing extraction plan file: ${extractionPlanPath}`);
    }
    console.error('');
    process.exit(1);
  }

  // 2. Read and parse the local JSON files
  const workbookExtractionResult: WorkbookExtractionResult = JSON.parse(fs.readFileSync(workbookDataPath, 'utf-8'));
  const extractionPlan: BomExtractionPlan = JSON.parse(fs.readFileSync(extractionPlanPath, 'utf-8'));


  // 3. Set up S3 mocks (if needed by the handler for any reason, e.g., image paths)
  s3Mock.on(PutObjectCommand).resolves({});


  // 4. Define the mock event payload for the handler
  const event = {
    stepInput: {
      workbookData: workbookExtractionResult.fullWorkbookData,
      extractionPlan,
      correlationId: `local-test-${new Date().toISOString()}`,
    },
  };

  // 5. Execute the handler and print the result
  try {
    console.log('\nInvoking handler...');
    const result = await handler(event);

    console.log('\n✅ Handler executed successfully!');
    console.log('--- Extracted Data Output ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('-----------------------------\n');

    // Save the output to a JSON file
    const outputPath = path.join(testDataDir, 'extracted-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`💾 Output saved to: ${outputPath}\n`);
  } catch (error) {
    console.error('\n❌ Handler execution failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
