import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, TransactWriteCommand, UpdateCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { fromStorageItem } from '@allma/core-sdk';
import { ITEM_TYPE_ALLMA_FLOW_DEFINITION, ITEM_TYPE_ALLMA_PROMPT_TEMPLATE } from '@allma/core-types';
import { v4 as uuidv4 } from 'uuid';

const CONFIG_TABLE_NAME = process.env.ALLMA_CONFIG_TABLE_NAME!;
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });

export interface VersionedEntityConfig<TMaster, TVersion, TCreateInput> {
    pkPrefix: string;
    entityName: string;
    itemType: typeof ITEM_TYPE_ALLMA_FLOW_DEFINITION | typeof ITEM_TYPE_ALLMA_PROMPT_TEMPLATE;
    masterSchema: z.ZodType<TMaster, any, any>;
    versionSchema: z.ZodType<TVersion, any, any>;
    initialVersionFactory: (id: string, now: string, input: TCreateInput) => TVersion;
}

// Generic constraint for the Master item type
type MasterItem = { 
    PK: string; id: string; name: string; description?: string | null | undefined; 
    latestVersion: number; publishedVersion?: number | undefined; tags?: string[];
    createdAt: string; updatedAt: string;
};

// Generic constraint for the Version item type
type VersionItem = { id: string, version: number; createdAt: string; updatedAt: string };

// Generic constraint for the Create input
type CreateInput = { name: string; description?: string | null | undefined; };

/**
 * A generic manager for versioned entities in DynamoDB.
 * It handles a "master" or "metadata" record that tracks the latest/published versions,
 * and individual "version" records that store the immutable data for each version.
 * All operations are designed to be safe and atomic using DynamoDB transactions.
 */
export class VersionedEntityManager<TMaster extends MasterItem, TVersion extends VersionItem, TCreateInput extends CreateInput> {
    private config: VersionedEntityConfig<TMaster, TVersion, TCreateInput>;

    constructor(config: VersionedEntityConfig<TMaster, TVersion, TCreateInput>) {
        this.config = config;
    }

    private getKeys(id: string, version?: number | string) {
        const pk = `${this.config.pkPrefix}${id}`;
        return {
            pk,
            metadataSk: 'METADATA',
            versionSk: version !== undefined ? `VERSION#${version}` : undefined,
            metadataKey: { PK: pk, SK: 'METADATA' },
            versionKey: version !== undefined ? { PK: pk, SK: `VERSION#${version}` } : undefined,
        };
    }

    async listMasters(filters?: { tag?: string; searchText?: string }): Promise<TMaster[]> {
        if (filters?.searchText) {
            // Use Scan when searching by text because 'name' can be a key attribute on the GSI
            const filterExpressions: string[] = ['itemType = :itemType', 'SK = :skMetadata'];
            const expressionAttributeValues: Record<string, any> = {
                ':itemType': this.config.itemType,
                ':skMetadata': 'METADATA',
            };
            const expressionAttributeNames: Record<string, string> = {};

            if (filters.tag) {
                filterExpressions.push('contains(tags, :tag)');
                expressionAttributeValues[':tag'] = filters.tag;
            }

            filterExpressions.push('(contains(#nm, :searchText) OR contains(description, :searchText))');
            expressionAttributeNames['#nm'] = 'name';
            expressionAttributeValues[':searchText'] = filters.searchText;

            const { Items } = await ddbDocClient.send(new ScanCommand({
                TableName: CONFIG_TABLE_NAME,
                IndexName: 'GSI_ListItems_v2',
                FilterExpression: filterExpressions.join(' AND '),
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
            }));
            return (Items || []) as TMaster[];
        } else {
            // Use Query for better performance when not searching by text
            const filterExpressions: string[] = ['SK = :skMetadata'];
            const expressionAttributeValues: Record<string, any> = {
                ':itemType': this.config.itemType,
                ':skMetadata': 'METADATA',
            };

            if (filters?.tag) {
                filterExpressions.push('contains(tags, :tag)');
                expressionAttributeValues[':tag'] = filters.tag;
            }

            const { Items } = await ddbDocClient.send(new QueryCommand({
                TableName: CONFIG_TABLE_NAME,
                IndexName: 'GSI_ListItems_v2',
                KeyConditionExpression: 'itemType = :itemType',
                FilterExpression: filterExpressions.join(' AND '),
                ExpressionAttributeValues: expressionAttributeValues,
            }));
            return (Items || []) as TMaster[];
        }
    }

