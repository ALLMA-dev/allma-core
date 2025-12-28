import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  TransactWriteCommand,
  BatchGetCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import {
  Agent,
  AgentSchema,
  AgentMetadataStorageItem,
  CreateAgentInput,
  UpdateAgentInput,
  ITEM_TYPE_ALLMA_AGENT,
  ENV_VAR_NAMES,
  PermanentStepError,
} from '@allma/core-types';
import { fromStorageItem, log_info, log_error } from '@allma/core-sdk';
import { ScheduleService } from './schedule.service.js';

const CONFIG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME]!;
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const AgentService = {
  /**
   * Lists all agents, ensuring each returned object conforms to the AgentSchema.
   * Uses a Scan operation for robustness against GSI projection issues.
   */
  async list(): Promise<Agent[]> {
    // CORRECTED: Switched from Query to Scan to ensure all attributes are available for filtering.
    // This is more robust and guarantees finding the items regardless of GSI projection configuration.
    const { Items } = await ddbDocClient.send(
      new ScanCommand({
        TableName: CONFIG_TABLE_NAME,
        FilterExpression: 'itemType = :itemType AND SK = :skMetadata',
        ExpressionAttributeValues: {
          ':itemType': ITEM_TYPE_ALLMA_AGENT,
          ':skMetadata': 'METADATA',
        },
      }),
    );
    if (!Items) {
      return [];
    }

    const agents: Agent[] = [];
    for (const item of Items) {
      const apiItem = fromStorageItem<any, Agent>(item);
      // Safely parse the object. This validates the data and, crucially,
      // applies any default values from the schema (like `flowIds: []`).
      const result = AgentSchema.safeParse(apiItem);

      if (result.success) {
        agents.push(result.data);
      } else {
        log_error(
          'Invalid agent data found in DB, skipping item.',
          { id: (item as any).id, errors: result.error.flatten() },
          'AgentService.list',
        );
      }
    }
    return agents;
  },

  /**
   * Retrieves a single agent by its ID.
   */
  async get(id: string): Promise<Agent | null> {
    const { Item } = await ddbDocClient.send(
      new GetCommand({
        TableName: CONFIG_TABLE_NAME,
        Key: { PK: `AGENT#${id}`, SK: 'METADATA' },
      }),
    );
    return Item ? fromStorageItem<any, Agent>(Item) : null;
  },

  /**
   * Creates a new agent and its flow mappings.
   */
  async create(data: CreateAgentInput & { id?: string }): Promise<Agent> {
    const now = new Date().toISOString();
    const id = data.id || `agent-${uuidv4()}`;
    const fullData: Agent = { ...data, id, createdAt: now, updatedAt: now };

    const validatedData = AgentSchema.parse(fullData);
    const agentItem: AgentMetadataStorageItem = {
      ...validatedData,
      PK: `AGENT#${id}`,
      SK: 'METADATA',
      itemType: ITEM_TYPE_ALLMA_AGENT,
    };

    const transactItems: any[] = [{ Put: { TableName: CONFIG_TABLE_NAME, Item: agentItem } }];
    for (const flowId of validatedData.flowIds) {
      transactItems.push({
        Put: {
          TableName: CONFIG_TABLE_NAME,
          Item: { PK: `FLOW_DEF#${flowId}`, SK: `AGENT#${id}` },
        },
      });
    }

    await ddbDocClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    log_info(`Agent created: ${id}`, { flowCount: validatedData.flowIds.length });

    // Sync schedules for newly associated flows if the agent is enabled.
    if (validatedData.enabled && validatedData.flowIds.length > 0) {
      await ScheduleService.syncSchedulesForFlows(validatedData.flowIds);
    }

    return validatedData;
  },

  /**
   * Updates an existing agent, handling changes to flow mappings and enabled status.
   */
  async update(id: string, data: UpdateAgentInput): Promise<Agent> {
    const existing = await this.get(id);
    if (!existing) {
      throw new PermanentStepError(`Agent with ID ${id} not found.`);
    }

    const wasEnabled = existing.enabled;
    const oldFlowIds = new Set(existing.flowIds);
    const updatedData = { ...existing, ...data, updatedAt: new Date().toISOString() };
    const validatedData = AgentSchema.parse(updatedData);
    const newFlowIds = new Set(validatedData.flowIds);

    const agentItem: AgentMetadataStorageItem = {
      ...validatedData,
      PK: `AGENT#${id}`,
      SK: 'METADATA',
      itemType: ITEM_TYPE_ALLMA_AGENT,
    };

    const transactItems: any[] = [{ Put: { TableName: CONFIG_TABLE_NAME, Item: agentItem } }];
    const flowsToAdd = [...newFlowIds].filter((flowId) => !oldFlowIds.has(flowId));
    const flowsToRemove = [...oldFlowIds].filter((flowId) => !newFlowIds.has(flowId));

    for (const flowId of flowsToAdd) {
      transactItems.push({
        Put: {
          TableName: CONFIG_TABLE_NAME,
          Item: { PK: `FLOW_DEF#${flowId}`, SK: `AGENT#${id}` },
        },
      });
    }
    for (const flowId of flowsToRemove) {
      transactItems.push({
        Delete: {
          TableName: CONFIG_TABLE_NAME,
          Key: { PK: `FLOW_DEF#${flowId}`, SK: `AGENT#${id}` },
        },
      });
    }

    await ddbDocClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    log_info(`Agent updated: ${id}`, { added: flowsToAdd.length, removed: flowsToRemove.length });

    // If enabled status changed, we need to sync schedules for all affected flows.
    if (wasEnabled !== validatedData.enabled) {
      const allAffectedFlows = new Set([...oldFlowIds, ...newFlowIds]);
      await ScheduleService.syncSchedulesForFlows(Array.from(allAffectedFlows));
    }

    return validatedData;
  },

  /**
   * Deletes an agent and all its associated flow mappings.
   */
  async delete(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) {
      return; // Idempotent delete
    }

    const transactItems: any[] = [
      {
        Delete: {
          TableName: CONFIG_TABLE_NAME,
          Key: { PK: `AGENT#${id}`, SK: 'METADATA' },
        },
      },
    ];
    for (const flowId of existing.flowIds) {
      transactItems.push({
        Delete: {
          TableName: CONFIG_TABLE_NAME,
          Key: { PK: `FLOW_DEF#${flowId}`, SK: `AGENT#${id}` },
        },
      });
    }

    await ddbDocClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    log_info(`Agent deleted: ${id}`);

    // If the deleted agent was enabled, re-sync schedules for its former flows.
    if (existing.enabled && existing.flowIds.length > 0) {
      await ScheduleService.syncSchedulesForFlows(existing.flowIds);
    }
  },

  /**
   * Retrieves and merges flowVariables from all enabled agents associated with a flow.
   */
  async getAgentVariablesForFlow(flowId: string): Promise<Record<string, any>> {
    const { Items } = await ddbDocClient.send(new QueryCommand({
        TableName: CONFIG_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: { ':pk': `FLOW_DEF#${flowId}`, ':skPrefix': 'AGENT#' },
    }));

    if (!Items || Items.length === 0) {
        return {};
    }

    const agentIds = Items.map(item => item.SK.substring('AGENT#'.length));
    if (agentIds.length === 0) {
        return {};
    }
    // Batch get agent metadata
    const keys = agentIds.map(id => ({ PK: `AGENT#${id}`, SK: 'METADATA' }));
    const batchGetResult = await ddbDocClient.send(new BatchGetCommand({ RequestItems: { [CONFIG_TABLE_NAME]: { Keys: keys } } }));
    
    const agents = batchGetResult.Responses?.[CONFIG_TABLE_NAME] as Agent[] || [];

    const mergedVariables = {};
    for (const agent of agents) {
        if (agent.enabled && agent.flowVariables) {
            Object.assign(mergedVariables, agent.flowVariables);
        }
    }
    
    return mergedVariables;
  },
};