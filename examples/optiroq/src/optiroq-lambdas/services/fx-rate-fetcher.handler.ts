import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { FxRates } from '@optiroq/types';

const smClient = new SecretsManagerClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const { 
    FX_RATES_TABLE, 
    FX_API_KEY_SECRET_ARN, 
    FX_API_URL,
    BASE_CURRENCY 
} = process.env;

/**
 * Fetches the API key from AWS Secrets Manager.
 */
async function getApiKey(): Promise<string> {
  if (!FX_API_KEY_SECRET_ARN) throw new Error('FX_API_KEY_SECRET_ARN is not set.');
  
  const command = new GetSecretValueCommand({ SecretId: FX_API_KEY_SECRET_ARN });
  const response = await smClient.send(command);
  
  if (!response.SecretString) throw new Error('SecretString is empty in Secrets Manager response.');
  
  const secret = JSON.parse(response.SecretString);
  return secret.apiKey;
}

/**
 * Fetches the latest exchange rates from the external provider.
 */
async function fetchLatestRates(apiKey: string): Promise<any> {
  if (!FX_API_URL || !BASE_CURRENCY) {
    throw new Error('FX_API_URL or BASE_CURRENCY is not set.');
  }
  const url = `${FX_API_URL}/${apiKey}/latest/${BASE_CURRENCY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch FX rates: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Scheduled Lambda to fetch and store the latest FX rates.
 */
export const handler = async (): Promise<void> => {
  console.log('Starting FX rate fetcher...');

  if (!FX_RATES_TABLE) {
    throw new Error('FX_RATES_TABLE environment variable not set.');
  }

  try {
    const apiKey = await getApiKey();
    const rawRates = await fetchLatestRates(apiKey);

    if (rawRates.result !== 'success') {
      throw new Error(`FX API returned an error: ${rawRates['error-type']}`);
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const rates: FxRates = {
      base: rawRates.base_code,
      timestamp: new Date(rawRates.time_last_update_unix * 1000).toISOString(),
      rates: rawRates.conversion_rates,
    };
    
    // Ensure base currency is in the rates map with a value of 1 for consistency
    if (!rates.rates[rates.base]) {
        rates.rates[rates.base] = 1.0;
    }

    // Write two records: one for today's date and one for 'LATEST' for quick lookups
    const historicalItem = {
        PK: `RATE#${today}`,
        SK: rates.base,
        ...rates
    };

    const latestItem = {
        PK: 'RATE#LATEST',
        SK: rates.base,
        ...rates
    };

    await docClient.send(new BatchWriteCommand({
        RequestItems: {
            [FX_RATES_TABLE]: [
                { PutRequest: { Item: historicalItem } },
                { PutRequest: { Item: latestItem } },
            ]
        }
    }));

    console.log(`Successfully fetched and stored FX rates for ${rates.base} based on timestamp ${rates.timestamp}.`);
  } catch (error) {
    console.error('FX rate fetcher failed:', error);
    // Allow the invocation to fail so CloudWatch Alarms can trigger
    throw error;
  }
};