import { AllmaExportFormat, ImportApiResponse } from '@allma/core-types';
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
    for (const flow of data.flows) {
      try {
        const existing = await FlowDefinitionService.getMaster(flow.id);
        if (existing) {
          if (options.overwrite) {
            // We need to decide on the update strategy. A simple approach is to
            // update the latest version. A more complex one might create a new version.
            // For now, let's assume we update the latest version if it exists.
            const versions = await FlowDefinitionService.listVersions(flow.id);
            const sortedVersions = versions
              .filter(v => typeof v.version === 'number')
              .sort((a, b) => b.version! - a.version!);

            if (sortedVersions.length > 0) {
              const latestVersion = sortedVersions[0];
              await FlowDefinitionService.updateVersion(flow.id, latestVersion.version!, flow);
              result.updated.flows++;
            } else {
              // If no versions exist for some reason, we can't update.
              result.errors.push({ id: flow.id, type: 'flow', message: 'Cannot update flow with no existing versions.' });
            }
          } else {
            result.skipped.flows++;
          }
        } else {
          // The `createFlow` service method expects a specific input shape.
          // We need to adapt the imported `FlowDefinition` to match `CreateFlowInput`.
          await FlowDefinitionService.createFlow({
            name: String(flow.name), // Ensure name is a string
            description: flow.description,
          });
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
