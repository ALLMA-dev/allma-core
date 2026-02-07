import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  QueryCommand,
  BatchWriteCommand,
  UpdateCommand,
  DynamoDBDocumentClient,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { Project, BOMPart, CommunicationEvent } from '@optiroq/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ENTITY_GRAPH_TABLE } = process.env;
const DYNAMODB_BATCH_DELETE_LIMIT = 25;

/**
 * Fetches the project metadata item.
 * @param projectId The ID of the project.
 * @returns The project metadata item or null if not found.
 */
async function getProject(projectId: string): Promise<Project | null> {
  const { Item } = await docClient.send(new GetCommand({
    TableName: ENTITY_GRAPH_TABLE,
    Key: { PK: `PROJECT#${projectId}`, SK: 'METADATA' },
  }));
  return (Item as Project) || null;
}

/**
 * Fetches all items associated with a given project PK.
 * @param projectId The ID of the project.
 * @returns An array of all DynamoDB items for the project.
 */
async function getAllProjectItems(projectId: string): Promise<Record<string, any>[]> {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: ENTITY_GRAPH_TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `PROJECT#${projectId}` },
  }));
  return Items || [];
}

/**
 * Deletes a list of items from DynamoDB in batches.
 * @param items The items to delete.
 */
async function batchDeleteItems(items: { PK: string; SK: string }[]): Promise<void> {
  if (items.length === 0) return;

  for (let i = 0; i < items.length; i += DYNAMODB_BATCH_DELETE_LIMIT) {
    const chunk = items.slice(i, i + DYNAMODB_BATCH_DELETE_LIMIT);
    const deleteRequests = chunk.map(item => ({
      DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
    }));

    await docClient.send(new BatchWriteCommand({
      RequestItems: { [ENTITY_GRAPH_TABLE!]: deleteRequests },
    }));
  }
}

/**
 * Checks if any RFQs associated with a project have sent communications.
 * @param bomParts The list of BOM parts for the project.
 * @returns A boolean indicating if communications were found.
 */
async function hasSentCommunications(bomParts: BOMPart[]): Promise<boolean> {
  const rfqIds = [...new Set(bomParts.map(p => p.rfqId).filter(Boolean))];
  if (rfqIds.length === 0) return false;

  for (const rfqId of rfqIds) {
    const { Items } = await docClient.send(new QueryCommand({
      TableName: ENTITY_GRAPH_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `RFQ#${rfqId}`, ':sk': 'COMM#' },
      Select: 'COUNT',
    }));
    if ((Items?.[0]?.Count ?? 0) > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Updates the status of a project.
 * @param projectId The ID of the project.
 * @param newStatus The new status to set.
 */
async function updateProjectStatus(projectId: string, newStatus: Project['status']): Promise<void> {
  await docClient.send(new UpdateCommand({
    TableName: ENTITY_GRAPH_TABLE,
    Key: { PK: `PROJECT#${projectId}`, SK: 'METADATA' },
    UpdateExpression: 'SET #status = :status, #lastModified = :now',
    ExpressionAttributeNames: { '#status': 'status', '#lastModified': 'lastModified' },
    ExpressionAttributeValues: { ':status': newStatus, ':now': new Date().toISOString() },
  }));
}

/**
 * Handles the 'deleteProject' command.
 * - Deletes non-active projects permanently.
 * - Moves active projects to 'DRAFT' if no communications are sent.
 * - Archives active or completed projects if communications have been sent.
 */
export async function deleteProject(
  projectId: string,
  userId: string
): Promise<{ status: string; message: string }> {
  if (!ENTITY_GRAPH_TABLE) {
    log_error('Server configuration error: ENTITY_GRAPH_TABLE not set.');
    throw new Error('Server configuration error.');
  }

  log_info('Handling deleteProject command', { projectId, userId });

  const allItems = await getAllProjectItems(projectId);
  if (allItems.length === 0) {
    throw new Error('Project not found.');
  }

  const project = allItems.find(item => item.SK === 'METADATA') as Project;
  if (project.ownerId !== userId) {
    log_error('Authorization failed: User does not own the project.', { projectId, userId });
    throw new Error('You are not authorized to perform this action.');
  }

  switch (project.status) {
    case 'DRAFT':
    case 'DRAFT_AWAITING_REVIEW':
    case 'DRAFT_PROCESSING':
    case 'DRAFT_FAILED':
      log_info('Performing hard delete for non-active project', { projectId });
      await batchDeleteItems(allItems as { PK: string, SK: string }[]);
      return { status: 'deleted', message: 'Project has been permanently deleted.' };

    case 'ACTIVE':
      const bomParts = allItems.filter(item => item.entityType === 'BOM_PART') as BOMPart[];
      const hasComms = await hasSentCommunications(bomParts);
      if (hasComms) {
        log_info('Archiving active project with communications', { projectId });
        await updateProjectStatus(projectId, 'ARCHIVED');
        return { status: 'archived', message: 'Project has been archived as it has active communications.' };
      } else {
        log_info('Moving active project with no communications to draft', { projectId });
        await updateProjectStatus(projectId, 'DRAFT');
        return { status: 'moved_to_draft', message: 'Project has been moved to drafts. It can now be deleted permanently.' };
      }

    case 'COMPLETED':
      log_info('Archiving completed project', { projectId });
      await updateProjectStatus(projectId, 'ARCHIVED');
      return { status: 'archived', message: 'Completed project has been archived.' };

    case 'ARCHIVED':
      log_info('Attempted to delete an already archived project', { projectId });
      return { status: 'no_action', message: 'Project is already archived.' };
    
    default:
      log_error('Attempted to delete project with unknown status', { projectId, status: project.status });
      throw new Error(`Cannot delete project with status '${project.status}'.`);
  }
}