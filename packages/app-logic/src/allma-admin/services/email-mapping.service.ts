import { TransactWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  ENV_VAR_NAMES,
  FlowDefinition,
  StepInstance,
  EmailStartPointStepPayloadSchema,
  StepType,
  PermanentStepError,
} from '@allma/core-types';
import { z } from 'zod';
import { log_info } from '@allma/core-sdk';

type EmailStartPointStepPayload = z.infer<typeof EmailStartPointStepPayloadSchema>;

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EMAIL_MAPPING_TABLE_NAME = process.env[ENV_VAR_NAMES.EMAIL_TO_FLOW_MAPPING_TABLE_NAME]!;

export const EmailMappingService = {
  async syncMappingsForFlowVersion(flowId: string, oldVersion?: FlowDefinition, newVersion?: FlowDefinition) {
    const getNormalizedMappings = (
      flow?: FlowDefinition,
    ): Map<string, StepInstance & EmailStartPointStepPayload & { keyword: string }> => {
      const map = new Map<string, StepInstance & EmailStartPointStepPayload & { keyword: string }>();
      if (!flow?.steps) {
        return map;
      }
      const steps = Object.values(flow.steps).filter(
        (step): step is StepInstance & EmailStartPointStepPayload => step.stepType === StepType.EMAIL_START_POINT,
      );
      for (const step of steps) {
        const keyword = step.keyword || '#DEFAULT';
        const key = `${step.emailAddress}#${keyword}`;
        map.set(key, { ...step, keyword });
      }
      return map;
    };

    const oldMappingsMap = getNormalizedMappings(oldVersion);
    const newMappingsMap = getNormalizedMappings(newVersion);

    const transactions: any[] = [];

    // Find mappings to delete
    for (const [key, oldMapping] of oldMappingsMap.entries()) {
      if (!newMappingsMap.has(key)) {
        transactions.push({
          Delete: {
            TableName: EMAIL_MAPPING_TABLE_NAME,
            Key: {
              emailAddress: oldMapping.emailAddress,
              keyword: oldMapping.keyword,
            },
            ConditionExpression: 'flowDefinitionId = :flowId',
            ExpressionAttributeValues: { ':flowId': flowId },
          },
        });
      }
    }

    // Find mappings to add or update (upsert)
    for (const [, newMapping] of newMappingsMap.entries()) {
      const itemToPut: { [key: string]: any } = {
        emailAddress: newMapping.emailAddress,
        keyword: newMapping.keyword,
        flowDefinitionId: flowId,
        stepInstanceId: newMapping.stepInstanceId,
      };

      if (newMapping.triggerMessagePattern) {
        itemToPut.triggerMessagePattern = newMapping.triggerMessagePattern;
      }

      transactions.push({
        Put: {
          TableName: EMAIL_MAPPING_TABLE_NAME,
          Item: itemToPut,
          ConditionExpression: '(attribute_not_exists(flowDefinitionId)) OR (flowDefinitionId = :flowId)',
          ExpressionAttributeValues: { ':flowId': flowId },
        },
      });
    }

    if (transactions.length > 0) {
      log_info(
        `Syncing ${transactions.length} email mapping transactions for flow ${flowId}`,
        { deletes: transactions.filter((t) => t.Delete).length, puts: transactions.filter((t) => t.Put).length },
        flowId,
      );
      const command = new TransactWriteCommand({
        TransactItems: transactions,
      });
      try {
        await ddbDocClient.send(command);
      } catch (error: any) {
        if (error.name === 'TransactionCanceledException' && error.message.includes('[ConditionalCheckFailed]')) {
          // A conditional check failed. This now unambiguously means a conflict with another flow.
          // We can infer the conflicting item from any of the PUT transactions.
          const failedPut = transactions.find((t) => t.Put);
          if (failedPut) {
            const item = failedPut.Put.Item;
            throw new PermanentStepError(
              `Email address conflict: The email trigger '${item.emailAddress}' with keyword '${item.keyword}' is already in use by another published flow. Please use a different email address, keyword, or unpublish the existing flow.`,
              { conflictingEmail: item.emailAddress, conflictingKeyword: item.keyword },
            );
          }
          // Fallback if we can't determine the conflicting item.
          throw new Error(`DynamoDB transaction failed due to a conditional check violation: ${error.message}`);
        }
        // Re-throw other transaction errors
        throw error;
      }
    }
  },
};