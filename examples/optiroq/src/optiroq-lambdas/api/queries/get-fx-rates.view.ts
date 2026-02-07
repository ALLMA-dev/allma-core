import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { CurrencyAndCommodityViewModel, FxRates, CommodityPrice, SystemSettings, CommodityPrices, Commodity } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE, FX_RATES_TABLE, COMMODITY_PRICES_TABLE } = process.env;

/**
 * Fetches the latest currency exchange rates and commodity prices.
 * @returns A promise resolving to the CurrencyAndCommodityViewModel.
 */
export async function getFxRates(): Promise<CurrencyAndCommodityViewModel> {
  if (!FX_RATES_TABLE || !ENTITY_GRAPH_TABLE || !COMMODITY_PRICES_TABLE) {
    log_error('Required environment variables are not set.');
    throw new Error('Server configuration error.');
  }

  log_info('Fetching latest FX rates and commodity data');

  try {
    const ratesPromise = docClient.send(new GetCommand({
      TableName: FX_RATES_TABLE,
      Key: { PK: 'RATE#LATEST', SK: 'EUR' }, // Assuming EUR is the base
    }));

    const settingsPromise = docClient.send(new GetCommand({
      TableName: ENTITY_GRAPH_TABLE,
      Key: { PK: 'CONFIG#SYSTEM_SETTINGS', SK: 'BASE_UNITS' },
    }));
    
    const commodityPricesPromise = docClient.send(new GetCommand({
        TableName: COMMODITY_PRICES_TABLE,
        Key: { PK: 'PRICE#LATEST', SK: 'USD'}, // Assuming prices are fetched in USD
    }));

    const commodityDefsPromise = docClient.send(new QueryCommand({
        TableName: ENTITY_GRAPH_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'CONFIG#COMMODITIES' },
    }));

    const [
        { Item: ratesItem }, 
        { Item: settingsItem },
        { Item: commodityPricesItem },
        { Items: commodityDefItems }
    ] = await Promise.all([ratesPromise, settingsPromise, commodityPricesPromise, commodityDefsPromise]);

    if (!ratesItem) throw new Error('Latest FX rates not found in the database.');
    if (!settingsItem) throw new Error('System settings for base units not found.');

    const rates = ratesItem as FxRates;
    const settings = settingsItem as SystemSettings;
    
    let commodities: CommodityPrice[] = [];
    if (commodityPricesItem && commodityDefItems) {
        const prices = commodityPricesItem as CommodityPrices;
        const commodityMap = new Map((commodityDefItems as Commodity[]).map(c => [c.tickerSymbol, c]));

        commodities = Object.entries(prices.prices).map(([ticker, price]) => {
            const def = commodityMap.get(ticker);
            return {
                id: def?.commodityId || ticker,
                name: def?.name || ticker,
                price: price,
                currency: prices.base,
                unit: prices.unit,
                lastUpdatedAt: prices.timestamp,
            };
        });
    } else {
        log_info('Commodity prices or definitions not found, returning empty commodity list.');
    }

    return {
      rates,
      commodities,
      baseCurrency: settings.baseCurrency,
    };
  } catch (error) {
    log_error('Failed to query FX rates or commodity data from DynamoDB', { error });
    throw new Error('An error occurred while fetching exchange rates.');
  }
}