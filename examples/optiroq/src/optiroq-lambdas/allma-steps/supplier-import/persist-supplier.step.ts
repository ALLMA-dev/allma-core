// allma-core/examples/optiroq/src/optiroq-lambdas/allma-steps/supplier-import/persist-supplier.step.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { TransactWriteCommand, DynamoDBDocumentClient, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { Supplier } from '@optiroq/types';
import { log_info, log_error } from '@allma/core-sdk';
import { randomUUID } from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

interface StepInput {
  supplier: Partial<Supplier>;
  correlationId: string;
}

/**
 * @description Persists a single, validated supplier and its commodity links to DynamoDB.
 */
export const handler = async (event: { stepInput: StepInput }) => {
  const { supplier, correlationId } = event.stepInput;
  log_info('Persisting supplier', { correlationId, supplierName: supplier.supplierName });

  if (!supplier.supplierName) {
    log_error('Cannot persist supplier: supplierName is missing.', { correlationId, supplier });
    throw new Error('Supplier name is required to persist a supplier.');
  }
    if (!supplier.commodityIds || supplier.commodityIds.length === 0) {
    log_error('Cannot persist supplier: commodities array is missing or empty.', { correlationId, supplier });
    throw new Error('At least one commodity is required to persist a supplier.');
  }

  const tableName = process.env.ENTITY_GRAPH_TABLE;
  if (!tableName) {
    throw new Error('ENTITY_GRAPH_TABLE environment variable is not set.');
  }

  const supplierId = randomUUID();
  const now = new Date().toISOString();

  const supplierItem: Supplier = {
    ...supplier,
    PK: `SUPPLIER#${supplierId}`,
    SK: 'METADATA',
    entityType: 'SUPPLIER',
    supplierId,
    supplierName: supplier.supplierName!,
    commodityIds: supplier.commodityIds || [],
    createdAt: now,
    updatedAt: now,
    GSI1PK: 'SUPPLIERS',
    GSI1SK: supplier.supplierName,
  };

  const transactionItems: TransactWriteCommandInput['TransactItems'] = [{
    Put: { TableName: tableName, Item: supplierItem },
  }];

  // Create link items for GSI2 queries (find suppliers by commodity)
  for (const commodityId of supplier.commodityIds || []) {
    transactionItems.push({
      Put: {
        TableName: tableName,
        Item: {
          PK: `SUPPLIER#${supplierId}`,
          SK: `COMMODITY#${commodityId}`,
          entityType: 'SUPPLIER_COMMODITY_LINK',
          GSI2PK: `COMMODITY#${commodityId}`,
          GSI2SK: `SUPPLIER#${supplierId}`,
          supplierName: supplier.supplierName,
        }
      }
    });
  }

  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: transactionItems }));
    log_info('Successfully persisted supplier and commodity links', { correlationId, supplierId });
    return { status: 'success', supplierId };
  } catch (error) {
    log_error(`Failed to persist supplier ${supplier.supplierName}`, { correlationId, error });
    throw error;
  }
};