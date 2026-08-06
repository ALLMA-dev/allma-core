import { describe, it, expect } from 'vitest';
import { PermanentStepError, type LlmToolDeclaration, type LlmToolChoice } from '@allma/core-types';
import {
  getToolsConfig,
  getToolChoiceConfig,
} from '../../../../src/allma-core/step-handlers/llm/tool-resolver.js';

describe('tool-resolver', () => {
  describe('getToolsConfig', () => {
    const validBuiltInTool: LlmToolDeclaration = { type: 'web_search' };
    const validFunctionTool: LlmToolDeclaration = {
      type: 'function',
      name: 'get_weather',
      description: 'Get weather for location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' },
        },
      },
    };

    it('returns static tools when non-empty staticList is provided', () => {
      const staticTools = [validBuiltInTool, validFunctionTool];
      const result = getToolsConfig(staticTools, undefined, undefined, {});
      expect(result).toEqual(staticTools);
    });

    it('throws PermanentStepError when staticList contains an invalid tool', () => {
      const invalidTools = [{ type: 'invalid_tool_type' }] as unknown as LlmToolDeclaration[];
      expect(() => getToolsConfig(invalidTools, undefined, undefined, {})).toThrow(PermanentStepError);
    });

    it('falls through to dynamicPath when staticList is empty array', () => {
      const context = {
        tools: [validBuiltInTool],
      };
      const result = getToolsConfig([], '$.tools', undefined, context);
      expect(result).toEqual([validBuiltInTool]);
    });

    it('resolves dynamic tools from context when dynamicPath is provided', () => {
      const context = {
        flow_data: {
          availableTools: [validFunctionTool],
        },
      };
      const result = getToolsConfig(undefined, '$.flow_data.availableTools', undefined, context);
      expect(result).toEqual([validFunctionTool]);
    });

    it('returns empty array when dynamicPath resolves to undefined', () => {
      const result = getToolsConfig(undefined, '$.non_existent_path', undefined, {});
      expect(result).toEqual([]);
    });

    it('throws PermanentStepError when dynamicPath resolves to invalid tool structure', () => {
      const context = {
        invalidTools: [{ name: '' }],
      };
      expect(() => getToolsConfig(undefined, '$.invalidTools', undefined, context)).toThrow(PermanentStepError);
    });

    it('resolves customConfigTools when staticList and dynamicPath are not provided', () => {
      const customTools = [validBuiltInTool];
      const result = getToolsConfig(undefined, undefined, customTools, {});
      expect(result).toEqual(customTools);
    });

    it('throws PermanentStepError when customConfigTools contains an invalid tool', () => {
      const invalidCustomTools = [{ name: 123 }];
      expect(() => getToolsConfig(undefined, undefined, invalidCustomTools, {})).toThrow(PermanentStepError);
    });

    it('returns empty array when no tool configurations are provided', () => {
      const result = getToolsConfig(undefined, undefined, undefined, {});
      expect(result).toEqual([]);
    });

    it('respects precedence: staticList > dynamicPath > customConfigTools', () => {
      const staticTools = [validBuiltInTool];
      const dynamicTools = [validFunctionTool];
      const customTools = [validBuiltInTool, validFunctionTool];
      const context = { dynamic: dynamicTools };

      // staticList takes precedence over dynamicPath and customConfigTools
      expect(getToolsConfig(staticTools, '$.dynamic', customTools, context)).toEqual(staticTools);

      // dynamicPath takes precedence over customConfigTools when staticList is undefined
      expect(getToolsConfig(undefined, '$.dynamic', customTools, context)).toEqual(dynamicTools);
    });
  });

  describe('getToolChoiceConfig', () => {
    it('returns static toolChoice when valid string value is provided', () => {
      expect(getToolChoiceConfig('auto', undefined)).toBe('auto');
      expect(getToolChoiceConfig('none', undefined)).toBe('none');
      expect(getToolChoiceConfig('required', undefined)).toBe('required');
    });

    it('returns static toolChoice when valid function object is provided', () => {
      const functionChoice: LlmToolChoice = { type: 'function', name: 'get_weather' };
      expect(getToolChoiceConfig(functionChoice, undefined)).toEqual(functionChoice);
    });

    it('returns customConfigToolChoice when staticToolChoice is undefined', () => {
      expect(getToolChoiceConfig(undefined, 'required')).toBe('required');
    });

    it('throws PermanentStepError when toolChoice is invalid string', () => {
      expect(() => getToolChoiceConfig('invalid' as unknown as LlmToolChoice, undefined)).toThrow(PermanentStepError);
    });

    it('throws PermanentStepError when toolChoice function object is invalid', () => {
      const invalidChoice = { type: 'function', name: '' } as unknown as LlmToolChoice;
      expect(() => getToolChoiceConfig(invalidChoice, undefined)).toThrow(PermanentStepError);
    });

    it('returns undefined when neither static nor custom toolChoice is provided', () => {
      expect(getToolChoiceConfig(undefined, undefined)).toBeUndefined();
    });
  });
});
