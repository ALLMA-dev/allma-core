import { Anomaly, Quote, Comment, CommentSource, AnomalySeverity, AnomalyStatus, CommodityQuotePrice, ConvertibleValue, BOMPart, Commodity } from '@optiroq/types';
import { log_info, log_error } from '@allma/core-sdk';
import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE } = process.env;

interface StepInput {
  quoteData: Record<string, any>;
  anomalies: Omit<Anomaly, 'PK' | 'SK' | 'entityType'>[];
  comments: string[];
  riskScore: number;
  rfqId: string;
  supplierName: string;
  round: number;
  projectId: string;
  commodities: Commodity[];
  correlationId: string;
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step.
 * Composes a DynamoDB BatchWriteItem `requests` array to atomically save the
 * processed Quote, its associated Anomalies, extracted Comments, and historical Commodity Prices.
 * @returns A BatchWriteItem `requests` array.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<{ requests: any[] }> => {
  const { quoteData, anomalies, comments, riskScore, rfqId, supplierName, round, projectId, commodities, correlationId } = event.stepInput;
  log_info('Composing batch write payload for quote finalization', { correlationId, rfqId });

  if (!ENTITY_GRAPH_TABLE) {
    throw new Error('ENTITY_GRAPH_TABLE environment variable is not set.');
  }

  try {
    const now = new Date().toISOString();
    const requests = [];

    // --- Fetch BOM parts for the project to get material info ---
    const bomPartsResult = await docClient.send(new QueryCommand({
        TableName: ENTITY_GRAPH_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': `PROJECT#${projectId}`,
            ':sk': 'BOM_PART#',
        },
    }));
    const bomParts = (bomPartsResult.Items as BOMPart[]) || [];
    const bomPartMap = new Map(bomParts.map(p => [p.partName, p]));

    // 1. Prepare the main QUOTE item
    const quoteSK = `QUOTE#SUPPLIER#${supplierName}#ROUND#${round}#VERSION#1` as Quote['SK'];
    const hasHighSeverityAnomaly = anomalies.some(a => a.originalSeverity === AnomalySeverity.HIGH);

    const quoteItem: Quote = {
      PK: `RFQ#${rfqId}`,
      SK: quoteSK,
      entityType: 'QUOTE',
      supplierName,
      round,
      version: 1,
      receivedAt: now,
      status: hasHighSeverityAnomaly ? 'BLOCKED_AWAITING_REVIEW' : 'AWAITING_REVIEW',
      riskScore,
      quoteData,
    };
    requests.push({ PutRequest: { Item: quoteItem } });

    // 2. Prepare ANOMALY items
    for (const anomaly of anomalies) {
      const anomalyId = randomUUID();
      const anomalyItem: Anomaly = {
        ...anomaly,
        PK: `RFQ#${rfqId}`,
        SK: `ANOMALY#${anomalyId}`,
        entityType: 'ANOMALY',
        GSI1PK: `RFQ#${rfqId}#SUPPLIER#${supplierName}`,
        GSI1SK: `SEVERITY#${anomaly.originalSeverity}`,
        anomalyId,
        quoteSK,
        supplierId: supplierName,
        status: AnomalyStatus.NEEDS_REVIEW,
        isManual: false,
        createdAt: now,
        lastModified: now,
      };
      requests.push({ PutRequest: { Item: anomalyItem } });
    }

    // 3. Prepare COMMENT items
    for (const commentText of comments) {
      const commentId = randomUUID();
      const commentItem: Comment = {
        PK: `RFQ#${rfqId}`,
        SK: `COMMENT#${commentId}`,
        entityType: 'COMMENT',
        commentId,
        commentSource: CommentSource.EXTRACTED,
        supplierId: supplierName,
        commentText,
        createdAt: now,
      };
      requests.push({ PutRequest: { Item: commentItem } });
    }

    // 4. Prepare COMMODITY_QUOTE_PRICE items
    for (const partName in quoteData) {
        if (partName === '_global') continue;
        
        const partData = quoteData[partName];
        const bomPart = bomPartMap.get(partName);

        if (bomPart && bomPart.material && partData.materialCost) {
            const materialLower = bomPart.material.toLowerCase();
            const matchingCommodity = commodities.find(c => 
                materialLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(materialLower)
            );
            
            if (matchingCommodity) {
                const materialCost = partData.materialCost as ConvertibleValue;
                if(materialCost.normalizedValue && materialCost.normalizedUnit) {
                    const priceItem: CommodityQuotePrice = {
                        PK: `COMMODITY#${matchingCommodity.commodityId}`,
                        SK: `PRICE#SUPPLIER#${supplierName}#${now}`,
                        entityType: 'COMMODITY_QUOTE_PRICE',
                        price: materialCost.normalizedValue,
                        currency: materialCost.normalizedUnit,
                        rfqId,
                        partName,
                        quoteSK,
                        timestamp: now,
                    };
                    requests.push({ PutRequest: { Item: priceItem } });
                }
            }
        }
    }

    log_info(`Composed ${requests.length} batch write requests.`, { correlationId });
    return { requests };

  } catch (error) {
    log_error('Failed to compose batch write payload', { correlationId, error });
    throw error;
  }
};