import { StepHandler, StepDefinition, FlowRuntimeState, McpCallStepPayloadSchema } from '@allma/core-types';
import { loadMcpConnection } from '../config-loader.js';
import { callTool } from '../utils/mcp-client.js';

export const handleMcpCall: StepHandler = async (stepDefinition: StepDefinition, stepInput: any, runtimeState: FlowRuntimeState) => {
  const validatedStep = McpCallStepPayloadSchema.parse(stepDefinition);
  const { mcpConnectionId, toolName } = validatedStep;

  try {
    const connection = await loadMcpConnection(mcpConnectionId, runtimeState.flowExecutionId);
    const result = await callTool(connection, toolName, stepInput);
    return {
      outputData: { result },
    };
  } catch (error) {
    throw error;
  }
};