    async getAllTags(): Promise<string[]> {
        const tagSet = new Set<string>();
        let lastEvaluatedKey: Record<string, any> | undefined;

        do {
            const { Items, LastEvaluatedKey } = await ddbDocClient.send(new QueryCommand({
                TableName: CONFIG_TABLE_NAME,
                IndexName: 'GSI_ListItems_v2',
                KeyConditionExpression: 'itemType = :itemType',
                FilterExpression: 'SK = :skMetadata',
                ExpressionAttributeValues: {
                    ':itemType': this.config.itemType,
                    ':skMetadata': 'METADATA',
                },
                ProjectionExpression: 'tags',
                ExclusiveStartKey: lastEvaluatedKey,
            }));

            if (Items) {
                for (const item of Items) {
                    if (Array.isArray(item.tags)) {
                        item.tags.forEach(tag => tagSet.add(tag));
                    }
                }
            }
            lastEvaluatedKey = LastEvaluatedKey;
        } while (lastEvaluatedKey);

        return Array.from(tagSet).sort();
    }
    
    async getMaster(id: string): Promise<TMaster | null> {
        const { metadataKey } = this.getKeys(id);
        const { Item } = await ddbDocClient.send(new GetCommand({ TableName: CONFIG_TABLE_NAME, Key: metadataKey }));
        return Item ? (Item as TMaster) : null;
    }

    async updateMaster(id: string, data: Partial<Omit<TMaster, 'PK' | 'SK' | 'itemType' | 'id' | 'createdAt' | 'updatedAt' | 'latestVersion' | 'publishedVersion'>>): Promise<TMaster> {
        const { metadataKey } = this.getKeys(id);
        const now = new Date().toISOString();

        const updateExpressionParts: string[] = ['updatedAt = :now'];
        const expressionAttributeValues: Record<string, any> = { ':now': now };
        const expressionAttributeNames: Record<string, string> = {};

        for (const [key, value] of Object.entries(data)) {
            if (value === undefined) continue;
            const attrName = `#${key}`;
            const attrValue = `:${key}`;
            updateExpressionParts.push(`${attrName} = ${attrValue}`);
            expressionAttributeNames[attrName] = key;
            expressionAttributeValues[attrValue] = value ?? null;
        }

        if (updateExpressionParts.length === 1) { // Only contains updatedAt
            const existing = await this.getMaster(id);
            if (!existing) throw new Error(`${this.config.entityName} with id ${id} not found.`);
            return existing;
        }

        const { Attributes } = await ddbDocClient.send(new UpdateCommand({
            TableName: CONFIG_TABLE_NAME,
            Key: metadataKey,
            UpdateExpression: 'SET ' + updateExpressionParts.join(', '),
            ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: 'attribute_exists(PK)',
            ReturnValues: 'ALL_NEW',
        }));
        return Attributes as TMaster;
    }

    async listVersions(id: string): Promise<Partial<TVersion>[]> {
        const { pk } = this.getKeys(id);
        const { Items } = await ddbDocClient.send(new QueryCommand({
            TableName: CONFIG_TABLE_NAME,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: { ':pk': pk, ':skPrefix': 'VERSION#' },
            ProjectionExpression: '#nm, id, version, isPublished, createdAt, updatedAt, publishedAt, description, tags',
            ExpressionAttributeNames: { '#nm': 'name' },
        }));
        return (Items || []) as Partial<TVersion>[];
    }
    
