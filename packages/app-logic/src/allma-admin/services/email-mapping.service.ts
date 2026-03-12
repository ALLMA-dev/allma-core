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
import { TemplateService } from '../../allma-core/template-service.js';

type EmailStartPointStepPayload = z.infer<typeof EmailStartPointStepPayloadSchema>;

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EMAIL_MAPPING_TABLE_NAME = process.env[ENV_VAR_NAMES.EMAIL_TO_FLOW_MAPPING_TABLE_NAME]!;

export const EmailMappingService = {
  async syncMappingsForFlowVersion(flowId: string, oldVersion?: FlowDefinition, newVersion?: FlowDefinition) {
    const getNormalizedMappings = async (
      flow?: FlowDefinition,
    ): Promise<Map<string, StepInstance & EmailStartPointStepPayload & { keyword: string; renderedEmailAddress: string }>> => {
      const map = new Map<string, StepInstance & EmailStartPointStepPayload & { keyword: string; renderedEmailAddress: string }>();
      if (!flow?.steps) {
        return map;
      }
      const steps = Object.values(flow.steps).filter(
        (step): step is StepInstance & EmailStartPointStepPayload => step.stepType === StepType.EMAIL_START_POINT,
      );

      const templateService = TemplateService.getInstance();
      // Use flow-level variables as the context for rendering.
      const templateContext = { flow_variables: flow.flowVariables || {} };

      for (const step of steps) {
        // Render the email address in case it's a template.
        const renderedEmail = await templateService.render(step.emailAddress, templateContext, flow.id);

        // Validate the *rendered* email address.
        if (!z.string().email().safeParse(renderedEmail).success) {
          throw new PermanentStepError(
            `The emailAddress template '${step.emailAddress}' for step '${step.stepInstanceId}' resolved to an invalid email address: '${renderedEmail}'. Please correct the template or the value in flowVariables.`,
          );
        }

        const keyword = step.keyword || '#DEFAULT';
        const key = `${renderedEmail}#${keyword}`;
        map.set(key, { ...step, keyword, renderedEmailAddress: renderedEmail });
      }
      return map;
    };

    const [oldMappingsMap, newMappingsMap] = await Promise.all([
      getNormalizedMappings(oldVersion),
      getNormalizedMappings(newVersion),
    ]);

    const transactions: any[] = [];

    // Find mappings to delete
    for (const [key, oldMapping] of oldMappingsMap.entries()) {
      if (!newMappingsMap.has(key)) {
        transactions.push({
          Delete: {
            TableName: EMAIL_MAPPING_TABLE_NAME,
            Key: {
              emailAddress: oldMapping.renderedEmailAddress,
              keyword: oldMapping.keyword,
            },
            // Idempotent delete: If the item is already missing (e.g. manually cleaned DB), do not fail the transaction.
            ConditionExpression: 'attribute_not_exists(emailAddress) OR flowDefinitionId = :flowId',
            ExpressionAttributeValues: { ':flowId': flowId },
          },
        });
      }
    }

    // Find mappings to add or update (upsert)
    for (const [, newMapping] of newMappingsMap.entries()) {
      const itemToPut: { [key: string]: any } = {
        emailAddress: newMapping.renderedEmailAddress,
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
        if (error.name === 'TransactionCanceledException') {
            let failedIndex = -1;
            
            // 1. Try to extract the exact index from the structured array (AWS SDK v3 standard)
            if (Array.isArray(error.CancellationReasons)) {
                failedIndex = error.CancellationReasons.findIndex((r: any) => r.Code === 'ConditionalCheckFailed');
            } 
            // 2. Fallback to parsing the bracketed string in the error message (e.g., "[None, ConditionalCheckFailed]")
            else if (error.message.includes('[')) {
                const match = error.message.match(/\[(.*?)\]/);
                if (match) {
                    const reasons = match[1].split(',').map((s: string) => s.trim());
                    failedIndex = reasons.indexOf('ConditionalCheckFailed');
                }
            }

            // If we found which exact transaction item failed, provide a highly descriptive error
            if (failedIndex !== -1 && transactions[failedIndex]) {
                const failedTx = transactions[failedIndex];
                
                if (failedTx.Put) {
                    const item = failedTx.Put.Item;
                    throw new PermanentStepError(
                        `Email address conflict: The email trigger '${item.emailAddress}' (keyword: '${item.keyword}') is already mapped to another published flow in this environment. You cannot have two flows listening to the exact same email address and keyword.`,
                        { conflictingEmail: item.emailAddress, conflictingKeyword: item.keyword }
                    );
                }
                if (failedTx.Delete) {
                    const key = failedTx.Delete.Key;
                    throw new PermanentStepError(
                        `Email trigger desync: Failed to remove mapping because '${key.emailAddress}' is currently owned by a completely different flow.`,
                        { conflictingEmail: key.emailAddress }
                    );
                }
            }

            // Generic fallback if we can't parse the index
            throw new Error(`DynamoDB transaction failed due to a conditional check violation. Please check for conflicting email triggers across your flows. Original error: ${error.message}`);
        }
        // Re-throw any other database/network errors
        throw error;
      }
    }
  },
};