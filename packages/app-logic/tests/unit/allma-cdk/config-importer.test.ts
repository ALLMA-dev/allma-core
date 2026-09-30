import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { StepType, AllmaExportFormat } from '@allma/core-types';
import type { CloudFormationEvent } from '@allma/core-sdk';
import AdmZip from 'adm-zip';
import fs from 'fs';
import { Readable } from 'stream';
import { mockClient } from '../_helpers/aws-mock.js';
import { makeFlowDefinition } from '../_helpers/fixtures.js';

vi.mock('@allma/core-sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@allma/core-sdk')>()),
  sendCloudFormationResponse: vi.fn(),
}));

const { sendCloudFormationResponse } = await import('@allma/core-sdk');
const { AllmaImporterService } = await import('../../../src/services/allma-importer.service.js');
const { handler } = await import('../../../src/allma-cdk/config-importer.js');

const s3Mock = mockClient(S3Client);
const NOW = '2026-01-01T00:00:00.000Z';
const header = { formatVersion: '1.0', exportedAt: NOW };

const flowsFile = {
  ...header,
  flows: [makeFlowDefinition({ id: 'flow-1' })],
  stepDefinitions: [{ id: 'step-1', name: 'Step One', stepType: StepType.NO_OP, createdAt: NOW, updatedAt: NOW }],
};
const promptsFile = {
  ...header,
  promptTemplates: [{ id: 'prompt-1', name: 'Prompt One', content: 'Hi', version: 1, isPublished: false, createdAt: NOW, updatedAt: NOW }],
  mcpConnections: [{ id: 'mcp-1', name: 'MCP', serverUrl: 'https://mcp.example.com', authentication: { type: 'NONE' }, createdAt: NOW, updatedAt: NOW }],
  agents: [{ id: 'agent-1', name: 'Agent', createdAt: NOW, updatedAt: NOW }],
};

const zipOf = (files: Record<string, unknown>) => {
  const zip = new AdmZip();
  zip.addFile('configs/', Buffer.alloc(0));
  for (const [name, content] of Object.entries(files)) {
    zip.addFile(name, Buffer.from(typeof content === 'string' ? content : JSON.stringify(content)));
  }
  return zip.toBuffer();
};

const event = (key: string) =>
  ({ RequestType: 'Create', ResourceProperties: { S3Bucket: 'assets', S3Key: key } }) as unknown as CloudFormationEvent;

const keys: string[] = [];
const run = async (files: Record<string, unknown>) => {
  const key = `config-importer-${keys.length}-${process.pid}.zip`;
  keys.push(key);
  const body = zipOf(files);
  s3Mock.on(GetObjectCommand).callsFake(() => ({ Body: Readable.from(body) }));
  await handler(event(key));
};

let importSpy: ReturnType<typeof vi.spyOn>;
const imported = () => importSpy.mock.calls[0][0] as AllmaExportFormat;

beforeEach(() => {
  s3Mock.reset();
  importSpy = vi.spyOn(AllmaImporterService.prototype, 'import').mockResolvedValue({
    created: { flows: 1, steps: 1, prompts: 1, mcpConnections: 1, agents: 1 },
    updated: { flows: 0, steps: 0, prompts: 0, mcpConnections: 0, agents: 0 },
    skipped: { flows: 0, steps: 0, prompts: 0, mcpConnections: 0, agents: 0 },
    errors: [],
  });
});

afterEach(() => {
  importSpy.mockRestore();
  for (const key of keys.splice(0)) fs.rmSync(`/tmp/${key}`, { force: true });
});

describe('config-importer handler — zip asset', () => {
  it('aggregates every JSON entry, skipping directories and non-JSON files', async () => {
    await run({ 'configs/flows.json': flowsFile, 'configs/prompts.json': promptsFile, 'configs/readme.txt': 'not json {' });

    expect(importSpy).toHaveBeenCalledTimes(1);
    const config = imported();
    expect(config.flows.map((f) => f.id)).toEqual(['flow-1']);
    expect(config.stepDefinitions.map((s) => s.id)).toEqual(['step-1']);
    expect(config.promptTemplates?.map((p) => p.id)).toEqual(['prompt-1']);
    expect(config.mcpConnections?.map((m) => m.id)).toEqual(['mcp-1']);
    expect(config.agents?.map((a) => a.id)).toEqual(['agent-1']);
    expect(sendCloudFormationResponse).toHaveBeenCalledWith(expect.anything(), 'SUCCESS', { ImportedItems: 2 });
  });
});
