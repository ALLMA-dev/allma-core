// allma-core/examples/optiroq/src/optiroq-lambdas/api/queries/get-suppliers-list.view.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { SuppliersListViewModel, Supplier, SupplierSummary } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE } = process.env;

/**
 * Fetches a list of all suppliers.
 * Uses a GSI query for efficient, system-wide fetching.
 *
 * @param userId The ID of the user making the request (for authorization context).
 * @returns A promise resolving to a SuppliersListViewModel.
 */
export async function getSuppliersList(userId: string): Promise<SuppliersListViewModel> {
  if (!ENTITY_GRAPH_TABLE) {
    log_error('ENTITY_GRAPH_TABLE environment variable is not set.');
    throw new Error('Server configuration error.');
  }

  log_info(`Fetching suppliers list for user: ${userId}`);

  try {
    const command = new QueryCommand({
      TableName: ENTITY_GRAPH_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'SUPPLIERS' },
      ProjectionExpression: 'supplierId, supplierName, commodityIds, classification, assessmentScore, contactEmail, previousRFQs',
    });

    const { Items } = await docClient.send(command);

    const suppliers: SupplierSummary[] = (Items as Supplier[] || []).map(item => ({
      supplierId: item.supplierId,
      supplierName: item.supplierName,
      commodityIds: item.commodityIds,
      classification: item.classification,
      assessmentScore: item.assessmentScore,
      email: item.contactEmail,
      previousRFQs: item.previousRFQs || 0,
    }));

    log_info(`Found ${suppliers.length} suppliers.`);
    return { suppliers };
  } catch (error) {
    log_error('Failed to query for suppliers in DynamoDB', { userId, error });
    throw new Error('An error occurred while fetching suppliers.');
  }
}