    async getVersion(id: string, version: string | number): Promise<TVersion | null> {
        let versionToFetch = version;
        if (version === 'LATEST_PUBLISHED') {
            const metadata = await this.getMaster(id);
            if (!metadata?.publishedVersion) return null;
            versionToFetch = metadata.publishedVersion;
        } else if (version === 'latest') {
            const metadata = await this.getMaster(id);
            if (!metadata) return null;
            versionToFetch = metadata.latestVersion;
        }
        const { versionKey } = this.getKeys(id, versionToFetch);
        const { Item } = await ddbDocClient.send(new GetCommand({ TableName: CONFIG_TABLE_NAME, Key: versionKey! }));
        return Item ? fromStorageItem<any, TVersion>(Item) : null;
    }

    /**
     * Creates a new master entity record and its initial version 1 in a single transaction.
     * Can create from a factory or a provided override object (for imports).
     * @param id The pre-generated unique ID for the new entity.
     * @param createInput The data for the new entity (e.g., name, description).
     * @param initialVersionOverride An optional full version object to use instead of the factory.
     */
    async createMasterWithInitialVersion(id: string, createInput: TCreateInput, initialVersionOverride?: TVersion): Promise<{ metadata: TMaster, version: TVersion }> {
        const now = new Date().toISOString();
        
        const initialVersion = initialVersionOverride 
            ? {
                ...initialVersionOverride,
                id: id,
                // Preserve created/updated from import file if valid, otherwise set to now.
                createdAt: initialVersionOverride.createdAt && !isNaN(new Date(initialVersionOverride.createdAt).getTime()) ? initialVersionOverride.createdAt : now,
                updatedAt: now, // The 'updatedAt' for this new record in our system is now.
            }
            : this.config.initialVersionFactory(id, now, createInput);
        
        const validatedInitialVersion = this.config.versionSchema.parse(initialVersion);
        
        const metadataInput: Omit<MasterItem, 'PK'> & { [key: string]: any } = {
            id,
            name: (validatedInitialVersion as any).name,
            description: (validatedInitialVersion as any).description ?? null,
            latestVersion: validatedInitialVersion.version,
            publishedVersion: (validatedInitialVersion as any).isPublished ? validatedInitialVersion.version : undefined,
            createdAt: now,
            updatedAt: now,
            tags: (validatedInitialVersion as any).tags ?? [],
        };

        // Handle entity-specific properties that need to be on the master record (like emailTriggerAddress for flows)
        if ((validatedInitialVersion as any).emailTriggerAddress) {
            metadataInput.emailTriggerAddress = (validatedInitialVersion as any).emailTriggerAddress;
        }

        const { pk } = this.getKeys(id);
        const finalMetadataInput = { ...metadataInput, PK: pk, SK: 'METADATA', itemType: this.config.itemType };
        const metadataItem = this.config.masterSchema.parse(finalMetadataInput);

        const versionItem = { ...validatedInitialVersion, PK: pk, SK: `VERSION#${validatedInitialVersion.version}`, itemType: this.config.itemType };

        await ddbDocClient.send(new TransactWriteCommand({
            TransactItems: [
                { Put: { TableName: CONFIG_TABLE_NAME, Item: metadataItem as Record<string, any> } },
                { Put: { TableName: CONFIG_TABLE_NAME, Item: versionItem as Record<string, any> } },
            ]
        }));
        return { metadata: metadataItem, version: validatedInitialVersion };
    }
    
