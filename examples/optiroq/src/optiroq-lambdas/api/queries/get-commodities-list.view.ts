import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { CommodityViewModel, Commodity, CategorizedCommodityViewModel } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE } = process.env;

/**
 * Fetches the complete list of configured commodities, grouped by category.
 * @returns A promise resolving to an array of CategorizedCommodityViewModels.
 */
export async function getCommoditiesList(): Promise<CategorizedCommodityViewModel[]> {
  if (!ENTITY_GRAPH_TABLE) {
    log_error('ENTITY_GRAPH_TABLE environment variable is not set.');
    throw new Error('Server configuration error.');
  }

  log_info('Fetching categorized commodities list');

  try {
    const command = new QueryCommand({
      TableName: ENTITY_GRAPH_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'CONFIG#COMMODITIES' },
    });

    const { Items } = await docClient.send(command);
    const flatCommodities = (Items as Commodity[]) || [];

    if (flatCommodities.length === 0) {
        return [];
    }

    // Group commodities by category
    const grouped = flatCommodities.reduce((acc, commodity) => {
        const { category, categoryDescription } = commodity;
        if (!acc[category]) {
            acc[category] = {
                category,
                categoryDescription,
                commodities: []
            };
        }
        acc[category].commodities.push({
            id: commodity.commodityId,
            name: commodity.name,
            description: commodity.description,
            tickerSymbol: commodity.tickerSymbol,
        });
        return acc;
    }, {} as Record<string, CategorizedCommodityViewModel>);

    const result = Object.values(grouped);

    log_info(`Found ${flatCommodities.length} commodities across ${result.length} categories.`);
    return result;
  } catch (error) {
    log_error('Failed to query commodities from DynamoDB', { error });
    throw new Error('An error occurred while fetching commodities.');
  }
}