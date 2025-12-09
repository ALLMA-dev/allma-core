import { AllmaExportFormat, AllmaExportFormatSchema, ImportApiResponse, StepDefinitionSchema, FlowDefinitionSchema, PromptTemplateSchema, McpConnectionSchema, StepDefinition } from '@allma/core-types';
import { FlowDefinitionService } from '../allma-admin/services/flow-definition.service.js';
import { StepDefinitionService } from '../allma-admin/services/step-definition.service.js';
import { PromptTemplateService } from '../allma-admin/services/prompt-template.service.js';
import { McpConnectionService } from '../allma-admin/services/mcp-connection.service.js';
import { deepMerge } from '@allma/core-sdk';
import { z } from 'zod';

type ValidationResult = 
  | { success: true; data: AllmaExportFormat }
  | { success: false; error: { formErrors: string[]; fieldErrors: Record<string, string[]> } };

export class AllmaImporterService {
  /**
   * Validates the raw data for an import operation with detailed, item-by-item checks.
   * @param rawData The raw, unparsed data from the import request.
   * @param sourceFileName Optional name of the source file for more descriptive error messages.
   * @returns A discriminated union indicating success with parsed data, or failure with structured errors.
   */
  public validateImportData(rawData: unknown, sourceFileName?: string): ValidationResult {
    const filePrefix = sourceFileName ? `[${sourceFileName}] ` : '';
    // Omit array fields from top-level check to process them individually later
    const topLevelSchema = AllmaExportFormatSchema.omit({ flows: true, stepDefinitions: true, promptTemplates: true, mcpConnections: true });
    const topLevelValidation = topLevelSchema.safeParse(rawData);

    if (!topLevelValidation.success) {
      return { success: false, error: topLevelValidation.error.flatten() };
    }

    const data = rawData as Partial<AllmaExportFormat>;
    const fieldErrors: Record<string, string[]> = {};
    const formErrors: string[] = [];

    // Manually iterate through Zod issues to build precise error paths.
    const processIssues = (issues: z.ZodIssue[], arrayName: 'flows' | 'stepDefinitions' | 'promptTemplates' | 'mcpConnections', itemIndex: number, itemIdentifier: string) => {
      for (const issue of issues) {
        if (issue.path.length === 0) {
          formErrors.push(`${filePrefix}${itemIdentifier}: ${issue.message}`);
        } else {
          const key = `${arrayName}[${itemIndex}].${issue.path.join('.')}`;
          fieldErrors[key] = (fieldErrors[key] || []).concat(`${filePrefix}${issue.message}`);
        }
      }
    };

    // Create a map of step definitions from this import file for in-memory hydration.
    const bundledStepMap = new Map((data.stepDefinitions || []).map(s => [s.id, s]));

    // Validate each flow individually
    if (data.flows && Array.isArray(data.flows)) {
      data.flows.forEach((flow, index) => {
        // Hydrate the flow in-memory before validation
        const hydratedFlow = JSON.parse(JSON.stringify(flow));
        if (hydratedFlow.steps) {
            for (const [stepId, stepInstance] of Object.entries(hydratedFlow.steps as Record<string, any>)) {
                if (stepInstance.stepDefinitionId) {
                    const baseDef = bundledStepMap.get(stepInstance.stepDefinitionId);
                    if (baseDef) {
                        const { id, name, version, createdAt, updatedAt, ...defProps } = baseDef as any;
                        const merged = deepMerge(defProps, stepInstance);
                        hydratedFlow.steps[stepId] = merged;
                    }
                }
            }
        }
        
        // Now validate the hydrated version
        const flowValidation = FlowDefinitionSchema.safeParse(hydratedFlow);
        if (!flowValidation.success) {
          const flowIdentifier = (flow as any)?.id ? `Flow '${(flow as any).id}' (v${(flow as any).version})` : `Flow at index ${index}`;
          processIssues(flowValidation.error.issues, 'flows', index, flowIdentifier);
        }
      });
    }

    // Validate each step definition individually
    if (data.stepDefinitions && Array.isArray(data.stepDefinitions)) {
      data.stepDefinitions.forEach((step, index) => {
        const stepValidation = StepDefinitionSchema.safeParse(step);
        if (!stepValidation.success) {
          const stepIdentifier = (step as any)?.id ? `Step Definition '${(step as any).id}'` : `Step Definition at index ${index}`;
          processIssues(stepValidation.error.issues, 'stepDefinitions', index, stepIdentifier);
        }
      });
    }

    // Validate each prompt template individually
    if (data.promptTemplates && Array.isArray(data.promptTemplates)) {
      data.promptTemplates.forEach((prompt, index) => {
        const promptValidation = PromptTemplateSchema.safeParse(prompt);
        if (!promptValidation.success) {
          const promptIdentifier = (prompt as any)?.id ? `Prompt '${(prompt as any).id}' (v${(prompt as any).version})` : `Prompt at index ${index}`;
          processIssues(promptValidation.error.issues, 'promptTemplates', index, promptIdentifier);
        }
      });
    }

    // Validate each MCP connection individually
    if (data.mcpConnections && Array.isArray(data.mcpConnections)) {
      data.mcpConnections.forEach((conn, index) => {
        const connValidation = McpConnectionSchema.safeParse(conn);
        if (!connValidation.success) {
          const connIdentifier = (conn as any)?.id ? `MCP Connection '${(conn as any).id}'` : `MCP Connection at index ${index}`;
          processIssues(connValidation.error.issues, 'mcpConnections', index, connIdentifier);
        }
      });
    }
    
    if (formErrors.length > 0 || Object.keys(fieldErrors).length > 0) {
      return { success: false, error: { formErrors, fieldErrors } };
    }

    // If all per-item validations have passed, the entire object is considered valid.
    // The redundant and faulty final validation is removed.
    return { success: true, data: data as AllmaExportFormat };
  }

