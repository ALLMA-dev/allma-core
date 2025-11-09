import { AllmaExportFormat, AllmaExportFormatSchema, ImportApiResponse, StepDefinitionSchema, FlowDefinitionSchema, PromptTemplateSchema } from '@allma/core-types';
import { FlowDefinitionService } from '../allma-admin/services/flow-definition.service.js';
import { StepDefinitionService } from '../allma-admin/services/step-definition.service.js';
import { PromptTemplateService } from '../allma-admin/services/prompt-template.service.js';
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
    const topLevelSchema = AllmaExportFormatSchema.omit({ flows: true, stepDefinitions: true, promptTemplates: true });
    const topLevelValidation = topLevelSchema.safeParse(rawData);

    if (!topLevelValidation.success) {
      return { success: false, error: topLevelValidation.error.flatten() };
    }

    const data = rawData as Partial<AllmaExportFormat>;
    const fieldErrors: Record<string, string[]> = {};
    const formErrors: string[] = [];

    // Manually iterate through Zod issues to build precise error paths.
    const processIssues = (issues: z.ZodIssue[], arrayName: 'flows' | 'stepDefinitions' | 'promptTemplates', itemIndex: number, itemIdentifier: string) => {
      for (const issue of issues) {
        if (issue.path.length === 0) {
          formErrors.push(`${filePrefix}${itemIdentifier}: ${issue.message}`);
        } else {
          const key = `${arrayName}[${itemIndex}].${issue.path.join('.')}`;
          fieldErrors[key] = (fieldErrors[key] || []).concat(`${filePrefix}${issue.message}`);
        }
      }
    };

    // Validate each flow individually
    if (data.flows && Array.isArray(data.flows)) {
      data.flows.forEach((flow, index) => {
        const flowValidation = FlowDefinitionSchema.safeParse(flow);
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
    
    if (formErrors.length > 0 || Object.keys(fieldErrors).length > 0) {
      return { success: false, error: { formErrors, fieldErrors } };
    }

    // Final parse of the whole object to get a fully typed result
    const finalValidation = AllmaExportFormatSchema.safeParse(data);
    if (finalValidation.success) {
      return { success: true, data: finalValidation.data };
    } else {
      // This should be unreachable if the above logic is correct, but serves as a safeguard.
      return { success: false, error: finalValidation.error.flatten() };
    }
  }

  public async import(
    data: AllmaExportFormat,
    options: { overwrite: boolean }
  ): Promise<ImportApiResponse> {
    const result: ImportApiResponse = {
      created: { flows: 0, steps: 0, prompts: 0 },
      updated: { flows: 0, steps: 0, prompts: 0 },
      skipped: { flows: 0, steps: 0, prompts: 0 },
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
            // The create method in the service handles the full creation logic.
            // We assume the imported `step` object fits the `CreateStepDefinitionInput` shape.
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
                const existingVersion = await PromptTemplateService.getVersion(prompt.id, prompt.version);
                if (existingVersion) {
                  if (existingVersion.isPublished) {
                    result.errors.push({ id: prompt.id, type: 'prompt', message: `Version ${prompt.version} is published and cannot be overwritten.` });
                    continue;
                  }
                  await PromptTemplateService.updateVersion(prompt.id, prompt.version, prompt);
                  result.updated.prompts++;
                } else {
                  result.errors.push({ id: prompt.id, type: 'prompt', message: `Cannot overwrite prompt: version ${prompt.version} does not exist. Creating new versions for existing prompts on import is not supported.` });
                }
              } else {
                result.skipped.prompts++;
              }
            } else {
              // This prompt does not exist. Create it from the imported definition.
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
            const existingMaster = await FlowDefinitionService.getMaster(flow.id);
            if (existingMaster) {
              if (options.overwrite) {
                const existingVersion = await FlowDefinitionService.getVersion(flow.id, flow.version);
                if (existingVersion) {
                  // This version exists, so update it.
                  if (existingVersion.isPublished) {
                      result.errors.push({ id: flow.id, type: 'flow', message: `Version ${flow.version} is published and cannot be overwritten.` });
                      continue;
                  }
                  await FlowDefinitionService.updateVersion(flow.id, flow.version, flow);
                  result.updated.flows++;
                } else {
                  // This version doesn't exist for a flow that is already in the system.
                  // Creating new versions on an existing flow during import is not supported yet.
                  result.errors.push({ id: flow.id, type: 'flow', message: `Cannot overwrite flow: version ${flow.version} does not exist. Creating new versions for existing flows on import is not supported.` });
                }
              } else {
                result.skipped.flows++;
              }
            } else {
              // This flow does not exist. Create it from the imported definition.
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

    return result;
  }
}