    /**
     * Clones an existing entity, creating a new entity with its own version history.
     * Generates a new UUID for the cloned entity.
     * @param idToClone The ID of the source entity.
     * @param newEntityInput The initial data (name, etc.) for the new cloned entity.
     * @param cloneDataTransformer A function to merge data from the source version into the new version 1.
     */
    async clone(
        idToClone: string,
        newEntityInput: TCreateInput,
        cloneDataTransformer: (sourceData: TVersion, newInitialVersion: TVersion) => Omit<TVersion, 'id' | 'version'>
    ): Promise<{ metadata: TMaster, version: TVersion }> {
        const sourceMetadata = await this.getMaster(idToClone);
        if (!sourceMetadata) throw new Error(`Source ${this.config.entityName} '${idToClone}' not found.`);
        
        const sourceVersionNum = sourceMetadata.publishedVersion || sourceMetadata.latestVersion;
        const sourceVersionData = await this.getVersion(idToClone, sourceVersionNum);
        if (!sourceVersionData) throw new Error(`Source version '${sourceVersionNum}' not found for ${this.config.entityName} '${idToClone}'.`);
    
        const newId = uuidv4();
        const now = new Date().toISOString();
    
        const newInitialVersion = this.config.initialVersionFactory(newId, now, newEntityInput);
        const transformedData = cloneDataTransformer(sourceVersionData, newInitialVersion);
        const finalNewVersion: TVersion = {
            ...newInitialVersion,
            ...transformedData,
            id: newId,
            version: 1,
        };
        const validatedNewVersion = this.config.versionSchema.parse(finalNewVersion);
    
        const newMetadataInput = {
            id: newId,
            name: newEntityInput.name,
            description: newEntityInput.description ?? `Cloned from ${sourceMetadata.name}`,
            latestVersion: 1,
            createdAt: now,
            updatedAt: now,
            tags: (newEntityInput as any).tags ?? sourceMetadata.tags ?? [],
        };
        const { pk } = this.getKeys(newId);
        const finalMetadataItem = this.config.masterSchema.parse({
            ...newMetadataInput, PK: pk, SK: 'METADATA', itemType: this.config.itemType
        });
    
        const newVersionItem = {
            ...validatedNewVersion, PK: pk, SK: 'VERSION#1', itemType: this.config.itemType
        };
    
        await ddbDocClient.send(new TransactWriteCommand({
            TransactItems: [
                { Put: { TableName: CONFIG_TABLE_NAME, Item: finalMetadataItem as Record<string, any> } },
                { Put: { TableName: CONFIG_TABLE_NAME, Item: newVersionItem as Record<string, any> } },
            ]
        }));
    
        return { metadata: finalMetadataItem, version: validatedNewVersion };
    }

    async createVersion(id: string, sourceVersionIdentifier: number | 'latest'): Promise<TVersion> {
        const metadata = await this.getMaster(id);
        if (!metadata) throw new Error(`${this.config.entityName} with id ${id} not found.`);
        
        const versionToClone = sourceVersionIdentifier === 'latest' ? metadata.latestVersion : sourceVersionIdentifier;
        const sourceVersion = await this.getVersion(id, versionToClone);
        if (!sourceVersion) throw new Error(`Source version ${versionToClone} not found for ${id}.`);

        const newVersionNumber = metadata.latestVersion + 1;
        const now = new Date().toISOString();
        const newVersionData = {
            ...sourceVersion,
            version: newVersionNumber,
            isPublished: false,
            publishedAt: null,
            createdAt: now,
            updatedAt: now,
        };
        const validatedNewVersion = this.config.versionSchema.parse(newVersionData);
        const newVersionItem = { ...validatedNewVersion, PK: this.getKeys(id).pk, SK: `VERSION#${newVersionNumber}`, itemType: this.config.itemType };

        await ddbDocClient.send(new TransactWriteCommand({
            TransactItems: [
                { Put: { TableName: CONFIG_TABLE_NAME, Item: newVersionItem as Record<string, any> } },
                { Update: {
                    TableName: CONFIG_TABLE_NAME,
                    Key: this.getKeys(id).metadataKey,
                    UpdateExpression: 'SET latestVersion = :newVersion, updatedAt = :now',
                    ExpressionAttributeValues: { ':newVersion': newVersionNumber, ':now': now }
                }}
            ]
        }));
        return validatedNewVersion;
    }

    async updateVersion(id: string, version: number, data: TVersion, options?: { skipValidation?: boolean }): Promise<TVersion> {
        const { versionKey } = this.getKeys(id, version);
        
        const itemForDb = {
            ...data,
            updatedAt: new Date().toISOString(),
            PK: versionKey!.PK, 
            SK: versionKey!.SK, 
            itemType: this.config.itemType,
        };
        
        const validatedData = options?.skipValidation ? itemForDb : this.config.versionSchema.parse(itemForDb);
        
        await ddbDocClient.send(new PutCommand({
            TableName: CONFIG_TABLE_NAME, Item: validatedData as Record<string, any>,
            ConditionExpression: 'attribute_exists(PK) AND (attribute_not_exists(isPublished) OR isPublished = :isPublishedFalse)',
            ExpressionAttributeValues: { ':isPublishedFalse': false },
        }));
        return fromStorageItem<any, TVersion>(validatedData);
    }
    
