// allma-core/examples/optiroq/src/optiroq-lambdas/api/queries/get-projects-list.view.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { ProjectsListViewModel, ProjectSummary } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Fetches the list of all projects in the system.
 * Uses GSI1 to efficiently query all projects, sorted by last modified date.
 *
 * @param userId The Cognito user ID (`sub`) of the user requesting projects.
 * @returns A promise that resolves to a ProjectsListViewModel.
 */
export async function getProjectsList(userId: string): Promise<ProjectsListViewModel> {
  const tableName = process.env.ENTITY_GRAPH_TABLE;
  if (!tableName) {
    log_error('ENTITY_GRAPH_TABLE environment variable is not set.');
    throw new Error('Server configuration error.');
  }

  log_info(`Fetching all projects for user: ${userId}`);

  try {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'PROJECTS',
      },
      // Sort by most recently created/updated first
      ScanIndexForward: false,
      // Fetch only the attributes needed for the summary list to optimize payload size
      ProjectionExpression: 'projectId, projectName, customerName, commodity, #st, deadlineDate, progressPercentage, supplierCount',
      ExpressionAttributeNames: {
        '#st': 'status', // 'status' is a reserved keyword
      },
    });

    const { Items } = await docClient.send(command);

    const projects: ProjectSummary[] = (Items || []).map(item => ({
      projectId: item.projectId,
      projectName: item.projectName,
      customerName: item.customerName,
      commodity: item.commodity,
      status: item.status,
      deadlineDate: item.deadlineDate,
      progressPercentage: item.progressPercentage,
      supplierCount: item.supplierCount,
    }));
    
    log_info(`Found ${projects.length} projects in total.`, { userId });

    return { projects };

  } catch (error) {
    log_error('Failed to query projects from DynamoDB', { userId, error });
    // Re-throw a generic error to avoid exposing implementation details to the client
    throw new Error('An error occurred while fetching projects.');
  }
}