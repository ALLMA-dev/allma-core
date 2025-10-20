import { Stage } from "../common/shared.js";

export const ALLMA_ADMIN_API_VERSION = 'v1';

/**
 * Admin Route Segments (ARS) for consistent URL construction.
 */
export const ARS = {
    PROMPT_TEMPLATES: 'prompt-templates', 
    FLOW_EXECUTIONS: 'flow-executions',
    FLOWS: 'flows',
    DASHBOARD: 'dashboard', 
    STEP_DEFINITIONS: 'step-definitions',
};

/**
 * Defines the backend API routes for the Allma Admin service.
 */
export const ALLMA_ADMIN_API_ROUTES = {
  // System
  RESUME: '/allma/resume',

  // Dashboard
  DASHBOARD_STATS: `/allma/${ARS.DASHBOARD}/stats`,

  // Prompt Templates
  PROMPT_TEMPLATES: `/allma/${ARS.PROMPT_TEMPLATES}`,
  PROMPT_TEMPLATE_CLONE: (promptId: string) => `/allma/${ARS.PROMPT_TEMPLATES}/${promptId}/clone`,
  PROMPT_TEMPLATE_VERSIONS: (promptId: string) => `/allma/${ARS.PROMPT_TEMPLATES}/${promptId}/versions`,
  PROMPT_TEMPLATE_VERSION_DETAIL: (promptId: string, versionNumber: string | number) => `/allma/${ARS.PROMPT_TEMPLATES}/${promptId}/versions/${versionNumber}`,
  PROMPT_TEMPLATE_VERSION_PUBLISH: (promptId: string, versionNumber: string | number) => `/allma/${ARS.PROMPT_TEMPLATES}/${promptId}/versions/${versionNumber}/publish`,
  PROMPT_TEMPLATE_VERSION_UNPUBLISH: (promptId: string, versionNumber: string | number) => `/allma/${ARS.PROMPT_TEMPLATES}/${promptId}/versions/${versionNumber}/unpublish`,

  // Flows
  FLOWS: `/allma/${ARS.FLOWS}`,
  FLOW_TAGS: `/allma/${ARS.FLOWS}/tags`,
  FLOW_CONFIG_DETAIL: (flowId: string) => `/allma/${ARS.FLOWS}/${flowId}`,
  FLOW_TRIGGER: (flowId: string) => `/allma/${ARS.FLOWS}/${flowId}/trigger`, 
  FLOW_CLONE: (flowId: string) => `/allma/${ARS.FLOWS}/${flowId}/clone`,
  FLOW_LIST_VERSIONS: (flowId: string) => `/allma/${ARS.FLOWS}/${flowId}/versions`,
  FLOW_CREATE_VERSION: (flowId: string) => `/allma/${ARS.FLOWS}/${flowId}/versions`,
  FLOW_VERSION_DETAIL: (flowId: string, versionNumber: string | number) => `/allma/${ARS.FLOWS}/${flowId}/versions/${versionNumber}`,
  FLOW_VERSION_PUBLISH: (flowId: string, versionNumber: string | number) => `/allma/${ARS.FLOWS}/${flowId}/versions/${versionNumber}/publish`,
  FLOW_VERSION_UNPUBLISH: (flowId: string, versionNumber: string | number) => `/allma/${ARS.FLOWS}/${flowId}/versions/${versionNumber}/unpublish`,
  FLOW_VERSION_EXECUTE: (flowId: string, versionNumber: string | number) => `/allma/${ARS.FLOWS}/${flowId}/versions/${versionNumber}/execute`,
  FLOW_SANDBOX_STEP: `/allma/${ARS.FLOWS}/sandbox/step`,

  // Flow Executions
  FLOW_EXECUTIONS: `/allma/${ARS.FLOW_EXECUTIONS}`,
  FLOW_EXECUTION_DETAIL: (executionId: string) => `/allma/${ARS.FLOW_EXECUTIONS}/${executionId}`, 
  FLOW_EXECUTION_BRANCH_STEPS: (executionId: string) => `/allma/${ARS.FLOW_EXECUTIONS}/${executionId}/branch-steps`,
  FLOW_EXECUTION_REDRIVE: (executionId: string) => `/allma/${ARS.FLOW_EXECUTIONS}/${executionId}/redrive`,
  FLOW_EXECUTION_STATEFUL_REDRIVE: (executionId: string) => `/allma/${ARS.FLOW_EXECUTIONS}/${executionId}/stateful-redrive`,

  // Step Definitions
  STEP_DEFINITIONS: `/allma/${ARS.STEP_DEFINITIONS}`,
  STEP_DEFINITION_DETAIL: (stepId: string) => `/allma/${ARS.STEP_DEFINITIONS}/${stepId}`,

  // Import / Export
  IMPORT: '/allma/import',
  EXPORT: '/allma/export',
};

export function getStageFromEnv(env?: string, fallback: Stage = Stage.PROD): Stage {
  switch ((env || '').toLowerCase()) {
    case 'dev': return Stage.DEV;
    case 'beta': return Stage.BETA;
    case 'prod': return Stage.PROD;
    default: return fallback;
  }
}
