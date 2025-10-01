import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { fromStorageItem } from '@allma/core-sdk';

const CONFIG_TABLE_NAME = process.env.ALLMA_CONFIG_TABLE_NAME!;
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });

// Base constraint for an entity that can be managed by this service.
// These fields are considered required as the service guarantees their presence on create/update.
type BaseEntity = { 
    id: string; 
    createdAt: string;
    updatedAt: string;
};

// Input for creation, where createdAt/updatedAt are omitted as the service sets them.
type CreateEntityInput<T extends BaseEntity> = Omit<T, 'createdAt' | 'updatedAt'> & Partial<Pick<T, 'createdAt' | 'updatedAt'>>;

export interface GenericEntityManagerConfig<TEntity extends BaseEntity> {
    pkPrefix: string;
    entityName: string;
    itemType: string;
    schema: z.ZodType<TEntity, any, any>;
}

/**
 * A generic manager for simple, non-versioned entities stored in DynamoDB
 * with a composite key of PK and a static SK ('METADATA').
 */
export class GenericEntityManager<TEntity extends BaseEntity> {
    private config: GenericEntityManagerConfig<TEntity>;

    constructor(config: GenericEntityManagerConfig<TEntity>) {
        this.config = config;
    }

    private toStorageItem(item: TEntity): any {
        return {
            ...item,
            PK: `${this.config.pkPrefix}${item.id}`,
            SK: 'METADATA',
            itemType: this.config.itemType,
        };
    }

    /**
     * Lists all master records for the entity type.
     */
    async list(): Promise<TEntity[]> {
        const { Items } = await ddbDocClient.send(new QueryCommand({
            TableName: CONFIG_TABLE_NAME,
            IndexName: 'GSI_ListItems', // Assumes a GSI with PK=itemType, SK=PK
            KeyConditionExpression: 'itemType = :itemType',
            FilterExpression: 'SK = :skMetadata',
            ExpressionAttributeValues: { 
                ':itemType': this.config.itemType,
                ':skMetadata': 'METADATA'
             },
        }));
        return Items ? Items.map(item => fromStorageItem<any, TEntity>(item)) : [];
    }

    /**
     * Retrieves a single entity by its ID.
     */
    async get(id: string): Promise<TEntity | null> {
        const { Item } = await ddbDocClient.send(new GetCommand({
            TableName: CONFIG_TABLE_NAME,
            Key: { PK: `${this.config.pkPrefix}${id}`, SK: 'METADATA' },
        }));
        return Item ? fromStorageItem<any, TEntity>(Item) : null;
    }

    /**
     * Creates a new entity.
     * @param data The entity data, including its `id`. `createdAt` and `updatedAt` will be set automatically.
     */
    async create(data: CreateEntityInput<TEntity>): Promise<TEntity> {
        const now = new Date().toISOString();
        const fullData = { ...data, createdAt: now, updatedAt: now } as TEntity;
        
        const validatedData = this.config.schema.parse(fullData);
        const item = this.toStorageItem(validatedData);
        
        await ddbDocClient.send(new PutCommand({
            TableName: CONFIG_TABLE_NAME,
            Item: item,
            ConditionExpression: 'attribute_not_exists(PK)',
        }));
        return validatedData;
    }

    /**
     * Updates an existing entity.
     * @param id The ID of the entity to update.
     * @param data A partial object of the entity with fields to update.
     */
    async update(id: string, data: Partial<Omit<TEntity, 'id' | 'createdAt'>>): Promise<TEntity> {
        const existing = await this.get(id);
        if (!existing) {
            throw new Error(`${this.config.entityName} with ID ${id} not found.`);
        }

        const updatedData = { ...existing, ...data, updatedAt: new Date().toISOString() };
        
        const validatedData = this.config.schema.parse(updatedData);
        const item = this.toStorageItem(validatedData);

        await ddbDocClient.send(new PutCommand({
            TableName: CONFIG_TABLE_NAME,
            Item: item,
            ConditionExpression: 'attribute_exists(PK)', // Ensure we are updating an existing item
        }));
        return validatedData;
    }

    /**
     * Deletes an entity by its ID.
     */
    async delete(id: string): Promise<void> {
        await ddbDocClient.send(new DeleteCommand({
            TableName: CONFIG_TABLE_NAME,
            Key: { PK: `${this.config.pkPrefix}${id}`, SK: 'METADATA' },
            ConditionExpression: 'attribute_exists(PK)',
        }));
    }
}