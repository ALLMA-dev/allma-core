import { describe, it, expect } from 'vitest';
import { StepType, SYSTEM_MODULE_CONFIG_SCHEMAS } from '@allma/core-types';
import { TYPED_STEP_FACTORIES, MODULE_ESCAPE_HATCHES, MODULE_WRAPPERS } from './factories.js';
import { LEAF_SCHEMA_BY_STEP_TYPE } from './registry.js';

/**
 * Registry-driven completeness (RFC §9). These mirror the core-types completeness
 * test on the builder side: a newly added StepType without a factory, or a newly
 * registered module without a typed wrapper, fails CI here.
 */
describe('factory completeness', () => {
  it('every StepType has a typed factory or a module escape hatch', () => {
    for (const stepType of Object.values(StepType)) {
      const hasFactory = stepType in TYPED_STEP_FACTORIES || stepType in MODULE_ESCAPE_HATCHES;
      expect(hasFactory, `StepType '${stepType}' has no factory in @allma/flow-builder`).toBe(true);
    }
  });

  it('every StepType has a leaf schema for the strict gate', () => {
    for (const stepType of Object.values(StepType)) {
      expect(LEAF_SCHEMA_BY_STEP_TYPE[stepType], `StepType '${stepType}' has no leaf schema`).toBeDefined();
    }
  });

  it('every registered system module has a typed wrapper', () => {
    for (const moduleId of Object.keys(SYSTEM_MODULE_CONFIG_SCHEMAS)) {
      expect(MODULE_WRAPPERS[moduleId], `Module '${moduleId}' has no typed wrapper`).toBeDefined();
    }
  });

  it('has no stale module wrappers (every wrapper maps to a registered module)', () => {
    for (const moduleId of Object.keys(MODULE_WRAPPERS)) {
      expect(
        moduleId in SYSTEM_MODULE_CONFIG_SCHEMAS,
        `Wrapper '${moduleId}' is not in SYSTEM_MODULE_CONFIG_SCHEMAS`,
      ).toBe(true);
    }
  });
});
