import {
  withAdminAuth,
  createApiGatewayResponse,
  buildSuccessResponse,
  buildErrorResponse,
  log_error,
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
} from '@allma/core-types';
import { FlowDefinitionService } from './services/flow-definition.service.js';
import { StepDefinitionService } from './services/step-definition.service.js';
import { PromptTemplateService } from './services/prompt-template.service.js';
import { AllmaImporterService } from '../services/allma-importer.service.js';
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * The inner handler that contains the business logic for import and export operations.
 * It's wrapped by `withAdminAuth` to provide authentication and authorization context.
 * @param event The API Gateway event.
 * @param authContext The authorization context provided by the middleware.
 * @returns A promise resolving to a full API Gateway proxy result.
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
      
      const { flowIds, stepDefinitionIds, promptTemplateIds } = validation.data;
      const isExportingFlows = !!flowIds && flowIds.length > 0;
      const isExportingSteps = !!stepDefinitionIds && stepDefinitionIds.length > 0;
      const isExportingPrompts = !!promptTemplateIds && promptTemplateIds.length > 0;
      const isFullExport = !isExportingFlows && !isExportingSteps && !isExportingPrompts;

      const finalFlows: FlowDefinition[] = [];
      let finalSteps: StepDefinition[] = [];
      const finalPrompts: PromptTemplate[] = [];
      const customStepIdsFromFlows = new Set<string>();

      // 1. Determine which flows to export and gather their step dependencies.
      if (isExportingFlows || isFullExport) {
        const allFlowMetadatas = await FlowDefinitionService.listMasters();
        const flowsToProcess = isExportingFlows ? allFlowMetadatas.filter(f => flowIds.includes(f.id)) : allFlowMetadatas;
        
        for (const meta of flowsToProcess) {
          const versions = await FlowDefinitionService.listVersions(meta.id);
          for (const v of versions) {
            if (v.version) {
              const fullVersion = await FlowDefinitionService.getVersion(meta.id, v.version);
              if (fullVersion) {
                finalFlows.push(fullVersion);
                // Collect dependent custom step IDs
                for (const step of Object.values(fullVersion.steps)) {
                  if (step.stepDefinitionId && !step.stepDefinitionId.startsWith('system')) {
                    customStepIdsFromFlows.add(step.stepDefinitionId);
                  }
                }
              }
            }
          }
        }
      }

      // 2. Determine which prompts to export.
      if (isExportingPrompts || isFullExport) {
        const allPromptMetadatas = await PromptTemplateService.listMasters();
        const promptsToProcess = isExportingPrompts ? allPromptMetadatas.filter(p => promptTemplateIds.includes(p.id)) : allPromptMetadatas;

        for (const meta of promptsToProcess) {
          const versions = await PromptTemplateService.listVersions(meta.id);
          for (const v of versions) {
            if (v.version) {
              const fullVersion = await PromptTemplateService.getVersion(meta.id, v.version);
              if (fullVersion) {
                finalPrompts.push(fullVersion);
              }
            }
          }
        }
      }

      // 3. Determine the final set of step definition IDs to fetch.
      const allStepIdsToFetch = new Set<string>(customStepIdsFromFlows);
      if (isExportingSteps) {
        stepDefinitionIds.forEach(id => allStepIdsToFetch.add(id));
      }

      // 4. Fetch the required step definitions.
      if (allStepIdsToFetch.size > 0) {
        const stepPromises = Array.from(allStepIdsToFetch).map(id => StepDefinitionService.get(id));
        finalSteps = (await Promise.all(stepPromises)).filter((s): s is StepDefinition => s !== null);
      } else if (isFullExport) {
        // For a full export, if no flows had custom steps, we still need to get all steps.
        finalSteps = await StepDefinitionService.list();
      }

      const exportData: AllmaExportFormat = {
        formatVersion: '1.0',
        exportedAt: new Date().toISOString(),
        stepDefinitions: finalSteps,
        flows: finalFlows,
        promptTemplates: finalPrompts,
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