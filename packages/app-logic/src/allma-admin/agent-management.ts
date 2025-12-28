import {
  AdminPermission,
  CreateAgentInputSchema,
  UpdateAgentInputSchema,
} from '@allma/core-types';
import { AgentService } from './services/agent.service.js';
import { createCrudHandler } from './utils/create-crud-handler.js';

export const handler = createCrudHandler({
  isVersioned: false,
  service: {
    list: AgentService.list.bind(AgentService),
    get: AgentService.get.bind(AgentService),
    create: AgentService.create.bind(AgentService),
    update: AgentService.update.bind(AgentService),
    delete: AgentService.delete.bind(AgentService),
  },
  schemas: {
    create: CreateAgentInputSchema,
    update: UpdateAgentInputSchema,
  },
  permissions: {
    read: AdminPermission.DEFINITIONS_READ,
    write: AdminPermission.DEFINITIONS_WRITE,
    delete: AdminPermission.DEFINITIONS_DELETE,
  },
  basePath: '/allma/agents',
  idParamName: 'agentId',
});