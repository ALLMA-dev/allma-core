import { vi, describe, it, expect, beforeEach } from 'vitest';
import { StepType, PermanentStepError, TransientStepError, type StepDefinition } from '@allma/core-types';

vi.mock('../../../../src/allma-core/config-loader.js', () => ({
  loadMcpConnection: vi.fn(),
}));
vi.mock('../../../../src/allma-core/utils/mcp-client.js', () => ({
  callTool: vi.fn(),
}));

import { handleMcpCall } from '../../../../src/allma-core/step-handlers/mcp-call-handler.js';
import { loadMcpConnection } from '../../../../src/allma-core/config-loader.js';
import { callTool } from '../../../../src/allma-core/utils/mcp-client.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

const mockedLoadMcpConnection = vi.mocked(loadMcpConnection);
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
    mockedLoadMcpConnection.mockReset();
    mockedCallTool.mockReset();
  });

  it('resolves the connection, calls the tool, and wraps the result', async () => {
    const connection = {
      id: 'conn-1',
      name: 'test-mcp',
      serverUrl: 'https://mcp.test',
      authentication: { type: 'NONE' as const },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockedLoadMcpConnection.mockResolvedValue(connection);
    mockedCallTool.mockResolvedValue({ hits: 3 });

    const runtimeState = makeRuntimeState({ flowExecutionId: 'exec-123' });
    const result = await handleMcpCall(makeStepDef(), { query: 'allma' }, runtimeState);

    expect(result.outputData).toEqual({ result: { hits: 3 } });
    expect(mockedLoadMcpConnection).toHaveBeenCalledWith('conn-1', 'exec-123');
    expect(mockedCallTool).toHaveBeenCalledWith(connection, 'search', { query: 'allma' });
  });

  it('throws a PermanentStepError when the connection cannot be found', async () => {
    mockedLoadMcpConnection.mockRejectedValue(
      new PermanentStepError("MCP Connection not found for id: conn-1")
    );

    await expect(handleMcpCall(makeStepDef(), {}, makeRuntimeState())).rejects.toBeInstanceOf(
      PermanentStepError
    );
    expect(mockedCallTool).not.toHaveBeenCalled();
  });

  it('re-throws a typed error from the MCP client unchanged', async () => {
    mockedLoadMcpConnection.mockResolvedValue({
      id: 'conn-1',
      name: 'test-mcp',
      serverUrl: 'https://mcp.test',
      authentication: { type: 'NONE' as const },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    const transient = new TransientStepError('mcp upstream timeout');
    mockedCallTool.mockRejectedValue(transient);

    await expect(handleMcpCall(makeStepDef(), {}, makeRuntimeState())).rejects.toBe(transient);
  });

  it('rejects a structurally invalid step definition', async () => {
    await expect(handleMcpCall({ stepType: StepType.MCP_CALL } as never, {}, makeRuntimeState())).rejects.toThrow();
    expect(mockedLoadMcpConnection).not.toHaveBeenCalled();
  });
});
