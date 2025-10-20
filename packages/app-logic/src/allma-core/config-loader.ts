import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import {
    FlowDefinitionSchema,
    StepDefinitionSchema,
    type FlowDefinition,
    type StepDefinition,
    type PromptTemplate,
    PromptTemplateSchema,
    PermanentStepError,
    SYSTEM_STEP_DEFINITIONS,
    StepInstance,
} from '@allma/core-types';
import { log_error, log_info, deepMerge } from '@allma/core-sdk';

const CONFIG_TABLE_NAME = process.env.ALLMA_CONFIG_TABLE_NAME!;
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Retrieves the published version number for a versioned item (Flow or Prompt).
 * @param itemId The unique ID of the item (e.g., flowId, promptId).
 * @param itemType The type of item, used to determine the DynamoDB PK prefix.
 * @param correlationId Optional ID for logging.
 * @returns The published version number.
 * @throws An error if the item or its published version is not found.
 */
async function getPublishedVersion(itemId: string, itemType: 'FLOW_DEF' | 'PROMPT_TEMPLATE', correlationId?: string): Promise<number> {
    const pkPrefix = itemType === 'FLOW_DEF' ? 'FLOW_DEF#' : 'PROMPT_TEMPLATE#';
    const descriptiveName = itemType === 'FLOW_DEF' ? 'flow definition' : 'prompt template';
    log_info(`Resolving LATEST_PUBLISHED version for ${itemType}`, { itemId }, correlationId);
    const getParams = {
        TableName: CONFIG_TABLE_NAME,
        Key: { PK: `${pkPrefix}${itemId}`, SK: 'METADATA' },
    };
    try {
        const { Item } = await ddbDocClient.send(new GetCommand(getParams));
        if (!Item || typeof Item.publishedVersion !== 'number') {
            throw new PermanentStepError(`No published version found for ${descriptiveName} '${itemId}'. Check METADATA item.`);
        }
        log_info(`Resolved LATEST_PUBLISHED to version ${Item.publishedVersion}`, { itemId }, correlationId);
        return Item.publishedVersion;
    } catch (e: any) {
        log_error(`Failed to resolve LATEST_PUBLISHED version for ${itemType}`, { error: e.message, params: getParams }, correlationId);
        throw e;
    }
}

export async function loadFlowDefinition(
  flowDefinitionId: string,
  version: string | number,
  correlationId?: string
): Promise<FlowDefinition> {
  log_info('Loading Flow Definition', { flowDefinitionId, version, tableName: CONFIG_TABLE_NAME }, correlationId);

  let versionToFetch = version;
  if (version === 'LATEST_PUBLISHED') {
    versionToFetch = await getPublishedVersion(flowDefinitionId, 'FLOW_DEF', correlationId);
  }

  const getParams = {
    TableName: CONFIG_TABLE_NAME,
    Key: { PK: `FLOW_DEF#${flowDefinitionId}`, SK: `VERSION#${versionToFetch}` },
  };

  try {
    const { Item } = await ddbDocClient.send(new GetCommand(getParams));
    if (!Item) {
      throw new PermanentStepError(`Flow Definition not found for id: ${flowDefinitionId}, version: ${versionToFetch}`);
    }

    // NEW HYDRATION LOGIC STARTS HERE
    const rawFlowDef = Item as FlowDefinition; // Cast to work with it

    for (const stepId in rawFlowDef.steps) {
        const stepInstance = rawFlowDef.steps[stepId];
        if (stepInstance.stepDefinitionId) {
            const baseStepDef = await loadStepDefinition(stepInstance.stepDefinitionId, correlationId);
            // Deep merge base definition with instance-specific overrides
            const hydratedStep = deepMerge(baseStepDef, stepInstance);
            rawFlowDef.steps[stepId] = hydratedStep as unknown as StepInstance;
        }
    }
    // HYDRATION LOGIC ENDS

    // Now, parse the FULLY HYDRATED flow definition
    return FlowDefinitionSchema.parse(rawFlowDef);

  } catch (e: any) {
    if (e instanceof PermanentStepError) throw e;
    log_error('Failed to load or parse Flow Definition from DynamoDB', { error: e.message, params: getParams }, correlationId);
    throw e; // Re-throw to fail the execution
  }
}