    async publishVersion(id: string, version: number): Promise<TVersion> {
        const metadata = await this.getMaster(id);
        const currentlyPublished = metadata?.publishedVersion;
        const now = new Date().toISOString();
        const transactionItems: any[] = [];
        
        if (currentlyPublished && currentlyPublished !== version) {
            transactionItems.push({ Update: {
                TableName: CONFIG_TABLE_NAME, Key: this.getKeys(id, currentlyPublished).versionKey,
                UpdateExpression: 'SET isPublished = :false, publishedAt = :null', ExpressionAttributeValues: { ':false': false, ':null': null }
            }});
        }
        
        transactionItems.push({ Update: {
            TableName: CONFIG_TABLE_NAME, Key: this.getKeys(id, version).versionKey!,
            UpdateExpression: 'SET isPublished = :p, publishedAt = :pa, updatedAt = :u',
            ExpressionAttributeValues: { ':p': true, ':pa': now, ':u': now },
            ConditionExpression: 'attribute_exists(PK)'
        }});
        
        transactionItems.push({ Update: {
            TableName: CONFIG_TABLE_NAME, Key: this.getKeys(id).metadataKey,
            UpdateExpression: 'SET publishedVersion = :v, updatedAt = :u',
            ExpressionAttributeValues: { ':v': version, ':u': now }
        }});
        
        await ddbDocClient.send(new TransactWriteCommand({ TransactItems: transactionItems }));
        return (await this.getVersion(id, version))!;
    }

    async unpublishVersion(id: string, version: number): Promise<TVersion> {
        const metadata = await this.getMaster(id);
        if (metadata?.publishedVersion !== version) throw new Error('Version is not currently published.');
        
        const now = new Date().toISOString();
        await ddbDocClient.send(new TransactWriteCommand({
            TransactItems: [
                { Update: {
                    TableName: CONFIG_TABLE_NAME, Key: this.getKeys(id, version).versionKey!,
                    UpdateExpression: 'SET isPublished = :false, publishedAt = :null, updatedAt = :now',
                    ExpressionAttributeValues: { ':false': false, ':null': null, ':now': now }
                }},
                { Update: {
                    TableName: CONFIG_TABLE_NAME, Key: this.getKeys(id).metadataKey,
                    UpdateExpression: 'REMOVE publishedVersion SET updatedAt = :now',
                    ExpressionAttributeValues: { ':now': now }
                }}
            ]
        }));
        return (await this.getVersion(id, version))!;
    }
    
    async deleteVersion(id: string, version: number): Promise<void> {
        const metadata = await this.getMaster(id);
        if (!metadata) throw new Error(`${this.config.entityName} not found.`);
        if (metadata.publishedVersion === version) throw new Error('Cannot delete a published version.');
        if (metadata.latestVersion === 1) throw new Error('Cannot delete the only version.');

        if (metadata.latestVersion === version) {
            await ddbDocClient.send(new TransactWriteCommand({ TransactItems: [
                { Delete: {
                    TableName: CONFIG_TABLE_NAME, Key: this.getKeys(id, version).versionKey!,
                    ConditionExpression: 'isPublished = :false', ExpressionAttributeValues: { ':false': false }
                }},
                { Update: {
                    TableName: CONFIG_TABLE_NAME, Key: this.getKeys(id).metadataKey,
                    UpdateExpression: 'SET latestVersion = latestVersion - :decr, updatedAt = :now',
                    ConditionExpression: 'latestVersion = :currentVersion',
                    ExpressionAttributeValues: { ':decr': 1, ':now': new Date().toISOString(), ':currentVersion': version }
                }}
            ]}));
        } else {
            await ddbDocClient.send(new DeleteCommand({
                TableName: CONFIG_TABLE_NAME, Key: this.getKeys(id, version).versionKey!,
                ConditionExpression: 'isPublished = :false', ExpressionAttributeValues: { ':false': false }
            }));
        }
    }
}