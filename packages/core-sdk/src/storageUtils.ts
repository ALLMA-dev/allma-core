import { z } from 'zod';
import {
    PromptTemplateSchema,
    PromptTemplateVersionStorageItemSchema,
    PromptTemplateVersionStorageItem,
    ITEM_TYPE_ALLMA_PROMPT_TEMPLATE,
} from '@allma/core-types';

/**
 * Converts a DynamoDB storage item to its corresponding API type by stripping storage-specific keys.
 * This is a generic helper for the application's data access layer.
 * @param item The storage item from DynamoDB.
 * @returns The item formatted as its API type.
 */
export function fromStorageItem<T extends { PK: string, SK: string, itemType: string }, U>(item: T): U {
    const { PK: _, SK: __, itemType: ___, ...apiItem } = item;
    return apiItem as U;
}

/**
 * Converts a PromptTemplate API object to its DynamoDB storage representation.
 * This helper is specific to the application's data access layer for prompt templates.
 * @param apiItem The PromptTemplate object.
 * @returns The validated storage item for a prompt version.
 * @throws An error if the constructed item fails validation.
 */
export function toPromptTemplateVersionStorageItem(apiItem: z.infer<typeof PromptTemplateSchema>): PromptTemplateVersionStorageItem {
    const storageItem: PromptTemplateVersionStorageItem = {
        ...apiItem,
        PK: `PROMPT_TEMPLATE#${apiItem.id}`,
        SK: `VERSION#${apiItem.version}`,
        itemType: ITEM_TYPE_ALLMA_PROMPT_TEMPLATE,
    };
    const validationResult = PromptTemplateVersionStorageItemSchema.safeParse(storageItem);
    if (!validationResult.success) {
        throw new Error(`Internal data integrity error: Constructed PromptTemplate version storage item is invalid: ${validationResult.error.message}`);
    }
    return validationResult.data;
}