export async function loadStepDefinition(stepDefinitionId: string, correlationId?: string): Promise<StepDefinition> {
  log_info('Loading Step Definition', { stepDefinitionId, tableName: CONFIG_TABLE_NAME }, correlationId);

  if (stepDefinitionId.startsWith('system-') || stepDefinitionId.startsWith('system/')) {
    const systemStep = SYSTEM_STEP_DEFINITIONS.find(s => s.id === stepDefinitionId);
    if (systemStep) {
        log_info(`Found system step definition for '${stepDefinitionId}'. Hydrating from constant.`, {}, correlationId);
        const now = new Date().toISOString();
        const constructedDef = {
            ...systemStep,
            createdAt: now,
            updatedAt: now,
            version: 1, 
            isPublished: true,
            tags: ['system'],
        };
        // The object is not a complete StepDefinition yet, so we return it without validation.
        // Final validation happens after it's merged with the instance config.
        return constructedDef as any;
    } else {
        throw new PermanentStepError(`System step definition with id '${stepDefinitionId}' not found.`);
    }
  }

  const getParams = {
    TableName: CONFIG_TABLE_NAME,
    // Assuming steps are not versioned for now, but this could be extended
    Key: { PK: `STEP_DEF#${stepDefinitionId}`, SK: `METADATA` },
  };

  try {
    const { Item } = await ddbDocClient.send(new GetCommand(getParams));
    if (!Item) {
      throw new PermanentStepError(`Step Definition not found for id: ${stepDefinitionId}`);
    }
    return StepDefinitionSchema.parse(Item);
  } catch (e: any) {
    if (e instanceof PermanentStepError) throw e;
    log_error('Failed to load or parse Step Definition from DynamoDB', { error: e.message, params: getParams }, correlationId);
    throw e;
  }
}

/**
 * Loads a specific or the latest published version of a prompt template from DynamoDB.
 * @param promptTemplateId The ID of the prompt template to load.
 * @param version The specific version number or 'LATEST_PUBLISHED'. Defaults to 'LATEST_PUBLISHED'.
 * @param correlationId Optional ID for logging.
 * @returns The parsed prompt template.
 * @throws An error if the prompt template is not found or fails parsing.
 */
export async function loadPromptTemplate(
    promptTemplateId: string,
    version: string | number = 'LATEST_PUBLISHED', // Default to latest published
    correlationId?: string
): Promise<PromptTemplate> {
    log_info('Loading Prompt Template', { promptTemplateId, version, tableName: CONFIG_TABLE_NAME }, correlationId);

    let versionToFetch = version;
    if (version === 'LATEST_PUBLISHED') {
        versionToFetch = await getPublishedVersion(promptTemplateId, 'PROMPT_TEMPLATE', correlationId);
    }

    const getParams = {
        TableName: CONFIG_TABLE_NAME,
        Key: { PK: `PROMPT_TEMPLATE#${promptTemplateId}`, SK: `VERSION#${versionToFetch}` },
    };

    try {
        const { Item } = await ddbDocClient.send(new GetCommand(getParams));
        if (!Item) {
            throw new PermanentStepError(`Prompt Template not found for id: ${promptTemplateId}, version: ${versionToFetch}`);
        }
        
        // The storage item includes PK, SK, itemType which are not part of the API model.
        // We strip them before parsing to match the PromptTemplateSchema.
        const { ...apiItem } = Item;
        return PromptTemplateSchema.parse(apiItem);

    } catch (e: any) {
        if (e instanceof PermanentStepError) throw e;
        log_error('Failed to load or parse Prompt Template from DynamoDB', { error: e.message, params: getParams }, correlationId);
        throw e;
    }
}
