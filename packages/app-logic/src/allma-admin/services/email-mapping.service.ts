import { TransactWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ENV_VAR_NAMES, FlowDefinition, StepInstance } from '@allma/core-types';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EMAIL_MAPPING_TABLE_NAME = process.env[ENV_VAR_NAMES.EMAIL_TO_FLOW_MAPPING_TABLE_NAME]!;

export const EmailMappingService = {
  async syncMappingsForFlowVersion(flowId: string, oldVersion?: FlowDefinition, newVersion?: FlowDefinition) {
    const getEmailStartPointSteps = (flow?: FlowDefinition): StepInstance[] => {
        if (!flow?.steps) {
            return [];
        }
        return Object.values(flow.steps).filter(step => step.stepType === 'EMAIL_START_POINT');
    };

    const oldMappings = getEmailStartPointSteps(oldVersion);
    const newMappings = getEmailStartPointSteps(newVersion);

    const transactions: any[] = [];

    // Find mappings to delete
    for (const oldMapping of oldMappings) {
      const stillExists = newMappings.some(newMapping => 
        newMapping.emailAddress === oldMapping.emailAddress && newMapping.keyword === oldMapping.keyword
      );
      if (!stillExists) {
        transactions.push({
          Delete: {
            TableName: EMAIL_MAPPING_TABLE_NAME,
            Key: {
              emailAddress: oldMapping.emailAddress,
              keyword: oldMapping.keyword || '#DEFAULT',
            },
          },
        });
      }
    }

    // Find mappings to add/update
    for (const newMapping of newMappings) {
      transactions.push({
        Put: {
          TableName: EMAIL_MAPPING_TABLE_NAME,
          Item: {
            emailAddress: newMapping.emailAddress,
            keyword: newMapping.keyword || '#DEFAULT',
            flowDefinitionId: flowId,
            stepInstanceId: newMapping.stepInstanceId,
          },
          ConditionExpression: 'attribute_not_exists(emailAddress) OR flowDefinitionId = :flowId',
          ExpressionAttributeValues: {
            ':flowId': flowId,
          },
        },
      });
    }

    if (transactions.length > 0) {
      const command = new TransactWriteCommand({
        TransactItems: transactions,
      });
      await ddbDocClient.send(command);
    }
  },
};
