import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import {
  type FlowDefinition,
  ITEM_TYPE_ALLMA_FLOW_DEFINITION,
  type FlowMetadataStorageItem,
} from '@allma/core-types';

const CONFIG_TABLE_NAME = process.env.ALLMA_CONFIG_TABLE_NAME!;
if (!CONFIG_TABLE_NAME) {
  throw new Error('Missing env var: ALLMA_CONFIG_TABLE_NAME. Ensure setup.mjs is configured correctly.');
}

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const flowsToCleanUp: string[] = [];

/**
 * Helper function to create and store a flow definition for a test.
 * Tracks the created flow for later cleanup.
 * @param flowDef The complete FlowDefinition object.
 */
export async function setupFlowInDB(flowDef: FlowDefinition) {
  const metadata: FlowMetadataStorageItem = {
    PK: `FLOW_DEF#${flowDef.id}`,
    SK: 'METADATA',
    itemType: ITEM_TYPE_ALLMA_FLOW_DEFINITION,
    id: flowDef.id,
    name: `Test Flow ${flowDef.id}`,
    description: 'An integration test flow',
    tags: [],
    latestVersion: 1,
    publishedVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const versionItem = {
    ...flowDef,
    PK: `FLOW_DEF#${flowDef.id}`,
    SK: `VERSION#${flowDef.version}`,
    itemType: ITEM_TYPE_ALLMA_FLOW_DEFINITION,
  };
  await ddbDocClient.send(new BatchWriteCommand({
    RequestItems: { [CONFIG_TABLE_NAME]: [{ PutRequest: { Item: metadata } }, { PutRequest: { Item: versionItem } }] }
  }));
  flowsToCleanUp.push(flowDef.id);
}

/**
 * Cleans up all test data created in DynamoDB during the test run.
 * Should be called in an `afterAll` hook.
 */
export async function cleanupAllTestFlows() {
    if (flowsToCleanUp.length === 0) return;

    const deleteRequests = flowsToCleanUp.flatMap(id => ([
        { DeleteRequest: { Key: { PK: `FLOW_DEF#${id}`, SK: 'METADATA' } } },
        { DeleteRequest: { Key: { PK: `FLOW_DEF#${id}`, SK: `VERSION#1` } } }
    ]));
    
    // Batch delete in chunks of 25 (DynamoDB limit)
    for (let i = 0; i < deleteRequests.length; i += 25) {
        const chunk = deleteRequests.slice(i, i + 25);
        await ddbDocClient.send(new BatchWriteCommand({
            RequestItems: { [CONFIG_TABLE_NAME]: chunk }
        }));
    }
    // Clear the array after cleanup
    flowsToCleanUp.length = 0;
}

/**
 * Closes the DynamoDB client connection.
 * Should be called in an `afterAll` hook after cleanup.
 */
export function closeDbConnection() {
    ddbDocClient.destroy();
}