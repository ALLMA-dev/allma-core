import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { BOMPart } from '@optiroq/types';
import { log_info, log_error } from '@allma/core-sdk';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

interface ClassificationResult {
  matchStatus: 'MATCH' | 'NO_MATCH';
  confidenceScore: number;
  matchedContractId: string | null;
  reasoning: string;
}

interface StepInput {
  part: BOMPart;
  classificationResult: ClassificationResult;
  projectId: string;
  correlationId: string;
}

/**
 * @description Persists a single, classified BOM_PART item to DynamoDB.
 * This is the final step within the parallel classification branch.
 */
export const handler = async (event: { stepInput: StepInput }) => {
  const { part, classificationResult, projectId, correlationId } = event.stepInput;
  const partIdentifier = part.partName || 'UnknownPart';
  log_info('Persisting classified part', { correlationId, projectId, partName: partIdentifier });

  const tableName = process.env.ENTITY_GRAPH_TABLE;
  if (!tableName) {
    throw new Error('ENTITY_GRAPH_TABLE environment variable is not set.');
  }

  const finalPart: Partial<BOMPart> = { ...part };

  if (classificationResult.matchStatus === 'MATCH') {
    if (!classificationResult.matchedContractId) {
      const errorMessage = 'Inconsistent classification: status is MATCH but matchedContractId is null.';
      log_error(errorMessage, { correlationId, projectId, partName: partIdentifier, classificationResult });
      throw new Error(errorMessage);
    }

    finalPart.partStatus = 'EXISTING';
    finalPart.classificationConfidence = classificationResult.confidenceScore;
    finalPart.existingPartDetails = {
      // In a real scenario, we would fetch details using the matchedContractId
      // For MVP, we'll just store the ID and let the UI fetch details later.
      contractId: classificationResult.matchedContractId,
      currentPrice: undefined, // to be enriched later
      currentSupplier: undefined, // to be enriched later
    };
  } else {
    finalPart.partStatus = 'NEW';
    const confidence = 1.0 - classificationResult.confidenceScore;
    finalPart.classificationConfidence = parseFloat(confidence.toFixed(4));
  }

  const partItem = {
    PK: `PROJECT#${projectId}`,
    SK: `BOM_PART#${part.partName}`,
    entityType: 'BOM_PART',
    rfqStatus: 'NOT_STARTED',
    ...finalPart,
  };

  try {
    await docClient.send(new PutCommand({ TableName: tableName, Item: partItem }));
    log_info('Successfully persisted part', { correlationId, projectId, partName: partIdentifier });
    return { status: 'success', partName: part.partName, classification: finalPart.partStatus };
  } catch (error) {
    log_error(`Failed to persist part ${part.partName} for project ${projectId}`, { correlationId, error });
    throw error;
  }
};
