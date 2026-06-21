import { vi, describe, it, expect, beforeEach } from 'vitest';
import { StepType, PermanentStepError, TransientStepError, type StepDefinition } from '@allma/core-types';

// Both collaborators are non-AWS: the connection service (DynamoDB-backed, mocked here as a
// plain object) and the MCP client transport. Mocking them keeps the dispatch/error contract
// hermetic.
vi.mock('../../../../src/allma-admin/services/mcp-connection.service.js', () => ({
  McpConnectionService: { get: vi.fn() },
}));
vi.mock('../../../../src/allma-core/utils/mcp-client.js', () => ({
  callTool: vi.fn(),
}));

import { handleMcpCall } from '../../../../src/allma-core/step-handlers/mcp-call-handler.js';
import { McpConnectionService } from '../../../../src/allma-admin/services/mcp-connection.service.js';
import { callTool } from '../../../../src/allma-core/utils/mcp-client.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

const mockedGet = vi.mocked((McpConnectionService as unknown as { get: ReturnType<typeof vi.fn> }).get);
const mockedCallTool = vi.mocked(callTool);

const makeStepDef = (overrides: Record<string, unknown> = {}): StepDefinition =>
  ({
    stepType: StepType.MCP_CALL,
    mcpConnectionId: 'conn-1',
    toolName: 'search',
    ...overrides,
  }) as unknown as StepDefinition;

describe('handleMcpCall', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedCallTool.mockReset();
  });

  it('resolves the connection, calls the tool, and wraps the result', async () => {
    const connection = { id: 'conn-1', endpoint: 'https://mcp.test' };
    mockedGet.mockResolvedValue(connection);
    mockedCallTool.mockResolvedValue({ hits: 3 });

    const result = await handleMcpCall(makeStepDef(), { query: 'allma' }, makeRuntimeState());

    expect(result.outputData).toEqual({ result: { hits: 3 } });
    expect(mockedGet).toHaveBeenCalledWith('conn-1');
    expect(mockedCallTool).toHaveBeenCalledWith(connection, 'search', { query: 'allma' });
  });

  it('throws a PermanentStepError when the connection cannot be found', async () => {
    mockedGet.mockResolvedValue(null);

    await expect(handleMcpCall(makeStepDef(), {}, makeRuntimeState())).rejects.toBeInstanceOf(
      PermanentStepError
    );
    expect(mockedCallTool).not.toHaveBeenCalled();
  });

  it('re-throws a typed error from the MCP client unchanged', async () => {
    mockedGet.mockResolvedValue({ id: 'conn-1' });
    const transient = new TransientStepError('mcp upstream timeout');
    mockedCallTool.mockRejectedValue(transient);

    await expect(handleMcpCall(makeStepDef(), {}, makeRuntimeState())).rejects.toBe(transient);
  });

  it('rejects a structurally invalid step definition', async () => {
    await expect(handleMcpCall({ stepType: StepType.MCP_CALL } as never, {}, makeRuntimeState())).rejects.toThrow();
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
