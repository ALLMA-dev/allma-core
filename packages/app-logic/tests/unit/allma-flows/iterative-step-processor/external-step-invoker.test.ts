import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  StepType,
  PermanentStepError,
  ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY,
  type StepInstance,
} from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeStepInstance, makeRuntimeState } from '../../_helpers/fixtures.js';

// The config table name is read at import time and the module throws if it is unset.
vi.hoisted(() => {
  process.env.ALLMA_CONFIG_TABLE_NAME = 'config-table';
});

const { invokeExternalStep } = await import(
  '../../../../src/allma-flows/iterative-step-processor/external-step-invoker.js'
);

const lambdaMock = mockClient(LambdaClient);
const ddbMock = mockClient(DynamoDBDocumentClient);

const MODULE_ID = 'vendor/crawler';

const registryItem = {
  PK: `EXTERNAL_STEP#${MODULE_ID}`,
  SK: 'METADATA',
  itemType: ITEM_TYPE_ALLMA_EXTERNAL_STEP_REGISTRY,
  moduleIdentifier: MODULE_ID,
  lambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:vendor-crawler',
  displayName: 'Vendor Crawler',
  stepType: StepType.DATA_LOAD,
  defaultConfig: {},
};

const encode = (obj: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(obj));

const stepDef = makeStepInstance({ stepType: StepType.DATA_LOAD }) as StepInstance;

const invoke = () => invokeExternalStep(MODULE_ID, stepDef, { foo: 'bar' }, makeRuntimeState());

beforeEach(() => {
  resetAwsClientMocks(lambdaMock, ddbMock);
  ddbMock.on(GetCommand).resolves({ Item: registryItem });
});

describe('invokeExternalStep', () => {
  it('discovers the Lambda ARN and returns the parsed handler output', async () => {
    lambdaMock.on(InvokeCommand).resolves({ Payload: encode({ outputData: { ok: true } }) });

    const result = await invoke();

    expect(result).toEqual({ outputData: { ok: true } });
    const invokeArgs = lambdaMock.commandCalls(InvokeCommand)[0].args[0].input;
    expect(invokeArgs.FunctionName).toBe(registryItem.lambdaArn);
    expect(invokeArgs.InvocationType).toBe('RequestResponse');
    const sentPayload = JSON.parse(invokeArgs.Payload as string);
    expect(sentPayload).toMatchObject({ stepInput: { foo: 'bar' } });
  });

  it('throws a PermanentStepError when no registration exists for the module', async () => {
    ddbMock.on(GetCommand).resolves({});

    await expect(invoke()).rejects.toBeInstanceOf(PermanentStepError);
  });

  it('treats an invalid registry item as a missing registration', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { PK: 'EXTERNAL_STEP#x', SK: 'METADATA' } });

    await expect(invoke()).rejects.toThrow(/No external step registration/);
  });

  it('surfaces a Lambda FunctionError as a PermanentStepError carrying the error message', async () => {
    lambdaMock.on(InvokeCommand).resolves({
      FunctionError: 'Unhandled',
      Payload: encode({ errorMessage: 'downstream blew up' }),
    });

    await expect(invoke()).rejects.toThrow(/downstream blew up/);
  });

  it('throws when the Lambda reports a FunctionError with no payload', async () => {
    lambdaMock.on(InvokeCommand).resolves({ FunctionError: 'Unhandled' });

    await expect(invoke()).rejects.toThrow(/unknown error/);
  });

  it('throws when a successful invocation returns no payload', async () => {
    lambdaMock.on(InvokeCommand).resolves({});

    await expect(invoke()).rejects.toThrow(/no payload/);
  });
});
