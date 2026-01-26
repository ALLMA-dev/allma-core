import {
  AllmaExportFormat,
  StepDefinitionSchema,
  FlowDefinitionSchema,
  PromptTemplateSchema,
  McpConnectionSchema,
  AgentSchema,
  StepDefinition,
  FlowDefinition,
  PromptTemplate,
  McpConnection,
  Agent,
} from '@allma/core-types';
import { deepMerge } from './objectUtils.js';
import { z } from 'zod';

/**
 * The structured result of a validation operation.
 */
export type ValidationResult =
  | { success: true; data: AllmaExportFormat }
  | { success: false; error: { formErrors: string[]; fieldErrors: Record<string, string[]> } };

/**
 * Validates the raw data for an import operation with detailed, item-by-item checks.
 * This function is centralized in the SDK to be reusable by both the CDK pre-validation
 * step and the backend importer services. It performs in-memory hydration of flows
 * using step definitions from the same import bundle before validation.
 *
 * @param rawData The raw, unparsed data from the import request.
 * @param sourceFileName Optional name of the source file for more descriptive error messages.
 * @returns A discriminated union indicating success with parsed data, or failure with structured errors.
 */
export function validateAllmaConfig(rawData: unknown, sourceFileName?: string): ValidationResult {
  const filePrefix = sourceFileName ? `[${sourceFileName}] ` : '';
  
  // Define a simple schema for top-level validation of the export format structure.
  const topLevelSchema = z.object({
      formatVersion: z.literal('1.0'),
      exportedAt: z.string().datetime(),
  });
  const topLevelValidation = topLevelSchema.safeParse(rawData);

  if (!topLevelValidation.success) {
    return { success: false, error: topLevelValidation.error.flatten() };
  }

  const data = rawData as Partial<AllmaExportFormat>;
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];

  // Helper to process Zod issues and build precise error paths for better feedback.
  const processIssues = (issues: z.ZodIssue[], arrayName: 'flows' | 'stepDefinitions' | 'promptTemplates' | 'mcpConnections' | 'agents', itemIndex: number, itemIdentifier: string) => {
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
      // Hydrate the flow in-memory before validation by merging referenced step definitions.
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
  
  // Validate each agent individually
  if (data.agents && Array.isArray(data.agents)) {
      data.agents.forEach((agent, index) => {
          const agentValidation = AgentSchema.safeParse(agent);
          if (!agentValidation.success) {
              const agentIdentifier = (agent as any)?.id ? `Agent '${(agent as any).id}'` : `Agent at index ${index}`;
              processIssues(agentValidation.error.issues, 'agents', index, agentIdentifier);
          }
      });
  }
  
  if (formErrors.length > 0 || Object.keys(fieldErrors).length > 0) {
    return { success: false, error: { formErrors, fieldErrors } };
  }

  return { success: true, data: data as AllmaExportFormat };
}