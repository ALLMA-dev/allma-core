import { StepHandler, StepDefinition, FlowRuntimeState, PermanentStepError, McpCallStepPayloadSchema } from '@allma/core-types';
import { McpConnectionService } from '../../allma-admin/services/mcp-connection.service.js';
import { callTool } from '../utils/mcp-client.js';

export const handleMcpCall: StepHandler = async (stepDefinition: StepDefinition, stepInput: any, runtimeState: FlowRuntimeState) => {
  const validatedStep = McpCallStepPayloadSchema.parse(stepDefinition);
  const { mcpConnectionId, toolName } = validatedStep;

  try {
    const connection = await (McpConnectionService as any).get(mcpConnectionId);
    if (!connection) {
      // This is a permanent failure because the connection ID is invalid and will never become valid.
      throw new PermanentStepError(`MCP Connection with ID '${mcpConnectionId}' not found.`);
    }

    const result = await callTool(connection, toolName, stepInput);
    return {
      outputData: { result },
    };
  } catch (error) {
    // The callTool utility now throws specific, typed errors.
    // The orchestrator's iterative step processor is designed to catch these and act accordingly
    // (e.g., retry on TransientStepError, fail on PermanentStepError).
    // By re-throwing the original error, we let the orchestrator handle the failure as designed.
    throw error;
  }
};
