import { AllmaExportFormat, AllmaExportFormatSchema, ImportApiResponse, FlowDefinition, StepDefinition, StepDefinitionSchema, FlowDefinitionSchema } from '@allma/core-types';
import { FlowDefinitionService } from '../allma-admin/services/flow-definition.service.js';
import { StepDefinitionService } from '../allma-admin/services/step-definition.service.js';
import { z, ZodError } from 'zod';

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
    const topLevelSchema = AllmaExportFormatSchema.omit({ flows: true, stepDefinitions: true });
    const topLevelValidation = topLevelSchema.safeParse(rawData);

    if (!topLevelValidation.success) {
      return { success: false, error: topLevelValidation.error.flatten() };
    }

    const data = rawData as Partial<AllmaExportFormat>;
    const fieldErrors: Record<string, string[]> = {};
    const formErrors: string[] = [];

    // Manually iterate through Zod issues to build precise error paths.
    const processIssues = (issues: z.ZodIssue[], arrayName: 'flows' | 'stepDefinitions', itemIndex: number, itemIdentifier: string) => {
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
      created: { flows: 0, steps: 0 },
      updated: { flows: 0, steps: 0 },
      skipped: { flows: 0, steps: 0 },
      errors: [],
    };

    // Step 1: Import Step Definitions
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

    // Step 2: Import Flow Definitions
    // TODO: For robust multi-version imports, this logic should first group flows by ID.
    // The current loop processes each version from the file individually, which has limitations
    // when importing multiple versions of the same new flow.
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

    return result;
  }
}