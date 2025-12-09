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
   * Allows passing an ID to support import scenarios where ID preservation is key.
   * @param item The connection data, excluding system-managed fields (timestamps).
   * @returns The newly created McpConnection entity.
   */
  create: (item: Omit<McpConnection, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    // If ID is provided (e.g. from import), use it. Otherwise generate a new one.
    const id = item.id || `mcp-${uuidv4()}`;
    // The generic 'create' method expects an object with 'id'.
    // We construct the full object (minus timestamps which entityManager handles).
    // Casting as any is used to satisfy the generic constraint which expects exact types, 
    // though safely here as we ensure 'id' is present.
    return entityManager.create({ ...item, id } as any);
  },
};