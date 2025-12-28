import {
  withAdminAuth,
  createApiGatewayResponse,
  buildSuccessResponse,
  buildErrorResponse,
  log_error,
  log_info,
  AuthContext,
} from '@allma/core-sdk';
import {
  AllmaExportFormat,
  AdminPermission,
  ExportApiInputSchema,
  ImportApiInputSchema,
  FlowDefinition,
  StepDefinition,
  PromptTemplate,
  McpConnection,
  StepType,
  Agent, 
} from '@allma/core-types';
import { FlowDefinitionService } from './services/flow-definition.service.js';
import { StepDefinitionService } from './services/step-definition.service.js';
import { PromptTemplateService } from './services/prompt-template.service.js';
import { McpConnectionService } from './services/mcp-connection.service.js';
import { AgentService } from './services/agent.service.js'; 
import { AllmaImporterService } from '../services/allma-importer.service.js';
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * The inner handler that contains the business logic for import and export operations.
 * It's wrapped by `withAdminAuth` to provide authentication and authorization context.
 */
async function mainHandler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  authContext: AuthContext
): Promise<APIGatewayProxyResultV2> {
  const correlationId = event.requestContext.requestId;
  const { body, rawPath } = event;
  const importer = new AllmaImporterService();

  try {
    // --- EXPORT LOGIC ---
    if (rawPath.endsWith('/export')) {
      if (!authContext.hasPermission(AdminPermission.DEFINITIONS_READ)) {
        return createApiGatewayResponse(403, buildErrorResponse('Forbidden: You do not have permission to export definitions.', 'FORBIDDEN'), correlationId);
      }

      const validation = ExportApiInputSchema.safeParse(JSON.parse(body || '{}'));
      if (!validation.success) {
        return createApiGatewayResponse(400, buildErrorResponse('Invalid input for export.', 'VALIDATION_ERROR', validation.error.flatten()), correlationId);
      }
      
      const { flowIds, stepDefinitionIds, promptTemplateIds, mcpConnectionIds, agentIds } = validation.data; // MODIFIED
      const inputFlowIds = flowIds || [];
      const inputStepIds = stepDefinitionIds || [];
      const inputPromptIds = promptTemplateIds || [];
      const inputMcpIds = mcpConnectionIds || [];
      const inputAgentIds = agentIds || []; 

      const isFullExport = inputFlowIds.length === 0 && inputStepIds.length === 0 && inputPromptIds.length === 0 && inputMcpIds.length === 0 && inputAgentIds.length === 0;

      // Sets to track all IDs we need to fetch
      const agentsToExport = new Set<string>(inputAgentIds); 
      const flowsToExport = new Set<string>(inputFlowIds);
      const stepsToExport = new Set<string>(inputStepIds);
      const promptsToExport = new Set<string>(inputPromptIds);
      const mcpsToExport = new Set<string>(inputMcpIds);

      // --- 1. If Full Export, gather ALL IDs from the system first ---
      if (isFullExport) {
        const allAgents = await AgentService.list(); 
        allAgents.forEach(a => agentsToExport.add(a.id)); 

        const allFlows = await FlowDefinitionService.listMasters();
        allFlows.forEach(f => flowsToExport.add(f.id));

        const allSteps = await StepDefinitionService.list();
        allSteps.forEach(s => stepsToExport.add(s.id));

        const allPrompts = await PromptTemplateService.listMasters();
        allPrompts.forEach(p => promptsToExport.add(p.id));

        const allMcps = await McpConnectionService.list();
        allMcps.forEach(m => mcpsToExport.add(m.id));
      }
      
      // --- 1.5. Gather flows from agents ---
      const finalAgents: Agent[] = [];
      for (const agentId of agentsToExport) {
          const agent = await AgentService.get(agentId);
          if (agent) {
              finalAgents.push(agent);
              agent.flowIds.forEach(flowId => flowsToExport.add(flowId));
          }
      }

      // --- 2. Recursive Dependency Discovery for Flows ---
      const processedFlowIds = new Set<string>();
      const flowProcessingQueue = [...flowsToExport];

      // Array to hold the final full flow definitions
      const finalFlows: FlowDefinition[] = [];

      while (flowProcessingQueue.length > 0) {
        const currentFlowId = flowProcessingQueue.shift()!;
        if (processedFlowIds.has(currentFlowId)) continue;
        processedFlowIds.add(currentFlowId);

        // Fetch all versions of this flow
        const versions = await FlowDefinitionService.listVersions(currentFlowId);
        
        for (const v of versions) {
          if (v.version) {
            const fullVersion = await FlowDefinitionService.getVersion(currentFlowId, v.version);
            if (fullVersion) {
              finalFlows.push(fullVersion);

              // Inspect steps for dependencies
              for (const step of Object.values(fullVersion.steps)) {
                // Dependency: Custom Step Definition
                if (step.stepDefinitionId && !step.stepDefinitionId.startsWith('system')) {
                  stepsToExport.add(step.stepDefinitionId);
                }

                // Dependency: Prompt Template
                if (step.stepType === StepType.LLM_INVOCATION) {
                    const promptId = (step as any).promptTemplateId;
                    if (promptId) promptsToExport.add(promptId);
                }

                // Dependency: MCP Connection
                if (step.stepType === StepType.MCP_CALL) {
                    const mcpId = (step as any).mcpConnectionId;
                    if (mcpId) mcpsToExport.add(mcpId);
                }

                // Dependency: Sub-Flow (Recursive)
                if (step.stepType === StepType.START_SUB_FLOW) {
                    const subFlowId = (step as any).subFlowDefinitionId;
                    if (subFlowId && !processedFlowIds.has(subFlowId)) {
                        flowsToExport.add(subFlowId);
                        flowProcessingQueue.push(subFlowId);
                    }
                }
              }
            }
          }
        }
      }

      // --- 3. Fetch Prompt Templates ---
      const finalPrompts: PromptTemplate[] = [];
      const promptsToFetch = [...promptsToExport];
      
      for (const promptId of promptsToFetch) {
          // Fetch master to check existence
          const meta = await PromptTemplateService.getMaster(promptId);
          if (meta) {
              const versions = await PromptTemplateService.listVersions(promptId);
              for (const v of versions) {
                  if (v.version) {
                      const fullVersion = await PromptTemplateService.getVersion(promptId, v.version);
                      if (fullVersion) finalPrompts.push(fullVersion);
                  }
              }
          }
      }

      // --- 4. Fetch Step Definitions ---
      const finalSteps: StepDefinition[] = [];
      const stepsToFetch = [...stepsToExport];
      const stepPromises = stepsToFetch.map(id => StepDefinitionService.get(id));
      const stepResults = await Promise.all(stepPromises);
      stepResults.forEach(s => {
          if (s) finalSteps.push(s);
      });

      // --- 5. Fetch MCP Connections ---
      const finalMcpConnections: McpConnection[] = [];
      const mcpsToFetch = [...mcpsToExport];
      const mcpPromises = mcpsToFetch.map(id => McpConnectionService.get(id));
      const mcpResults = await Promise.all(mcpPromises);
      mcpResults.forEach(m => {
          if (m) finalMcpConnections.push(m);
      });

      log_info(`Export complete. Found dependencies:`, { 
          agents: finalAgents.length, 
          flows: finalFlows.length, 
          steps: finalSteps.length, 
          prompts: finalPrompts.length, 
          mcps: finalMcpConnections.length 
      }, correlationId);

      const exportData: AllmaExportFormat = {
        formatVersion: '1.0',
        exportedAt: new Date().toISOString(),
        agents: finalAgents, 
        stepDefinitions: finalSteps,
        flows: finalFlows,
        promptTemplates: finalPrompts,
        mcpConnections: finalMcpConnections,
      };

      return createApiGatewayResponse(200, buildSuccessResponse(exportData), correlationId);
    }

    // --- IMPORT LOGIC ---
    if (rawPath.endsWith('/import')) {
      if (!authContext.hasPermission(AdminPermission.DEFINITIONS_WRITE)) {
        return createApiGatewayResponse(403, buildErrorResponse('Forbidden: You do not have permission to import definitions.', 'FORBIDDEN'), correlationId);
      }

      const rawData = JSON.parse(body || '{}');
      const validationResult = importer.validateImportData(rawData);

      if (!validationResult.success) {
        return createApiGatewayResponse(400, buildErrorResponse('Invalid input for import.', 'VALIDATION_ERROR', validationResult.error), correlationId);
      }

      // We still need to parse options which are part of the API payload but not the core export format.
      const optionsValidation = ImportApiInputSchema.pick({ options: true }).safeParse(rawData);
      if (!optionsValidation.success) {
         return createApiGatewayResponse(400, buildErrorResponse('Invalid import options.', 'VALIDATION_ERROR', optionsValidation.error.flatten()), correlationId);
      }
      
      const result = await importer.import(validationResult.data, optionsValidation.data.options);

      return createApiGatewayResponse(200, buildSuccessResponse(result), correlationId);
    }

    return createApiGatewayResponse(404, buildErrorResponse('Not Found: Invalid path. Must be /allma/import or /allma/export.', 'NOT_FOUND'), correlationId);

  } catch (error: any) {
    log_error('Error in import/export handler', { error: error.message, stack: error.stack }, correlationId);
    if (error instanceof SyntaxError) {
      return createApiGatewayResponse(400, buildErrorResponse('Invalid JSON in request body.', 'VALIDATION_ERROR'), correlationId);
    }
    return createApiGatewayResponse(500, buildErrorResponse('An unexpected error occurred during import/export.', 'SERVER_ERROR'), correlationId);
  }
}

// Export the wrapped handler as 'handler' for the Lambda runtime.
export const handler = withAdminAuth(mainHandler);