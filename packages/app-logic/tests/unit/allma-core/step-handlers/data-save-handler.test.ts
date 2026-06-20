import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SystemModuleIdentifiers, type StepDefinition } from '@allma/core-types';

// The DATA_SAVE handler builds its dispatch registry at import time from the three saver
// modules. We mock those collaborator modules so routing/templating can be asserted without
// touching DynamoDB or S3 (the savers themselves are covered directly in their own specs).
vi.mock('../../../../src/allma-core/data-savers/dynamodb-update-item.js');
vi.mock('../../../../src/allma-core/data-savers/dynamodb-query-and-update.js');
vi.mock('../../../../src/allma-core/data-savers/s3-saver.js');

import { handleDataSave } from '../../../../src/allma-core/step-handlers/data-save-handler.js';
import * as s3Saver from '../../../../src/allma-core/data-savers/s3-saver.js';
import * as ddbUpdate from '../../../../src/allma-core/data-savers/dynamodb-update-item.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

const mockedS3Saver = vi.mocked(s3Saver.executeS3Saver);
const mockedDdbUpdate = vi.mocked(ddbUpdate.executeDynamoDBUpdate);

const makeStepDef = (overrides: Record<string, unknown> = {}): StepDefinition =>
  ({
    id: 'save-step',
    moduleIdentifier: SystemModuleIdentifiers.S3_DATA_SAVER,
    ...overrides,
  }) as unknown as StepDefinition;

describe('handleDataSave', () => {
  beforeEach(() => {
    mockedS3Saver.mockReset();
    mockedDdbUpdate.mockReset();
  });

  it('routes an S3_DATA_SAVER step to the S3 saver with rendered customConfig + stepInput', async () => {
    mockedS3Saver.mockResolvedValue({ outputData: { saved: true } });

    const stepDef = makeStepDef({ customConfig: { bucket: '{{target}}', prefix: 'out/' } });
    const runtimeState = makeRuntimeState({ currentContextData: { target: 'dest-bucket' } });

    const result = await handleDataSave(stepDef, { body: { a: 1 } }, runtimeState);

    expect(result).toEqual({ outputData: { saved: true } });
    expect(mockedS3Saver).toHaveBeenCalledWith(
      stepDef,
      { bucket: 'dest-bucket', prefix: 'out/', body: { a: 1 } },
      runtimeState
    );
    expect(mockedDdbUpdate).not.toHaveBeenCalled();
  });

  it('routes a DYNAMODB_UPDATE_ITEM step to the DynamoDB updater', async () => {
    mockedDdbUpdate.mockResolvedValue({ outputData: {} });

    await handleDataSave(
      makeStepDef({ moduleIdentifier: SystemModuleIdentifiers.DYNAMODB_UPDATE_ITEM }),
      {},
      makeRuntimeState()
    );

    expect(mockedDdbUpdate).toHaveBeenCalledTimes(1);
    expect(mockedS3Saver).not.toHaveBeenCalled();
  });

  it('throws when the module identifier is missing', async () => {
    await expect(
      handleDataSave(makeStepDef({ moduleIdentifier: undefined }), {}, makeRuntimeState())
    ).rejects.toThrow('Module identifier is missing for DATA_SAVE step');
  });

  it('throws for a module identifier with no registered saver', async () => {
    await expect(
      handleDataSave(makeStepDef({ moduleIdentifier: SystemModuleIdentifiers.SNS_PUBLISH }), {}, makeRuntimeState())
    ).rejects.toThrow(`Unsupported DATA_SAVE module: ${SystemModuleIdentifiers.SNS_PUBLISH}`);
  });
});
