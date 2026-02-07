import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { UpdateCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { RFQ } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE } = process.env;

interface StepInput {
  extractedData: Partial<RFQ>;
  rfqId: string;
  correlationId: string;
}

/**
 * @description Receives extracted RFQ data from an LLM, validates it, and updates
 * the RFQ draft in DynamoDB from 'DRAFT_PROCESSING' to 'DRAFT'.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<{ status: string }> => {
  const { extractedData, rfqId, correlationId } = event.stepInput;
  log_info('Validating and saving RFQ draft', { correlationId, rfqId });

  if (!ENTITY_GRAPH_TABLE) {
    throw new Error('ENTITY_GRAPH_TABLE environment variable is not set.');
  }

  // TODO: Add robust validation logic here using Zod or similar.
  // For now, we assume the LLM output is in a reasonable format.

  const updateExpressions: string[] = ['#status = :draftStatus'];
  const expressionAttributeNames: Record<string, string> = { '#status': 'status' };
  const expressionAttributeValues: Record<string, any> = { ':draftStatus': 'DRAFT' };
  
  // Dynamically build update expression from extracted data
  for (const key in extractedData) {
    const value = (extractedData as any)[key];
    if (value !== undefined && value !== null) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  }

  try {
    await docClient.send(new UpdateCommand({
      TableName: ENTITY_GRAPH_TABLE,
      Key: { PK: `RFQ#${rfqId}`, SK: 'METADATA' },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(PK)', // Ensure the item exists
    }));

    log_info('Successfully saved RFQ draft', { rfqId });
    return { status: 'success' };
  } catch (error) {
    log_error('Failed to save RFQ draft', { rfqId, error });
    // This could trigger a compensating action, like setting status to DRAFT_FAILED
    throw error;
  }
};