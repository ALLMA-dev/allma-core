import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { ENV_VAR_NAMES, Agent } from '@allma/core-types';

const CONFIG_TABLE_NAME = process.env[ENV_VAR_NAMES.ALLMA_CONFIG_TABLE_NAME]!;
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const FlowActivationService = {
  /**
   * Determines if a flow is "active" and can be triggered.
   * A flow is active if it's a standalone flow (not part of any agent)
   * OR if it belongs to at least one enabled agent.
   */
  async isFlowActive(flowId: string): Promise<boolean> {
    const { Items } = await ddbDocClient.send(
      new QueryCommand({
        TableName: CONFIG_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: { ':pk': `FLOW_DEF#${flowId}`, ':skPrefix': 'AGENT#' },
      }),
    );

    if (!Items || Items.length === 0) {
      // Flow is not associated with any agent, so it's considered active by default.
      return true;
    }

    const agentIds = Items.map((item) => item.SK.substring('AGENT#'.length));
    if (agentIds.length === 0) {
      return true; // Should not happen if Items exist, but as a safeguard.
    }

    // Fetch all associated agents in a batch.
    const keys = agentIds.map((id) => ({ PK: `AGENT#${id}`, SK: 'METADATA' }));
    const batchGetResult = await ddbDocClient.send(
      new BatchGetCommand({
        RequestItems: { [CONFIG_TABLE_NAME]: { Keys: keys } },
      }),
    );

    const agents = (batchGetResult.Responses?.[CONFIG_TABLE_NAME] as Agent[]) || [];

    // The flow is active if ANY of its associated agents are enabled.
    return agents.some((agent) => agent.enabled);
  },
};