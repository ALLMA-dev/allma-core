import { AllmaExportFormat, ImportApiResponse, StepDefinitionSchema, FlowDefinitionSchema, PromptTemplateSchema, McpConnectionSchema, StepDefinition, FlowDefinition, AgentSchema, Agent } from '@allma/core-types';
import { FlowDefinitionService } from '../allma-admin/services/flow-definition.service.js';
import { StepDefinitionService } from '../allma-admin/services/step-definition.service.js';
import { PromptTemplateService } from '../allma-admin/services/prompt-template.service.js';
import { McpConnectionService } from '../allma-admin/services/mcp-connection.service.js';
import { AgentService } from '../allma-admin/services/agent.service.js';
import { validateAllmaConfig, ValidationResult } from '@allma/core-sdk';

export class AllmaImporterService {
  /**
   * Validates the raw data for an import operation by calling the centralized validator from the SDK.
   * @param rawData The raw, unparsed data from the import request.
   * @param sourceFileName Optional name of the source file for more descriptive error messages.
   * @returns A discriminated union indicating success with parsed data, or failure with structured errors.
   */
  public validateImportData(rawData: unknown, sourceFileName?: string): ValidationResult {
    // This delegates to the centralized validator in the SDK.
    return validateAllmaConfig(rawData, sourceFileName);
  }

  public async import(
    data: AllmaExportFormat,
    options: { overwrite: boolean }
  ): Promise<ImportApiResponse> {
    const result: ImportApiResponse = {
      created: { flows: 0, steps: 0, prompts: 0, mcpConnections: 0, agents: 0 },
      updated: { flows: 0, steps: 0, prompts: 0, mcpConnections: 0, agents: 0 },
      skipped: { flows: 0, steps: 0, prompts: 0, mcpConnections: 0, agents: 0 },
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
            // Re-parse the flow object.
            // It ensures that optional fields with defaults (like `flowVariables`) are
            // correctly initialized on the object before it's passed to any service.
            const parsedFlow = FlowDefinitionSchema.parse(flow) as FlowDefinition;

            const existingMaster = await FlowDefinitionService.getMaster(parsedFlow.id);
            if (existingMaster) {
              if (options.overwrite) {
                const name = parsedFlow.name as string;
                const description = parsedFlow.description as string;
                const tags = parsedFlow.tags as string[];
                await FlowDefinitionService.updateMaster(parsedFlow.id, {
                    name,
                    description,
                    tags,
                    ...(parsedFlow.flowVariables && { flowVariables: parsedFlow.flowVariables }),
                });

                const existingVersion = await FlowDefinitionService.getVersion(parsedFlow.id, parsedFlow.version);
                if (existingVersion) {
                  // The updateVersion service handles hydration, validation, and persistence.
                  await FlowDefinitionService.updateVersion(parsedFlow.id, parsedFlow.version, parsedFlow, { ignorePublishedStatus: true });
                  if (parsedFlow.isPublished) {
                      await FlowDefinitionService.publishVersion(parsedFlow.id, parsedFlow.version);
                  }
                  result.updated.flows++;
                } else {
                  result.errors.push({ id: parsedFlow.id, type: 'flow', message: `Cannot overwrite flow: version ${parsedFlow.version} does not exist. Creating new versions for existing flows on import is not supported.` });
                }
              } else {
                result.skipped.flows++;
              }
            } else {
              // The create service also handles hydration and validation.
              await FlowDefinitionService.createFlowFromImport(parsedFlow);
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

    // Step 5: Import Agents
    if (data.agents) {
        for (const agent of data.agents) {
            try {
                const existing = await AgentService.get(agent.id);
                if (existing) {
                    if (options.overwrite) {
                        const { id, createdAt, updatedAt, ...updateData } = agent;
                        await AgentService.update(agent.id, updateData);
                        result.updated.agents++;
                    } else {
                        result.skipped.agents++;
                    }
                } else {
                    const { createdAt, updatedAt, ...createData } = agent;
                    await AgentService.create(createData as Agent);
                    result.created.agents++;
                }
            } catch (error: any) {
                result.errors.push({
                    id: agent.id,
                    type: 'agent',
                    message: error.message || 'An unknown error occurred during Agent import',
                });
            }
        }
    }

    return result;
  }
}