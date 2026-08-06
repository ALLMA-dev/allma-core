import { describe, it, expect } from 'vitest';
import {
  LlmBuiltInToolType,
  LlmBuiltInToolTypeSchema,
  LlmBuiltInToolSchema,
  LlmFunctionToolSchema,
  LlmToolDeclarationSchema,
  LlmToolChoiceSchema,
} from './index.js';
import {
  LlmInvocationStepPayloadSchema,
  LlmInvocationFallbackSchema,
} from '../steps/system/llm.js';

describe('LLM Tool Schemas', () => {
  describe('LlmBuiltInToolTypeSchema & LlmBuiltInToolSchema', () => {
    it('accepts valid built-in tool types', () => {
      expect(LlmBuiltInToolTypeSchema.safeParse('google_search').success).toBe(true);
      expect(LlmBuiltInToolTypeSchema.safeParse('code_execution').success).toBe(true);
      expect(LlmBuiltInToolTypeSchema.safeParse('web_search').success).toBe(true);
      expect(LlmBuiltInToolTypeSchema.safeParse(LlmBuiltInToolType.GOOGLE_SEARCH).success).toBe(true);
    });

    it('rejects invalid built-in tool types', () => {
      expect(LlmBuiltInToolTypeSchema.safeParse('invalid_tool').success).toBe(false);
    });

    it('validates built-in tools with optional config', () => {
      expect(LlmBuiltInToolSchema.safeParse({ type: 'google_search' }).success).toBe(true);
      expect(
        LlmBuiltInToolSchema.safeParse({
          type: 'code_execution',
          config: { timeoutMs: 5000 },
        }).success,
      ).toBe(true);
      expect(LlmBuiltInToolSchema.safeParse({ type: 'unknown_tool' }).success).toBe(false);
    });
  });

  describe('LlmFunctionToolSchema', () => {
    it('accepts valid function tool definitions', () => {
      const validFunction = {
        type: 'function',
        name: 'get_current_weather',
        description: 'Get the current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
          required: ['location'],
        },
      };
      expect(LlmFunctionToolSchema.safeParse(validFunction).success).toBe(true);
    });

    it('validates tool name regex requirement', () => {
      const validNames = ['getWeather', 'get_weather_1', 'my-tool-name'];
      const invalidNames = ['get weather', 'tool@name', '', 'tool!'];

      for (const name of validNames) {
        expect(
          LlmFunctionToolSchema.safeParse({
            type: 'function',
            name,
            description: 'desc',
            parameters: {},
          }).success,
        ).toBe(true);
      }

      for (const name of invalidNames) {
        expect(
          LlmFunctionToolSchema.safeParse({
            type: 'function',
            name,
            description: 'desc',
            parameters: {},
          }).success,
        ).toBe(false);
      }
    });

    it('rejects empty description or missing parameters', () => {
      expect(
        LlmFunctionToolSchema.safeParse({
          type: 'function',
          name: 'func',
          description: '',
          parameters: {},
        }).success,
      ).toBe(false);

      expect(
        LlmFunctionToolSchema.safeParse({
          type: 'function',
          name: 'func',
          description: 'desc',
        }).success,
      ).toBe(false);
    });
  });

  describe('LlmToolDeclarationSchema', () => {
    it('accepts both built-in and function tool declarations', () => {
      const builtIn = { type: 'web_search' };
      const func = {
        type: 'function',
        name: 'calculate',
        description: 'Calculate expression',
        parameters: {},
      };

      expect(LlmToolDeclarationSchema.safeParse(builtIn).success).toBe(true);
      expect(LlmToolDeclarationSchema.safeParse(func).success).toBe(true);
    });

    it('rejects invalid tool declarations', () => {
      expect(LlmToolDeclarationSchema.safeParse({ type: 'invalid' }).success).toBe(false);
    });
  });

  describe('LlmToolChoiceSchema', () => {
    it('accepts string enum modes', () => {
      expect(LlmToolChoiceSchema.safeParse('auto').success).toBe(true);
      expect(LlmToolChoiceSchema.safeParse('none').success).toBe(true);
      expect(LlmToolChoiceSchema.safeParse('required').success).toBe(true);
    });

    it('accepts specific function choice object', () => {
      expect(
        LlmToolChoiceSchema.safeParse({
          type: 'function',
          name: 'get_weather',
        }).success,
      ).toBe(true);
    });

    it('rejects invalid modes or shapes', () => {
      expect(LlmToolChoiceSchema.safeParse('any').success).toBe(false);
      expect(LlmToolChoiceSchema.safeParse({ type: 'function' }).success).toBe(false);
      expect(LlmToolChoiceSchema.safeParse({ type: 'function', name: '' }).success).toBe(false);
    });
  });

  describe('LlmInvocationStepPayloadSchema & Fallback integration', () => {
    it('validates step payload with static tools and toolChoice', () => {
      const payload = {
        stepType: 'LLM_INVOCATION',
        llmProvider: 'GEMINI',
        modelId: 'gemini-1.5-pro',
        tools: [
          { type: 'google_search' },
          {
            type: 'function',
            name: 'lookup_user',
            description: 'Look up user by ID',
            parameters: { type: 'object' },
          },
        ],
        toolsPath: '$.steps_output.previous_step.tools',
        toolChoice: 'auto',
      };

      expect(LlmInvocationStepPayloadSchema.safeParse(payload).success).toBe(true);
    });

    it('validates fallback configuration with tools and toolChoice', () => {
      const fallback = {
        llmProvider: 'OPENAI',
        modelId: 'gpt-4o',
        tools: [{ type: 'web_search' }],
        toolsPath: '$.context.tools',
        toolChoice: { type: 'function', name: 'lookup_user' },
      };

      expect(LlmInvocationFallbackSchema.safeParse(fallback).success).toBe(true);
    });
  });
});
