import { TransactWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  ENV_VAR_NAMES,
  FlowDefinition,
  StepInstance,
  EmailStartPointStepPayloadSchema,
  StepType,
  PermanentStepError
} from '@allma/core-types';
import { z } from 'zod';
import { log_error, log_info, log_warn } from '@allma/core-sdk';

type EmailStartPointStepPayload = z.infer<typeof EmailStartPointStepPayloadSchema>;

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EMAIL_MAPPING_TABLE_NAME = process.env[ENV_VAR_NAMES.EMAIL_TO_FLOW_MAPPING_TABLE_NAME]!;

export const EmailMappingService = {
  async syncMappingsForFlowVersion(flowId: string, oldVersion?: FlowDefinition, newVersion?: FlowDefinition) {
    const getEmailStartPointSteps = (flow?: FlowDefinition): (StepInstance & EmailStartPointStepPayload)[] => {
        if (!flow?.steps) {
            return [];
        }
        return Object.values(flow.steps).filter(
            (step): step is StepInstance & EmailStartPointStepPayload =>
                step.stepType === StepType.EMAIL_START_POINT
        );
    };

    const oldMappings = getEmailStartPointSteps(oldVersion);
    const newMappings = getEmailStartPointSteps(newVersion);

    const transactions: any[] = [];

    // Track all unique email/keyword combinations present in the new version
    const newMappingKeys = new Set<string>();

    // Find mappings to delete or update
    for (const oldMapping of oldMappings) {
      const oldKey = `${oldMapping.emailAddress}#${oldMapping.keyword || '#DEFAULT'}`;
      const existsInNew = newMappings.some(newMapping => 
        newMapping.emailAddress === oldMapping.emailAddress && newMapping.keyword === oldMapping.keyword
      );

      if (!existsInNew) {
        // Mapping for this email/keyword was removed in the new version. Delete it.
        transactions.push({
          Delete: {
            TableName: EMAIL_MAPPING_TABLE_NAME,
            Key: {
              emailAddress: oldMapping.emailAddress,
              keyword: oldMapping.keyword || '#DEFAULT',
            },
            // Ensure we only delete the mapping if it belongs to the current flow to prevent accidental deletion
            ConditionExpression: 'flowDefinitionId = :flowId',
            ExpressionAttributeValues: { ':flowId': flowId },
          },
        });
      }
    }

    // Find mappings to add or update
    for (const newMapping of newMappings) {
      const currentKey = `${newMapping.emailAddress}#${newMapping.keyword || '#DEFAULT'}`;
      newMapping.keyword = newMapping.keyword || '#DEFAULT'; // Ensure keyword is always set for consistency

      // Add to the set of keys present in the new version
      newMappingKeys.add(currentKey);

      const itemToPut: { [key: string]: any } = {
        emailAddress: newMapping.emailAddress,
        keyword: newMapping.keyword,
        flowDefinitionId: flowId,
        stepInstanceId: newMapping.stepInstanceId,
      };

      if (newMapping.triggerMessagePattern) {
        itemToPut.triggerMessagePattern = newMapping.triggerMessagePattern;
      }

      // Determine the correct operation: PUT or UPDATE
      const existsInOld = oldMappings.some(old => old.emailAddress === newMapping.emailAddress && old.keyword === newMapping.keyword);
      
      if (existsInOld) {
        // If the mapping already exists for this flow, it's an update.
        // We need to use `UpdateCommand` logic within the transaction.
        // The generic `Put` with condition `flowDefinitionId = :flowId` works for updates too,
        // but explicit `Update` provides more control if needed. For simplicity and atomicity,
        // we'll stick to `Put` with a condition that allows updates for the current flow.
        transactions.push({
            Put: {
                TableName: EMAIL_MAPPING_TABLE_NAME,
                Item: itemToPut,
                // Allow update if the emailAddress/keyword exists AND belongs to THIS flow.
                ConditionExpression: 'attribute_exists(emailAddress) AND attribute_exists(keyword) AND flowDefinitionId = :flowId',
                ExpressionAttributeValues: { ':flowId': flowId },
            },
        });
      } else {
        // If it's a new mapping, ensure it doesn't exist for *any* other flow.
        transactions.push({
          Put: {
            TableName: EMAIL_MAPPING_TABLE_NAME,
            Item: itemToPut,
            // Crucial Condition: This email+keyword combination must NOT exist at all,
            // or it must already be owned by this flow (this second part is technically redundant
            // because if it existed for this flow, it would have been caught by `existsInOld`).
            // The primary check `attribute_not_exists(flowDefinitionId)` enforces uniqueness.
            ConditionExpression: 'attribute_not_exists(flowDefinitionId)',
          },
        });
      }
    }

    if (transactions.length > 0) {
      const command = new TransactWriteCommand({
        TransactItems: transactions,
      });
      try {
        await ddbDocClient.send(command);
      } catch (error: any) {
        if (error.name === 'TransactionCanceledException' && error.message.includes('[ConditionalCheckFailed]')) {
          // This error typically means our condition expression failed.
          // For PUT operations with `attribute_not_exists(flowDefinitionId)`, this means the emailAddress/keyword combo
          // is already used by *another* flow.
          const conflictingMapping = transactions.find(t => t.Put && t.Put.ConditionExpression?.includes('attribute_not_exists(flowDefinitionId)'));
          if (conflictingMapping) {
            // Identify the conflicting email and keyword for a better error message.
            const conflictingEmail = conflictingMapping.Put.Item.emailAddress;
            const conflictingKeyword = conflictingMapping.Put.Item.keyword;
            throw new PermanentStepError(
                `Email address conflict: The email trigger '${conflictingEmail}' with keyword '${conflictingKeyword}' is already in use by another published flow. Please use a different email address, keyword, or unpublish the existing flow.`,
                { conflictingEmail, conflictingKeyword }
            );
          }
          // If the conflict wasn't from a Put operation that checks existence, re-throw.
          throw new Error(`DynamoDB transaction failed due to a conditional check violation: ${error.message}`);
        }
        // Re-throw other transaction errors
        throw error;
      }
    }
  },
};