import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { UpdateCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ProjectData } from '@optiroq/types';
import { log_info, log_error } from '@allma/core-sdk';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

interface StepInput {
  projectData: ProjectData;
  partsCount: number;
  projectId: string;
  bomFileName?: string;
  userId?: string;
  correlationId: string;
}

/**
 * @description Updates an existing PROJECT draft with the extracted data from the BOM file.
 * NOTE: The filename `create-project-draft` is now misleading. This function performs an UPDATE.
 * It should be renamed to `update-project-with-bom-data` in a future refactor.
 */
export const handler = async (event: { stepInput: StepInput }) => {
  const tableName = process.env.ENTITY_GRAPH_TABLE;
  const { projectData, partsCount, projectId, correlationId } = event.stepInput;
  log_info('Updating project draft with BOM data', { correlationId, projectId: projectId });

  if (!tableName) {
    throw new Error('ENTITY_GRAPH_TABLE environment variable is not set.');
  }
  if (!projectId) {
    log_error('Cannot update project: projectId is missing from step input.', { correlationId });
    throw new Error('Project ID is missing, cannot update project.');
  }

  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  // Dynamically build the update expression based on extracted project data
  for (const key in projectData) {
    if (Object.prototype.hasOwnProperty.call(projectData, key)) {
      const value = projectData[key];
      if (value !== undefined && value !== null) {
        const attrNameKey = `#${key}`;
        const attrValueKey = `:${key}`;
        updateExpressions.push(`${attrNameKey} = ${attrValueKey}`);
        expressionAttributeNames[attrNameKey] = key;
        expressionAttributeValues[attrValueKey] = value;
      }
    }
  }

  // Always update total parts count and last modified timestamp
  updateExpressions.push('#stats_totalPartsCount = :partsCount');
  expressionAttributeNames['#stats_totalPartsCount'] = 'stats_totalPartsCount';
  expressionAttributeValues[':partsCount'] = partsCount;

  updateExpressions.push('#lastModified = :lastModified');
  expressionAttributeNames['#lastModified'] = 'lastModified';
  expressionAttributeValues[':lastModified'] = new Date().toISOString();


  if (updateExpressions.length === 0) {
    log_info('No project data to update.', { correlationId, projectId });
    return { status: 'success', projectId };
  }

  const updateCommand = new UpdateCommand({
    TableName: tableName,
    Key: {
      PK: `PROJECT#${projectId}`,
      SK: 'METADATA',
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'UPDATED_NEW',
  });

  try {
    await docClient.send(updateCommand);
    log_info('Successfully updated project draft with extracted BOM data', { correlationId, projectId });
    // Pass through projectId for subsequent steps
    return { status: 'success', projectId: projectId };
  } catch (error) {
    log_error('Failed to update project draft in DynamoDB', { correlationId, error });
    throw error;
  }
};