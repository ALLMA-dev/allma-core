import { describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { StepType, AllmaExportFormat } from '@allma/core-types';
import { mockClient } from '../_helpers/aws-mock.js';

process.env.ALLMA_CONFIG_TABLE_NAME = 'test-config-table';

const { AllmaImporterService } = await import('../../../src/services/allma-importer.service.js');
const { PromptTemplateService } = await import('../../../src/allma-admin/services/prompt-template.service.js');

const ddbMock = mockClient(DynamoDBDocumentClient);
const NOW = '2026-01-01T00:00:00.000Z';
const FLOW_PK = 'FLOW_DEF#flow-1';
const PROMPT_PK = 'PROMPT_TEMPLATE#prompt-1';

let table: Map<string, Record<string, unknown>>;

const seed = (item: Record<string, unknown>) => table.set(`${item.PK}|${item.SK}`, item);

const flow = (version: number, isPublished: boolean) => ({
  id: 'flow-1',
  name: 'Flow One',
  version,
  isPublished,
  startStepInstanceId: 'start',
  steps: { start: { stepInstanceId: 'start', stepType: StepType.NO_OP, displayName: 'Start' } },
  createdAt: NOW,
  updatedAt: NOW,
});

const prompt = (version: number, isPublished: boolean) => ({
  id: 'prompt-1',
  name: 'Prompt One',
  content: 'Hello {{name}}',
  version,
  isPublished,
  createdAt: NOW,
  updatedAt: NOW,
});

const seedMaster = (pk: string, latestVersion: number, publishedVersion?: number) =>
  seed({ PK: pk, SK: 'METADATA', id: pk.split('#')[1], name: 'Existing', latestVersion, publishedVersion, createdAt: NOW, updatedAt: NOW });

const importData = (data: Partial<AllmaExportFormat>) =>
  new AllmaImporterService().import({ formatVersion: '1.0', exportedAt: NOW, ...data } as AllmaExportFormat, { overwrite: true });

const transactItems = () => ddbMock.commandCalls(TransactWriteCommand).flatMap((c) => c.args[0].input.TransactItems ?? []);
const puts = () => transactItems().flatMap((t) => (t.Put ? [t.Put] : []));
const updates = () => transactItems().flatMap((t) => (t.Update ? [t.Update] : []));

beforeEach(() => {
  ddbMock.reset();
  table = new Map();
  ddbMock.on(GetCommand).callsFake((input) => ({ Item: table.get(`${input.Key.PK}|${input.Key.SK}`) }));
  ddbMock.on(QueryCommand).callsFake((input) => ({
    Items: [...table.values()].filter((i) => i.PK === input.ExpressionAttributeValues[':pk'] && String(i.SK).startsWith('VERSION#')),
  }));
  ddbMock.on(UpdateCommand).callsFake((input) => ({ Attributes: table.get(`${input.Key.PK}|${input.Key.SK}`) }));
});

describe('AllmaImporterService.import — new version of an existing entity', () => {
  it('creates an unpublished new flow version and advances latestVersion', async () => {
    seedMaster(FLOW_PK, 1, 1);
    seed({ PK: FLOW_PK, SK: 'VERSION#1', ...flow(1, true) });

    const result = await importData({ flows: [flow(2, false)] as AllmaExportFormat['flows'] });

    expect(result.errors).toEqual([]);
    expect(result.updated.flows).toBe(1);
    const versionPut = puts().find((p) => p.Item?.SK === 'VERSION#2');
    expect(versionPut).toMatchObject({ ConditionExpression: 'attribute_not_exists(PK)', Item: { isPublished: false, version: 2 } });
    expect(updates().find((u) => u.Key?.SK === 'METADATA' && u.ExpressionAttributeValues?.[':latest'] !== undefined))
      .toMatchObject({ ExpressionAttributeValues: { ':latest': 2, ':expected': 1 } });
    expect(updates().some((u) => u.UpdateExpression?.includes('publishedVersion'))).toBe(false);
  });

  it('publishes the new flow version when the import marks it published', async () => {
    seedMaster(FLOW_PK, 1, 1);
    seed({ PK: FLOW_PK, SK: 'VERSION#1', ...flow(1, true) });

    const result = await importData({ flows: [flow(2, true)] as AllmaExportFormat['flows'] });

    expect(result.errors).toEqual([]);
    expect(result.updated.flows).toBe(1);
    const all = updates();
    expect(all).toContainEqual(expect.objectContaining({
      Key: { PK: FLOW_PK, SK: 'METADATA' },
      UpdateExpression: expect.stringContaining('publishedVersion = :v'),
      ExpressionAttributeValues: expect.objectContaining({ ':v': 2 }),
    }));
    expect(all).toContainEqual(expect.objectContaining({
      Key: { PK: FLOW_PK, SK: 'VERSION#2' },
      ExpressionAttributeValues: expect.objectContaining({ ':p': true }),
    }));
    expect(all).toContainEqual(expect.objectContaining({
      Key: { PK: FLOW_PK, SK: 'VERSION#1' },
      ExpressionAttributeValues: expect.objectContaining({ ':false': false }),
    }));
  });

  it('fills a missing slot below latestVersion without moving latestVersion back', async () => {
    seedMaster(FLOW_PK, 3, 3);

    const result = await importData({ flows: [flow(2, false)] as AllmaExportFormat['flows'] });

    expect(result.errors).toEqual([]);
    expect(puts().find((p) => p.Item?.SK === 'VERSION#2')).toBeDefined();
    expect(updates().find((u) => u.Key?.SK === 'METADATA'))
      .toMatchObject({ ExpressionAttributeValues: { ':latest': 3, ':expected': 3 } });
  });

  it('creates and publishes a new prompt version', async () => {
    seedMaster(PROMPT_PK, 1, 1);
    seed({ PK: PROMPT_PK, SK: 'VERSION#1', ...prompt(1, true) });

    const result = await importData({ promptTemplates: [prompt(2, true)] as AllmaExportFormat['promptTemplates'] });

    expect(result.errors).toEqual([]);
    expect(result.updated.prompts).toBe(1);
    expect(puts().find((p) => p.Item?.SK === 'VERSION#2')).toMatchObject({ ConditionExpression: 'attribute_not_exists(PK)' });
    expect(updates()).toContainEqual(expect.objectContaining({
      Key: { PK: PROMPT_PK, SK: 'METADATA' },
      ExpressionAttributeValues: expect.objectContaining({ ':v': 2 }),
    }));
  });

  it('still overwrites an existing version slot in place', async () => {
    seedMaster(FLOW_PK, 1);
    seed({ PK: FLOW_PK, SK: 'VERSION#1', ...flow(1, false) });

    const result = await importData({ flows: [flow(1, false)] as AllmaExportFormat['flows'] });

    expect(result.errors).toEqual([]);
    expect(result.updated.flows).toBe(1);
    expect(puts()).toHaveLength(1);
    expect(puts()[0].ConditionExpression).toBe('attribute_exists(PK)');
  });
});

describe('deleteVersion after an import left a version gap', () => {
  it('moves latestVersion to the highest remaining version', async () => {
    seedMaster(PROMPT_PK, 5);
    seed({ PK: PROMPT_PK, SK: 'VERSION#2', ...prompt(2, false) });
    seed({ PK: PROMPT_PK, SK: 'VERSION#5', ...prompt(5, false) });

    await PromptTemplateService.deleteVersion('prompt-1', 5);

    expect(updates().find((u) => u.Key?.SK === 'METADATA'))
      .toMatchObject({ ExpressionAttributeValues: expect.objectContaining({ ':latest': 2, ':currentVersion': 5 }) });
  });
});
