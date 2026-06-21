import { vi, describe, it, expect, beforeEach } from 'vitest';
import { type StepDefinition } from '@allma/core-types';

// The handler is a dispatcher over the module registry; we mock the registry (a non-AWS
// collaborator) to verify routing, customConfig templating, and input merging without
// invoking a real loader.
vi.mock('../../../../src/allma-core/module-registry.js');

import { handleDataLoad } from '../../../../src/allma-core/step-handlers/data-load-handler.js';
import * as moduleRegistry from '../../../../src/allma-core/module-registry.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

const mockedGetModuleHandler = vi.mocked(moduleRegistry.getModuleHandler);

const makeStepDef = (overrides: Record<string, unknown> = {}): StepDefinition =>
  ({
    id: 'load-step',
    moduleIdentifier: 'system/s3-data-loader',
    ...overrides,
  }) as unknown as StepDefinition;

describe('handleDataLoad', () => {
  beforeEach(() => {
    mockedGetModuleHandler.mockReset();
  });

  it('routes to the registered module handler and passes rendered customConfig + stepInput', async () => {
    const moduleHandler = vi.fn().mockResolvedValue({ outputData: { loaded: true } });
    mockedGetModuleHandler.mockReturnValue(moduleHandler as never);

    const stepDef = makeStepDef({ customConfig: { bucket: '{{bucketName}}', static: 'keep' } });
    const runtimeState = makeRuntimeState({ currentContextData: { bucketName: 'my-bucket' } });

    const result = await handleDataLoad(stepDef, { key: 'file.json' }, runtimeState);

    expect(mockedGetModuleHandler).toHaveBeenCalledWith('system/s3-data-loader');
    expect(result).toEqual({ outputData: { loaded: true } });
    // customConfig templates are rendered against context, then stepInput is merged on top.
    expect(moduleHandler).toHaveBeenCalledWith(
      stepDef,
      { bucket: 'my-bucket', static: 'keep', key: 'file.json' },
      runtimeState
    );
  });

  it('lets stepInput override a rendered customConfig key of the same name', async () => {
    const moduleHandler = vi.fn().mockResolvedValue({ outputData: {} });
    mockedGetModuleHandler.mockReturnValue(moduleHandler as never);

    await handleDataLoad(
      makeStepDef({ customConfig: { key: 'from-config' } }),
      { key: 'from-input' },
      makeRuntimeState()
    );

    expect(moduleHandler).toHaveBeenCalledWith(expect.anything(), { key: 'from-input' }, expect.anything());
  });

  it('throws when the module identifier is missing', async () => {
    await expect(
      handleDataLoad(makeStepDef({ moduleIdentifier: undefined }), {}, makeRuntimeState())
    ).rejects.toThrow('Module identifier is missing or not a string');
    expect(mockedGetModuleHandler).not.toHaveBeenCalled();
  });

  it('propagates the registry error for an unknown module identifier', async () => {
    mockedGetModuleHandler.mockImplementation(() => {
      throw new Error('No handler registered for module: system/bogus');
    });

    await expect(
      handleDataLoad(makeStepDef({ moduleIdentifier: 'system/bogus' }), {}, makeRuntimeState())
    ).rejects.toThrow('No handler registered for module: system/bogus');
  });

  it('throws an Unsupported error when the registry yields no handler', async () => {
    mockedGetModuleHandler.mockReturnValue(undefined as never);

    await expect(
      handleDataLoad(makeStepDef({ moduleIdentifier: 'system/s3-data-loader' }), {}, makeRuntimeState())
    ).rejects.toThrow('Unsupported DATA_LOAD module: system/s3-data-loader');
  });
});