  public async import(
    data: AllmaExportFormat,
    options: { overwrite: boolean }
  ): Promise<ImportApiResponse> {
    const result: ImportApiResponse = {
      created: { flows: 0, steps: 0, prompts: 0, mcpConnections: 0 },
      updated: { flows: 0, steps: 0, prompts: 0, mcpConnections: 0 },
      skipped: { flows: 0, steps: 0, prompts: 0, mcpConnections: 0 },
      errors: [],
    };

    // Step 1: Import Step Definitions
    if (data.stepDefinitions) {
      for (const step of data.stepDefinitions) {
        try {
          const existing = await StepDefinitionService.get(step.id);
          if (existing) {
            if (options.overwrite) {
              await StepDefinitionService.update(step.id, step);
              result.updated.steps++;
            } else {
              result.skipped.steps++;
            }
          } else {
            await StepDefinitionService.create(step as any);
            result.created.steps++;
          }
        } catch (error: any) {
          result.errors.push({
            id: step.id,
            type: 'step',
            message: error.message || 'An unknown error occurred',
          });
        }
      }
    }

    // Step 2: Import Prompt Templates
    if (data.promptTemplates) {
        for (const prompt of data.promptTemplates) {
          try {
            const existingMaster = await PromptTemplateService.getMaster(prompt.id);
            if (existingMaster) {
              if (options.overwrite) {
                await PromptTemplateService.updateMaster(prompt.id, {
                    name: prompt.name,
                    description: prompt.description,
                });

                const existingVersion = await PromptTemplateService.getVersion(prompt.id, prompt.version);
                if (existingVersion) {
                  // Update the Version record (content, etc.)
                  await PromptTemplateService.updateVersion(prompt.id, prompt.version, prompt, { ignorePublishedStatus: true });
                  
                  if (prompt.isPublished) {
                      await PromptTemplateService.publishVersion(prompt.id, prompt.version);
                  }
                  result.updated.prompts++;
                } else {
                  result.errors.push({ id: prompt.id, type: 'prompt', message: `Cannot overwrite prompt: version ${prompt.version} does not exist. Creating new versions for existing prompts on import is not supported.` });
                }
              } else {
                result.skipped.prompts++;
              }
            } else {
              await PromptTemplateService.createPromptFromImport(prompt);
              result.created.prompts++;
            }
          } catch (error: any) {
            result.errors.push({
              id: prompt.id,
              type: 'prompt',
              message: error.message || 'An unknown error occurred',
            });
          }
        }
    }

    // Step 3: Import Flow Definitions
    if (data.flows) {
        for (const flow of data.flows) {
          try {
            // The `FlowDefinitionService` now handles the hydration and validation internally.
            // We pass the raw, un-hydrated flow object directly to the service.
            const existingMaster = await FlowDefinitionService.getMaster(flow.id);
            if (existingMaster) {
              if (options.overwrite) {
                const name = flow.name as string;
                const description = flow.description as string;
                const tags = flow.tags as string[];
                await FlowDefinitionService.updateMaster(flow.id, {
                    name,
                    description,
                    tags,
                });

                const existingVersion = await FlowDefinitionService.getVersion(flow.id, flow.version);
                if (existingVersion) {
                  // The updateVersion service handles hydration, validation, and persistence correctly.
                  await FlowDefinitionService.updateVersion(flow.id, flow.version, flow, { ignorePublishedStatus: true });
                  if (flow.isPublished) {
                      await FlowDefinitionService.publishVersion(flow.id, flow.version);
                  }
                  result.updated.flows++;
                } else {
                  result.errors.push({ id: flow.id, type: 'flow', message: `Cannot overwrite flow: version ${flow.version} does not exist. Creating new versions for existing flows on import is not supported.` });
                }
              } else {
                result.skipped.flows++;
              }
            } else {
              // The create service also handles hydration and validation.
              await FlowDefinitionService.createFlowFromImport(flow);
              result.created.flows++;
            }
          } catch (error: any) {
            result.errors.push({
              id: flow.id,
              type: 'flow',
              message: error.message || 'An unknown error occurred',
            });
          }
        }
    }

    // Step 4: Import MCP Connections
    if (data.mcpConnections) {
      for (const connection of data.mcpConnections) {
        try {
          const existing = await McpConnectionService.get(connection.id);
          if (existing) {
            if (options.overwrite) {
              const { id, createdAt, updatedAt, ...updateData } = connection;
              await McpConnectionService.update(connection.id, updateData);
              result.updated.mcpConnections++;
            } else {
              result.skipped.mcpConnections++;
            }
          } else {
            const { createdAt, updatedAt, ...createData } = connection;
            await McpConnectionService.create(createData);
            result.created.mcpConnections++;
          }
        } catch (error: any) {
          result.errors.push({
            id: connection.id,
            type: 'mcpConnection',
            message: error.message || 'An unknown error occurred during MCP connection import',
          });
        }
      }
    }

    return result;
  }
}