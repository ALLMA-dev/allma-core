import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import { Template } from 'aws-cdk-lib/assertions';
import { createConfigImporterResource } from '../../lib/constructs/config-importer-resource.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'allma-config-importer-'));

function codeDir(name: string, source: string): string {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.js'), source);
  return dir;
}

function configFile(name: string, content: string): string {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, content);
  return file;
}

function synth(code: lambda.Code, config: string) {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack', { env: { account: '123456789012', region: 'us-east-1' } });
  const importerFunction = new lambda.Function(stack, 'Importer', {
    code,
    runtime: lambda.Runtime.NODEJS_22_X,
    handler: 'index.handler',
  });
  const configAsset = new s3_assets.Asset(stack, 'Config', { path: config });
  createConfigImporterResource(stack, 'AllmaConfigImporterResource', {
    importerFunction,
    configAsset,
    deploymentParameters: { stage: 'beta', accountId: stack.account, region: stack.region },
  });
  const template = Template.fromStack(stack);
  const [resource] = Object.values(template.findResources('Custom::AllmaConfigImporter'));
  const [fn] = Object.values(template.findResources('AWS::Lambda::Function'));
  return { properties: resource.Properties, functionCode: fn.Properties.Code };
}

const codeA = codeDir('code-a', 'exports.handler = async () => "a";');
const codeB = codeDir('code-b', 'exports.handler = async () => "b";');
const config1 = configFile('config-1.json', '{"flows":[1]}');
const config2 = configFile('config-2.json', '{"flows":[2]}');

describe('createConfigImporterResource', () => {
  it('keys the resource on the importer code key alongside the config asset and deployment parameters', () => {
    const { properties, functionCode } = synth(lambda.Code.fromAsset(codeA), config1);
    expect(typeof functionCode.S3Key).toBe('string');
    expect(properties.ImporterCodeKey).toBe(functionCode.S3Key);
    expect(properties.ImporterCodeKey).toMatch(/^[0-9a-f]{64}\.zip$/);
    expect(properties.S3Bucket).toBeDefined();
    expect(properties.S3Key).toMatch(/\.json$/);
    expect(properties.DeploymentParameters).toEqual({ stage: 'beta', accountId: '123456789012', region: 'us-east-1' });
  });

  it('changes its properties when only the importer code changes', () => {
    const a = synth(lambda.Code.fromAsset(codeA), config1).properties;
    const b = synth(lambda.Code.fromAsset(codeB), config1).properties;
    expect(b.S3Key).toBe(a.S3Key);
    expect(b.ImporterCodeKey).not.toBe(a.ImporterCodeKey);
    expect(b).not.toEqual(a);
  });

  it('changes its properties when only the flow config changes', () => {
    const a = synth(lambda.Code.fromAsset(codeA), config1).properties;
    const b = synth(lambda.Code.fromAsset(codeA), config2).properties;
    expect(b.ImporterCodeKey).toBe(a.ImporterCodeKey);
    expect(b.S3Key).not.toBe(a.S3Key);
  });

  it('keeps identical properties when neither code nor config changes', () => {
    const a = synth(lambda.Code.fromAsset(codeA), config1).properties;
    const b = synth(lambda.Code.fromAsset(codeA), config1).properties;
    expect(b).toEqual(a);
  });

  it('throws when the importer code is not an asset', () => {
    expect(() => synth(lambda.Code.fromInline('exports.handler = async () => {};'), config1)).toThrow(/Importer/);
  });
});
