import { GenericEntityManager } from './generic-entity.service.js';
import { McpConnection, McpConnectionSchema, ITEM_TYPE_ALLMA_MCP_CONNECTION } from '@allma/core-types';
import { v4 as uuidv4 } from 'uuid';

const entityManager = new GenericEntityManager<McpConnection>({
  pkPrefix: 'MCP_CONNECTION#',
  entityName: 'McpConnection',
  itemType: ITEM_TYPE_ALLMA_MCP_CONNECTION,
  schema: McpConnectionSchema,
});

export const McpConnectionService = {
  // Explicitly expose the methods from the generic manager, binding 'this' context.
  list: entityManager.list.bind(entityManager),
  get: entityManager.get.bind(entityManager),
  update: entityManager.update.bind(entityManager),
  delete: entityManager.delete.bind(entityManager),

  /**
   * Overrides the generic 'create' method to handle custom ID generation for MCP connections.
   * @param item The connection data, excluding system-managed fields.
   * @returns The newly created McpConnection entity.
   */
  create: (item: Omit<McpConnection, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `mcp-${uuidv4()}`;
    // The generic 'create' method will handle setting 'createdAt' and 'updatedAt'.
    // We just need to provide the generated ID along with the rest of the item data.
    // The `as any` cast is appropriate here as we are fulfilling the `CreateEntityInput` contract.
    return entityManager.create({ ...item, id } as any);
  },
};
