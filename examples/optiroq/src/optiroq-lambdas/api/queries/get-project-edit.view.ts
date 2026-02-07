import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, GetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { log_info, log_error } from '@allma/core-sdk';
import { Project, BOMPart, ProjectEditViewModel, MasterField, SystemSettings, CategorizedCommodityViewModel, Commodity } from '@optiroq/types';
import { randomUUID } from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Fetches all data required for the Project Initiation view.
 * If a valid projectId is provided, it fetches the draft project and its parts.
 * If 'new' is provided, it returns a shell with a new projectId and field configurations.
 *
 * @param projectId The ID of the project to fetch, or 'new'.
 * @param userId The ID of the user making the request for authorization.
 * @returns A promise resolving to a ProjectInitiationViewModel or null.
 */
export async function getProjectEditData(projectId: string, userId: string): Promise<ProjectEditViewModel | null> {
  const tableName = process.env.ENTITY_GRAPH_TABLE;
  if (!tableName) {
    log_error('ENTITY_GRAPH_TABLE environment variable is not set.');
    throw new Error('Server configuration error.');
  }

  log_info(`Fetching initiation data for project: ${projectId}`, { projectId, userId });

  try {
    // 1. Fetch Master Field configuration, System Settings, and Commodities concurrently
    const configQuery = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'CONFIG#MASTER_FIELD_LIST' },
    });
    
    const settingsQuery = new GetCommand({
      TableName: tableName,
      Key: { PK: 'CONFIG#SYSTEM_SETTINGS', SK: 'BASE_UNITS' },
    });

    const commoditiesQuery = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'CONFIG#COMMODITIES' },
    });

    const [configResult, settingsResult, commoditiesResult] = await Promise.all([
      docClient.send(configQuery),
      docClient.send(settingsQuery),
      docClient.send(commoditiesQuery)
    ]);
    
    const { Items: configItems } = configResult;
    if (!configItems || configItems.length === 0) throw new Error('Master Field List configuration not found.');
    const allFields = configItems as MasterField[];
    
    const { Item: settings } = settingsResult;
    if (!settings) throw new Error('System settings not found.');

    const { Items: flatCommodities } = commoditiesResult;
    const categorizedCommodities = (flatCommodities as Commodity[] || []).reduce((acc, commodity) => {
        const { category, categoryDescription } = commodity;
        let catGroup = acc.find(g => g.category === category);
        if (!catGroup) {
            catGroup = { category, categoryDescription, commodities: [] };
            acc.push(catGroup);
        }
        catGroup.commodities.push({
            id: commodity.commodityId,
            name: commodity.name,
            description: commodity.description,
        });
        return acc;
    }, [] as CategorizedCommodityViewModel[]);
    
    const projectFields = allFields.filter(f => f.group === 'Project');
    const partFields = allFields.filter(f => f.group === 'BOM');

    // 2. Handle 'new' project creation
    if (projectId === 'new') {
      const newProjectId = `PRJ-${new Date().getFullYear()}-${randomUUID().split('-')[0].toUpperCase()}`;
      return {
        project: {
          projectId: newProjectId,
          ownerId: userId,
          status: 'DRAFT',
          methodUsed: 'scratch',
          defaultCurrency: (settings as SystemSettings).baseCurrency,
          defaultWeightUnit: (settings as SystemSettings).baseWeight,
        },
        bomParts: [],
        projectFields,
        partFields,
        categorizedCommodities,
      };
    }

    // 3. Handle existing draft project
    const projectQuery = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `PROJECT#${projectId}` },
    });
    const { Items: projectItems } = await docClient.send(projectQuery);

    if (!projectItems || projectItems.length === 0) {
      log_info(`Project not found: ${projectId}`, { projectId });
      return null;
    }

    const project = projectItems.find(item => item.entityType === 'PROJECT') as Project | undefined;

    if (!project || project.ownerId !== userId) {
      log_error('Authorization error: User does not own the project.', { projectId, userId });
      return null;
    }

    const bomParts = projectItems.filter(item => item.entityType === 'BOM_PART') as BOMPart[];
    log_info(`Found project and ${bomParts.length} BOM parts.`, { projectId });

    return {
      project,
      bomParts,
      projectFields,
      partFields,
      categorizedCommodities,
    };

  } catch (error) {
    log_error('Failed to query project initiation data from DynamoDB', { projectId, error });
    throw new Error('An error occurred while fetching project data.');
  }
}