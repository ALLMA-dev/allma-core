/**
 * Local Test Runner for the 'map-and-validate-bom-data' Lambda.
 *
 * This script tests the mapping and validation logic locally.
 *
 * How to use:
 * 1. Ensure you have the necessary input JSON files:
 *    - `test-data/extracted-data.json` (from the 'extract-data' step)
 *    - `test-data/mapping-plan.json` (the LLM-generated mapping plan)
 *    - `config/master-fields.json` (the master field configuration)
 * 2. Run the script from the 'examples/optiroq' directory using:
 *    `npm run test:local:map-validate`
 * 3. The validation result will be printed and saved to `test-data/validation-result.json`.
 */
import * as fs from 'fs';
import * as path from 'path';
import { MappingPlan, MasterField } from '@optiroq/types';
import { handler } from '../src/optiroq-lambdas/allma-steps/optiroq-process-bom-upload/map-and-validate-bom-data.step';

// --- Path setup ---
const testDataDir = path.join(__dirname, '..', 'test-data');
const configDir = path.join(__dirname, '..', 'config');

const extractedDataPath = path.join(testDataDir, 'extracted-data.json');
const mappingPlanPath = path.join(testDataDir, 'mapping-plan.json');
const masterFieldsPath = path.join(configDir, 'master-fields.json');


async function main() {
  console.log(`Testing with data file: ${extractedDataPath}`);
  console.log(`Using mapping plan: ${mappingPlanPath}`);
  console.log(`Using master fields from: ${masterFieldsPath}`);

  // 1. Check if all required files exist
  const requiredFiles = [extractedDataPath, mappingPlanPath, masterFieldsPath];
  for (const filePath of requiredFiles) {
    if (!fs.existsSync(filePath)) {
      console.error(`\n[ERROR] Required test file not found: ${filePath}`);
      if (filePath.includes('extracted-data.json')) {
        console.error("  (You can generate this by running 'npm run test:local:extract-data')");
      }
      console.error('');
      process.exit(1);
    }
  }

  // 2. Read and parse the local JSON files
  const extractedData = JSON.parse(fs.readFileSync(extractedDataPath, 'utf-8'));
  const mappingPlan: MappingPlan = JSON.parse(fs.readFileSync(mappingPlanPath, 'utf-8'));
  const masterFields: MasterField[] = JSON.parse(fs.readFileSync(masterFieldsPath, 'utf-8'));

  // 3. Define the mock event payload for the handler
  const event = {
    stepInput: {
      extractedData,
      mappingPlan,
      masterFields,
      correlationId: `local-test-${new Date().toISOString()}`,
    },
  };

  // 4. Execute the handler and print the result
  try {
    console.log('\nInvoking handler...');
    const result = await handler(event);

    console.log('\n✅ Handler executed successfully!');
    console.log('--- Validation Result ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('-------------------------\n');

    // Save the output to a JSON file
    const outputPath = path.join(testDataDir, 'validation-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`💾 Output saved to: ${outputPath}\n`);
  } catch (error) {
    console.error('\n❌ Handler execution failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
