import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { StepType } from '../../common/enums.js';
import { SYSTEM_STEP_DEFINITIONS, StepPayloadUnionSchema } from '../definitions.js';
import { SystemModuleIdentifiers } from '../system-module-identifiers.js';
import {
  MODULE_CONFIG_STEP_TYPES,
  SYSTEM_MODULE_CONFIG_SCHEMAS,
  SYSTEM_MODULES_WITHOUT_CONFIG_SCHEMA,
  getSystemModuleConfigSchema,
  collectCustomConfigWarnings,
} from './module-config-registry.js';

const MODULE_STEP_TYPES = new Set<StepType>(MODULE_CONFIG_STEP_TYPES);

/** Every moduleIdentifier used by a module-config step type in the system catalog. */
const usedModuleIdentifiers = new Set(
  SYSTEM_STEP_DEFINITIONS.filter(
    (d): d is typeof d & { moduleIdentifier: string } =>
      MODULE_STEP_TYPES.has(d.stepType) && typeof d.moduleIdentifier === 'string',
  ).map((d) => d.moduleIdentifier),
);

const registeredModules = new Set(Object.keys(SYSTEM_MODULE_CONFIG_SCHEMAS));
const acknowledgedGaps = new Set<string>(SYSTEM_MODULES_WITHOUT_CONFIG_SCHEMA);

describe('module-config registry completeness', () => {
  it('classifies every module-config-step module as either registered or an acknowledged gap (exactly once)', () => {
    for (const moduleId of usedModuleIdentifiers) {
      const inRegistry = registeredModules.has(moduleId);
      const inGaps = acknowledgedGaps.has(moduleId);
      // XOR: a new system module that is neither registered nor acknowledged
      // (or, by mistake, both) fails here, forcing a deliberate decision.
      expect(
        inRegistry !== inGaps,
        `Module '${moduleId}' must be in exactly one of SYSTEM_MODULE_CONFIG_SCHEMAS or SYSTEM_MODULES_WITHOUT_CONFIG_SCHEMA`,
      ).toBe(true);
    }
  });

  it('has no stale registry entries (every registered module is actually used by a module-config step)', () => {
    for (const moduleId of registeredModules) {
      expect(usedModuleIdentifiers.has(moduleId), `Registered module '${moduleId}' is not used by any module-config step`).toBe(true);
    }
  });

  it('has no stale gap entries (every acknowledged gap is actually used by a module-config step)', () => {
    for (const moduleId of acknowledgedGaps) {
      expect(usedModuleIdentifiers.has(moduleId), `Acknowledged gap '${moduleId}' is not used by any module-config step`).toBe(true);
    }
  });

  it('registry and gap set are disjoint', () => {
    for (const moduleId of registeredModules) {
      expect(acknowledgedGaps.has(moduleId)).toBe(false);
    }
  });

  it('maps every registered module to a Zod schema', () => {
    for (const schema of Object.values(SYSTEM_MODULE_CONFIG_SCHEMAS)) {
      expect(schema).toBeInstanceOf(z.ZodType);
    }
  });
});

describe('StepType coverage', () => {
  const unionDiscriminants = new Set(
    (StepPayloadUnionSchema.options as z.ZodObject<{ stepType: z.ZodLiteral<string> }>[]).map(
      (option) => option.shape.stepType.value,
    ),
  );

  it('every StepType is either a typed-payload step or a module-config step type', () => {
    for (const stepType of Object.values(StepType)) {
      const isTypedPayload = unionDiscriminants.has(stepType);
      const isModuleConfig = MODULE_STEP_TYPES.has(stepType);
      expect(
        isTypedPayload || isModuleConfig,
        `StepType '${stepType}' has no payload schema in StepPayloadUnionSchema and is not a module-config step type`,
      ).toBe(true);
    }
  });
});

describe('getSystemModuleConfigSchema', () => {
  it('returns a schema for a registered module', () => {
    expect(getSystemModuleConfigSchema(SystemModuleIdentifiers.S3_DATA_LOADER)).toBeInstanceOf(z.ZodType);
  });

  it('returns undefined for an acknowledged-gap module', () => {
    expect(getSystemModuleConfigSchema(SystemModuleIdentifiers.ARRAY_AGGREGATOR)).toBeUndefined();
  });

  it('returns undefined for an unknown/consumer module and for empty input', () => {
    expect(getSystemModuleConfigSchema('consumer/my-custom-logic')).toBeUndefined();
    expect(getSystemModuleConfigSchema(undefined)).toBeUndefined();
    expect(getSystemModuleConfigSchema(null)).toBeUndefined();
    expect(getSystemModuleConfigSchema('')).toBeUndefined();
  });
});

describe('collectCustomConfigWarnings (warn-mode validator)', () => {
  it('returns no warnings for a valid known-module customConfig', () => {
    const warnings = collectCustomConfigWarnings({
      steps: {
        load: {
          stepInstanceId: 'load',
          moduleIdentifier: SystemModuleIdentifiers.S3_DATA_LOADER,
          customConfig: { sourceS3Uri: 's3://bucket/key.txt' },
        },
      },
    });
    expect(warnings).toEqual([]);
  });

  it('returns a structured warning for an invalid known-module customConfig', () => {
    const warnings = collectCustomConfigWarnings({
      steps: {
        load: {
          stepInstanceId: 'load',
          moduleIdentifier: SystemModuleIdentifiers.S3_DATA_LOADER,
          // missing required sourceS3Uri (and a malformed one)
          customConfig: { sourceS3Uri: 'not-an-s3-uri' },
        },
      },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].stepInstanceId).toBe('load');
    expect(warnings[0].moduleIdentifier).toBe(SystemModuleIdentifiers.S3_DATA_LOADER);
    expect(warnings[0].issues.length).toBeGreaterThan(0);
    expect(warnings[0].issues[0]).toHaveProperty('path');
    expect(warnings[0].issues[0]).toHaveProperty('message');
  });

  it('never warns for opaque modules (acknowledged gap, consumer-defined, or no moduleIdentifier)', () => {
    const warnings = collectCustomConfigWarnings({
      steps: {
        aggregate: {
          stepInstanceId: 'aggregate',
          moduleIdentifier: SystemModuleIdentifiers.ARRAY_AGGREGATOR,
          customConfig: { anything: 'goes', because: 'no centralized schema' },
        },
        consumer: {
          stepInstanceId: 'consumer',
          moduleIdentifier: 'consumer/proprietary',
          customConfig: { whatever: true },
        },
        noModule: {
          stepInstanceId: 'noModule',
          customConfig: { something: 1 },
        },
      },
    });
    expect(warnings).toEqual([]);
  });

  it('skips steps with no customConfig and tolerates empty/missing flows', () => {
    expect(
      collectCustomConfigWarnings({
        steps: { x: { stepInstanceId: 'x', moduleIdentifier: SystemModuleIdentifiers.S3_DATA_LOADER } },
      }),
    ).toEqual([]);
    expect(collectCustomConfigWarnings({})).toEqual([]);
    expect(collectCustomConfigWarnings(null)).toEqual([]);
    expect(collectCustomConfigWarnings(undefined)).toEqual([]);
  });

  it('falls back to the step map key when stepInstanceId is absent', () => {
    const warnings = collectCustomConfigWarnings({
      steps: {
        'step-key': {
          moduleIdentifier: SystemModuleIdentifiers.S3_DATA_LOADER,
          customConfig: { sourceS3Uri: 'bad' },
        },
      },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].stepInstanceId).toBe('step-key');
  });
});
