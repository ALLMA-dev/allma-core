import { describe, it, expect } from 'vitest';
import { StepType } from '@allma/core-types';
import { z } from 'zod';
import {
  ALL_STEP_SCHEMA_KEYS,
  STEP_SCHEMA_EXCLUDED_FIELDS,
  getStepSchema,
  parseDescription,
} from '../../../../../src/features/flows/editor/zod-schema-mappers.js';

const DEFINITION_ONLY_FIELDS = ['id', 'name', 'version', 'createdAt', 'updatedAt'];

describe('ALL_STEP_SCHEMA_KEYS', () => {
  it('is a non-empty set of string keys', () => {
    expect(ALL_STEP_SCHEMA_KEYS).toBeInstanceOf(Set);
    expect(ALL_STEP_SCHEMA_KEYS.size).toBeGreaterThan(0);
    for (const key of ALL_STEP_SCHEMA_KEYS) expect(typeof key).toBe('string');
  });

  it('collects keys from the intersected instance/definition schemas (recurses unions)', () => {
    // These live on different arms of the .and()/superRefine intersections, so their
    // presence proves the recursive walker descended through the wrappers.
    expect(ALL_STEP_SCHEMA_KEYS.has('stepInstanceId')).toBe(true);
    expect(ALL_STEP_SCHEMA_KEYS.has('displayName')).toBe(true);
    expect(ALL_STEP_SCHEMA_KEYS.has('transitions')).toBe(true);
    expect(ALL_STEP_SCHEMA_KEYS.has('id')).toBe(true);
    expect(ALL_STEP_SCHEMA_KEYS.has('name')).toBe(true);
  });
});

describe('getStepSchema', () => {
  it('returns the mapped schema for a known step type', () => {
    const schema = getStepSchema(StepType.LLM_INVOCATION);
    expect(schema).toBeInstanceOf(z.ZodObject);
    expect(Object.keys(schema.shape).length).toBeGreaterThan(0);
  });

  it('strips definition-only metadata fields from the validation schema', () => {
    const schema = getStepSchema(StepType.API_CALL);
    for (const field of DEFINITION_ONLY_FIELDS) {
      expect(schema.shape).not.toHaveProperty(field);
    }
  });

  it('falls back to an empty object schema for an unmapped step type', () => {
    const schema = getStepSchema('TOTALLY_UNKNOWN_TYPE' as StepType);
    expect(schema).toBeInstanceOf(z.ZodObject);
    expect(Object.keys(schema.shape)).toHaveLength(0);
  });
});

describe('parseDescription', () => {
  it('returns sensible defaults for an undefined description', () => {
    expect(parseDescription(undefined)).toEqual({
      label: 'Unknown Field',
      componentType: 'text',
      placeholder: '',
    });
  });

  it('parses a label-only description, defaulting the rest', () => {
    expect(parseDescription('My Label')).toEqual({
      label: 'My Label',
      componentType: 'text',
      placeholder: '',
    });
  });

  it('parses the full Label|Component|Placeholder triple', () => {
    expect(parseDescription('Max Retries|number|How many times')).toEqual({
      label: 'Max Retries',
      componentType: 'number',
      placeholder: 'How many times',
    });
  });
});

describe('STEP_SCHEMA_EXCLUDED_FIELDS', () => {
  it('excludes the editor-special-cased and base fields', () => {
    for (const field of ['stepType', 'inputMappings', 'outputMappings', 'onError', 'displayName']) {
      expect(STEP_SCHEMA_EXCLUDED_FIELDS.has(field)).toBe(true);
    }
  });
});
