// Import test utilities from 'vitest'.
import { vi, describe, expect, beforeAll, afterAll, beforeEach, it } from 'vitest';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Import the SUT (System Under Test)
import { handleLlmInvocation } from '../../../src/allma-core/step-handlers/llm-invocation-handler';

// Import the module to be mocked so we can access its members for type casting
import * as adapterRegistry from '../../../src/allma-core/llm-adapters/adapter-registry';

// Import types
import {
  type FlowRuntimeState,
  type LlmGenerationResponse,
  type PromptTemplate,
  type StepDefinition,
  LLMProviderType,
  StepType,
  type PromptTemplateMetadataStorageItem,
  ITEM_TYPE_ALLMA_PROMPT_TEMPLATE,
} from '@allma/core-types';
import { toPromptTemplateVersionStorageItem } from '@allma/core-sdk';

// This is the cleanest, most reliable way to mock in Vitest.
vi.mock('../../../src/allma-core/llm-adapters/adapter-registry');

const CONFIG_TABLE_NAME = process.env.ALLMA_CONFIG_TABLE_NAME!;
if (!CONFIG_TABLE_NAME) {
  throw new Error('Missing environment variable: ALLMA_CONFIG_TABLE_NAME. Make sure the integration test setup is running correctly.');
}

describe('Integration: LLM Invocation Step Handler', () => {
  let ddbDocClient: DynamoDBDocumentClient;
  const testCorrelationId = uuidv4();
  const testPromptTemplateId = `test-prompt-${uuidv4()}`;
  
  const promptTemplate: PromptTemplate = {
    id: testPromptTemplateId,
    name: 'Test Greeting Prompt',
    content: 'Hello, {{name}}! The secret code is {{secret_code}}.',
    version: 1,
    isPublished: true,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['test'],
  };

  // Vitest auto-mocks every export of the mocked module.
  const mockedGetLlmAdapter = vi.mocked(adapterRegistry.getLlmAdapter);

  beforeAll(async () => {
    const ddbClient = new DynamoDBClient({});
    ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
    
    // Create a valid versioned prompt template in the DB
    const metadataItem: PromptTemplateMetadataStorageItem = {
      PK: `PROMPT_TEMPLATE#${promptTemplate.id}`,
      SK: 'METADATA',
      itemType: ITEM_TYPE_ALLMA_PROMPT_TEMPLATE,
      id: promptTemplate.id,
      name: promptTemplate.name,
      latestVersion: 1,
      publishedVersion: 1, // Mark version 1 as published
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const versionItem = toPromptTemplateVersionStorageItem(promptTemplate);

    await ddbDocClient.send(new PutCommand({ TableName: CONFIG_TABLE_NAME, Item: metadataItem }));
    await ddbDocClient.send(new PutCommand({ TableName: CONFIG_TABLE_NAME, Item: versionItem }));
  });

  afterAll(async () => {
    // Delete both the version and the metadata record
    await ddbDocClient.send(new DeleteCommand({
      TableName: CONFIG_TABLE_NAME,
      Key: { PK: `PROMPT_TEMPLATE#${promptTemplate.id}`, SK: `VERSION#${promptTemplate.version}` },
    }));
    await ddbDocClient.send(new DeleteCommand({
      TableName: CONFIG_TABLE_NAME,
      Key: { PK: `PROMPT_TEMPLATE#${promptTemplate.id}`, SK: 'METADATA' },
    }));
    ddbDocClient.destroy();
  });

  // `clearMocks: true` in the config handles resetting call history.
  // We just need to reset the implementation for each test.
  beforeEach(() => {
    mockedGetLlmAdapter.mockReset();
  });

  it('should correctly invoke the LLM adapter and process a simple string response', async () => {
    // ARRANGE
    const mockGenerateContent = vi.fn();
    mockedGetLlmAdapter.mockReturnValue({ generateContent: mockGenerateContent });

    const mockLlmResponse: LlmGenerationResponse = {
      success: true, provider: LLMProviderType.GEMINI, modelUsed: 'gemini-1.5-flash',
      responseText: 'This is a simple text response.',
      tokenUsage: { inputTokens: 10, outputTokens: 5 },
    };
    mockGenerateContent.mockResolvedValue(mockLlmResponse);

    const now = new Date().toISOString();
    const stepDef: StepDefinition = {
      id: 'test-llm-step-def', name: 'Test LLM Step', stepType: StepType.LLM_INVOCATION,
      llmProvider: LLMProviderType.GEMINI, modelId: 'gemini-1.5-flash', promptTemplateId: testPromptTemplateId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      description: 'test',
      isPublished: true,
      tags: [],
      publishedAt: now,
    };
    // The runtime state no longer needs the prompt template in its context
    const runtimeState: FlowRuntimeState = {
      flowExecutionId: testCorrelationId,
      currentContextData: { },
      flowDefinitionId: 'test-flow', flowDefinitionVersion: 1, status: 'RUNNING',
      startTime: new Date().toISOString(), stepRetryAttempts: {}, _internal: {},
      enableExecutionLogs: false,
    };
    
    // ACT
    const result = await handleLlmInvocation(stepDef, { name: 'world', secret_code: 'alpha' }, runtimeState);

    // ASSERT
    expect(result.outputData).toEqual(expect.objectContaining({ llm_response: 'This is a simple text response.' }));
    expect(mockedGetLlmAdapter).toHaveBeenCalledWith(LLMProviderType.GEMINI);
    expect(mockedGetLlmAdapter).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    // Assert that the correct prompt was rendered and passed to the adapter
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Hello, world! The secret code is alpha.'
      })
    );
  });
  
  it('should correctly parse a valid JSON response when jsonOutputMode is true', async () => {
    // ARRANGE
    const mockGenerateContent = vi.fn();
    mockedGetLlmAdapter.mockReturnValue({ generateContent: mockGenerateContent });
    
    mockGenerateContent.mockResolvedValue({
      success: true, provider: LLMProviderType.GEMINI, modelUsed: 'gemini-1.5-pro',
      responseText: JSON.stringify({ greeting: 'Hello', target: 'JSON' }),
      tokenUsage: { inputTokens: 20, outputTokens: 15 },
    });
    const now = new Date().toISOString();
    const stepDef: StepDefinition = {
      id: 'test-json-step-def', name: 'Test JSON LLM Step', stepType: StepType.LLM_INVOCATION,
      llmProvider: LLMProviderType.GEMINI, modelId: 'gemini-1.5-pro', promptTemplateId: testPromptTemplateId,
      customConfig: { jsonOutputMode: true },
      createdAt: now,
      updatedAt: now,
      version: 1,
      description: 'test',
      isPublished: true,
      tags: [],
      publishedAt: now,
    };
    const runtimeState: FlowRuntimeState = {
      flowExecutionId: testCorrelationId, currentContextData: {},
      flowDefinitionId: 'test-flow', flowDefinitionVersion: 1, status: 'RUNNING',
      startTime: new Date().toISOString(), stepRetryAttempts: {}, _internal: {},
      enableExecutionLogs: false,
    };

    // ACT
    const result = await handleLlmInvocation(stepDef, {}, runtimeState);

    // ASSERT
    expect(result.outputData).toEqual(expect.objectContaining({ greeting: 'Hello', target: 'JSON' }));
  });

  it('should throw ContentBasedRetryableError for malformed JSON when jsonOutputMode is true', async () => {
    // ARRANGE
    const mockGenerateContent = vi.fn();
    mockedGetLlmAdapter.mockReturnValue({ generateContent: mockGenerateContent });

    mockGenerateContent.mockResolvedValue({
      success: true, provider: LLMProviderType.GEMINI, modelUsed: 'gemini-1.5-pro',
      responseText: '{greeting" -- "Hello", target "JSON"',
      tokenUsage: { inputTokens: 20, outputTokens: 15 },
    });
    const now = new Date().toISOString();
    const stepDef: StepDefinition = {
      id: 'test-json-fail-step-def', name: 'Test JSON Fail Step', stepType: StepType.LLM_INVOCATION,
      llmProvider: LLMProviderType.GEMINI, modelId: 'gemini-1.5-pro', promptTemplateId: testPromptTemplateId,
      customConfig: { jsonOutputMode: true },
      createdAt: now,
      updatedAt: now,
      version: 1,
      description: 'test',
      isPublished: true,
      tags: [],
      publishedAt: now,
    };
    const runtimeState: FlowRuntimeState = {
        flowExecutionId: testCorrelationId, currentContextData: {},
        flowDefinitionId: 'test-flow', flowDefinitionVersion: 1, status: 'RUNNING',
        startTime: new Date().toISOString(), stepRetryAttempts: {}, _internal: {},
        enableExecutionLogs: false,
    };
    
    // ACT & ASSERT
    await expect(handleLlmInvocation(stepDef, {}, runtimeState)).rejects.toSatisfy((e: Error) => {
        // We check if the error object behaves like our custom error.
        expect(e.name).toBe('ContentBasedRetryableError');
        expect(e.message).toContain('Failed to parse LLM response as JSON');
        return true;
    });
  });
});
