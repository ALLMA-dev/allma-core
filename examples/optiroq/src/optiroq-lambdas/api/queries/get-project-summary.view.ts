// allma-core/examples/optiroq/src/optiroq-lambdas/api/queries/get-project-summary.view.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { Project, BOMPart, ProjectSummaryViewModel, MasterField, RFQ, RfqSummary } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Fetches all data required for the Project Summary view for a specific project.
 * This includes project metadata, all associated BOM parts, and the necessary
 * field definitions for rendering dynamic tables.
 *
 * @param projectId The ID of the project to fetch.
 * @param userId The ID of the user making the request, for authorization.
 * @returns A promise that resolves to a ProjectSummaryViewModel or null if not found/authorized.
 */
export async function getProjectSummary(projectId: string, userId: string): Promise<ProjectSummaryViewModel | null> {
  const tableName = process.env.ENTITY_GRAPH_TABLE;
  if (!tableName) {
    log_error('ENTITY_GRAPH_TABLE environment variable is not set.');
    throw new Error('Server configuration error.');
  }

  log_info(`Fetching Summary data for project: ${projectId}`, { projectId, userId });

  try {
    // Concurrently fetch project items, RFQs, and master fields for efficiency
    const projectItemsPromise = docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `PROJECT#${projectId}` },
    }));
    
    const rfqItemsPromise = docClient.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
      ExpressionAttributeValues: { ':pk': `PROJECT#${projectId}`, ':sk': 'RFQ#' },
    }));

    const masterFieldsPromise = docClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'CONFIG#MASTER_FIELD_LIST' },
    }));

    const [projectDataResult, rfqDataResult, masterFieldsResult] = await Promise.all([
      projectItemsPromise,
      rfqItemsPromise,
      masterFieldsPromise
    ]);

    const { Items: projectItems } = projectDataResult;

    if (!projectItems || projectItems.length === 0) {
      log_info(`Project not found: ${projectId}`, { projectId });
      return null;
    }

    const project = projectItems.find(item => item.entityType === 'PROJECT') as Project | undefined;

    // MODIFIED: Removed owner check for read access, as per new requirements.
    // Destructive actions will still be protected by an ownership check in their respective command handlers.
    if (!project) {
        log_info(`Project metadata not found for project: ${projectId}`, { projectId });
        return null;
    }

    const bomParts = projectItems.filter(item => item.entityType === 'BOM_PART') as BOMPart[];
    
    const { Items: rfqItems } = rfqDataResult;
    const rfqSummaries: RfqSummary[] = (rfqItems as RFQ[] || []).map(rfq => ({
      rfqId: rfq.rfqId,
      status: rfq.status,
      parts: rfq.parts,
      supplierCount: rfq.suppliers.filter(s => s.selected).length,
      responseDeadline: rfq.responseDeadline,
    }));

    const { Items: configItems } = masterFieldsResult;
    if (!configItems || configItems.length === 0) {
        throw new Error('Master Field List configuration not found in the database.');
    }
    const allFields = configItems as MasterField[];
    const partFields = allFields.filter(f => f.group === 'BOM');

    log_info(`Found project, ${bomParts.length} BOM parts, and ${rfqSummaries.length} RFQs.`, { projectId });

    // Construct the view model with all necessary data for the frontend
    return {
      project,
      bomParts,
      rfqSummaries,
      quoteDetails: {
        uiPayload: partFields, // Provide field definitions for the parts list table
        data: {}, // Placeholder for future quote-specific data
      },
    };

  } catch (error) {
    log_error('Failed to query project Summary data from DynamoDB', { projectId, error });
    throw new Error('An error occurred while fetching project details.');
  }
}