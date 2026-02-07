/**
 * Local Test Runner for the 'validate-and-save-rfq-draft' Lambda.
 *
 * This script tests the database update logic by mocking the DynamoDB client
 * and inspecting the parameters sent to it.
 *
 * How to use:
 * 1. Ensure `test-data/rfq-draft-payload.json` exists with mock RFQ data.
 * 2. Run from `examples/optiroq`: `npm run test:local:validate-rfq-draft`
 * 3. The DynamoDB command parameters will be printed to the console for verification.
 */
import * as fs from 'fs';
import * as path from 'path';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { RFQ } from '@optiroq/types';
import { handler } from '../src/optiroq-lambdas/allma-steps/rfq-upload/validate-and-save-rfq-draft.step.js';

const ddbMock = mockClient(DynamoDBDocumentClient);
const TEST_PAYLOAD_FILE = 'rfq-draft-payload.json';
const payloadPath = path.join(__dirname, '..', 'test-data', TEST_PAYLOAD_FILE);

async function main() {
  console.log(`Testing with payload file: ${payloadPath}`);
  if (!fs.existsSync(payloadPath)) {
    console.error(`\n[ERROR] Test payload file not found at ${payloadPath}`);
    console.error(`Please create a file with a Partial<RFQ> object at that location.\n`);
    process.exit(1);
  }

  const extractedData: Partial<RFQ> = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));
  
  ddbMock.on(UpdateCommand).resolves({});

  process.env.ENTITY_GRAPH_TABLE = 'mock-entity-graph-table';

  const rfqId = `RFQ-DRAFT-LOCAL-TEST`;
  const event = {
    stepInput: {
      extractedData,
      rfqId,
      correlationId: `local-test-validate-${new Date().toISOString()}`,
    },
  };

  try {
    console.log('\nInvoking handler...');
    const result = await handler(event);

    console.log('\n✅ Handler executed successfully!');
    console.log(JSON.stringify(result, null, 2));
    
    // Verify the command sent to DynamoDB
    const updateCommandCalls = ddbMock.commandCalls(UpdateCommand);
    if (updateCommandCalls.length > 0) {
      const commandInput = updateCommandCalls[0].args[0].input;
      console.log('\n--- DynamoDB UpdateCommand Input ---');
      console.log(JSON.stringify(commandInput, null, 2));
      console.log('------------------------------------\n');
    } else {
      console.warn('⚠️ No UpdateCommand was sent to DynamoDB.');
    }

  } catch (error) {
    console.error('\n❌ Handler execution failed:', error);
    process.exit(1);
  } finally {
    delete process.env.ENTITY_GRAPH_TABLE;
  }
}

main();