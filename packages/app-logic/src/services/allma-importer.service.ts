import { AllmaExportFormat, ImportApiResponse, FlowDefinition } from '@allma/core-types';
import { FlowDefinitionService } from '../allma-admin/services/flow-definition.service.js';
import { StepDefinitionService } from '../allma-admin/services/step-definition.service.js';

export class AllmaImporterService {
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