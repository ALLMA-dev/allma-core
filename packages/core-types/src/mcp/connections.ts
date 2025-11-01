import { z } from 'zod';
import { ITEM_TYPE_ALLMA_MCP_CONNECTION } from '../common/core.js';

const NoneAuthSchema = z.object({
  type: z.literal('NONE'),
});

const BearerTokenAuthSchema = z.object({
  type: z.literal('BEARER_TOKEN'),
  secretArn: z.string(),
  secretJsonKey: z.string(),
});

const ApiKeyAuthSchema = z.object({
  type: z.literal('API_KEY'),
  secretArn: z.string(),
  secretJsonKey: z.string(),
});

export const McpAuthenticationSchema = z.discriminatedUnion('type', [
  NoneAuthSchema,
  BearerTokenAuthSchema,
  ApiKeyAuthSchema,
]);
export type McpAuthentication = z.infer<typeof McpAuthenticationSchema>;

export const McpConnectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  serverUrl: z.string().url(),
  authentication: McpAuthenticationSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type McpConnection = z.infer<typeof McpConnectionSchema>;

export const McpConnectionMetadataStorageItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  itemType: z.literal(ITEM_TYPE_ALLMA_MCP_CONNECTION),
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type McpConnectionMetadataStorageItem = z.infer<typeof McpConnectionMetadataStorageItemSchema>;
