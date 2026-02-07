import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { Project, BOMPart, MasterField, RFQ, RfqEditViewModel, SupplierSummary, CategorizedCommodityViewModel, Commodity } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Fetches all data required for the RFQ Edit/Creation wizard (SCR-013).
 * It fetches the RFQ draft, its parent project's BOM parts, the user's suppliers,
 * and the field configurations needed to build the form.
 *
 * @param rfqId The ID of the RFQ draft to fetch.
 * @param userId The ID of the user making the request for authorization.
 * @returns A promise resolving to an RfqEditViewModel or null.
 */
export async function getRfqEditData(rfqId: string, userId: string): Promise<RfqEditViewModel | null> {
  const tableName = process.env.ENTITY_GRAPH_TABLE;
  if (!tableName) {
    log_error('ENTITY_GRAPH_TABLE environment variable is not set.');
    throw new Error('Server configuration error.');
  }

  log_info(`Fetching RFQ edit data for: ${rfqId}`, { rfqId, userId });

  try {
    // 1. Fetch the RFQ item itself
    const rfqQuery = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `RFQ#${rfqId}`, ':sk': 'METADATA' },
    });
    const { Items: rfqItems } = await docClient.send(rfqQuery);
    const rfq = rfqItems?.[0] as RFQ | undefined;

    if (!rfq) {
      log_info(`RFQ not found: ${rfqId}`, { rfqId });
      return null;
    }
    
    // Authorization check
    if (rfq.ownerId !== userId) {
        log_error('Authorization error: User does not own the RFQ.', { rfqId, userId });
        return null;
    }

    // 2. Fetch ancillary data concurrently
    const projectPromise = docClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': `PROJECT#${rfq.projectId}` },
    }));

    const masterFieldsPromise = docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'CONFIG#MASTER_FIELD_LIST' },
    }));

    const suppliersPromise = docClient.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'SUPPLIER#' },
      ProjectionExpression: 'supplierId, supplierName, commodityIds, contactEmail, previousRFQs',
    }));
    
    const commoditiesPromise = docClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'CONFIG#COMMODITIES' },
    }));

    const [{ Items: projectItems }, { Items: configItems }, { Items: supplierItems }, { Items: flatCommodities }] = await Promise.all([projectPromise, masterFieldsPromise, suppliersPromise, commoditiesPromise]);

    // Process Project Data
    const project = projectItems?.find(item => item.entityType === 'PROJECT') as Project | undefined;
    if (!project) throw new Error(`Parent project with ID ${rfq.projectId} not found.`);
    const bomParts = projectItems?.filter(item => item.entityType === 'BOM_PART') as BOMPart[];

    // Process Master Fields
    if (!configItems || configItems.length === 0) {
      throw new Error('Master Field List configuration not found.');
    }
    const allFields = configItems as MasterField[];
    
    // Process Suppliers
    const suppliers: SupplierSummary[] = (supplierItems || []).map(item => ({
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        commodityIds: item.commodityIds || [],
        email: item.contactEmail,
        previousRFQs: item.previousRFQs || 0,
    }));

    // Process Commodities
    const categorizedCommodities = (flatCommodities as Commodity[] || []).reduce((acc, commodity) => {
        const { category, categoryDescription } = commodity;
        let catGroup = acc.find(g => g.category === category);
        if (!catGroup) {
            catGroup = { category, categoryDescription, commodities: [] };
            acc.push(catGroup);
        }
        catGroup.commodities.push({
            id: commodity.commodityId,
            name: commodity.name,
            description: commodity.description,
            tickerSymbol: commodity.tickerSymbol,
        });
        return acc;
    }, [] as CategorizedCommodityViewModel[]);

    return {
      rfq,
      bomParts,
      suppliers,
      projectFields: allFields.filter(f => f.group === 'Project'),
      partFields: allFields.filter(f => f.group === 'BOM'),
      categorizedCommodities,
    };

  } catch (error) {
    log_error('Failed to query RFQ edit data from DynamoDB', { rfqId, error });
    throw new Error('An error occurred while fetching RFQ data.');
  }
}