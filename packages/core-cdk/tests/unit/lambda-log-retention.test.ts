import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Template } from 'aws-cdk-lib/assertions';
import { AllmaStack } from '../../dist/lib/allma-stack.js';
import { resolveLogRetentionDays } from '../../dist/lib/constructs/log-retention.js';

const adminShellAssets = fs.mkdtempSync(path.join(os.tmpdir(), 'allma-admin-shell-'));
fs.writeFileSync(path.join(adminShellAssets, 'index.html'), '<html></html>');

function synthStack(defaultRetentionDays?: number) {
  const app = new cdk.App({ context: { 'aws:cdk:bundling-stacks': [] } });
  const stack = new AllmaStack(app, 'TestAllmaStack', {
    env: { account: '123456789012', region: 'us-east-1' },
    stageConfig: {
      awsAccountId: '123456789012',
      aiApiKeySecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:ai-key',
      ses: { verifiedDomain: 'mail.example.com' },
      ...(defaultRetentionDays !== undefined && { logging: { retentionDays: { default: defaultRetentionDays } } }),
    },
    adminShell: { assetPath: adminShellAssets },
  });
  return Template.fromStack(stack);
}

function retentionByFunctionLogicalId(template: Template): Map<string, number> {
  const byFunction = new Map<string, number>();
  for (const resource of Object.values(template.findResources('Custom::LogRetention'))) {
    const parts = resource.Properties.LogGroupName['Fn::Join'][1];
    expect(parts[0]).toBe('/aws/lambda/');
    byFunction.set(parts[1].Ref, resource.Properties.RetentionInDays);
  }
  return byFunction;
}

describe('resolveLogRetentionDays', () => {
  it('maps day counts to finite CloudWatch tiers, snapping up and never returning INFINITE', () => {
    expect(resolveLogRetentionDays(7)).toBe(logs.RetentionDays.ONE_WEEK);
    expect(resolveLogRetentionDays(10)).toBe(logs.RetentionDays.TWO_WEEKS);
    expect(resolveLogRetentionDays(365)).toBe(logs.RetentionDays.ONE_YEAR);
    expect(resolveLogRetentionDays(9999)).toBe(logs.RetentionDays.TEN_YEARS);
    expect(resolveLogRetentionDays(undefined)).toBe(logs.RetentionDays.ONE_WEEK);
    expect(resolveLogRetentionDays(0)).toBe(logs.RetentionDays.ONE_WEEK);
  });
});

describe('AllmaStack log retention', () => {
  it.each([
    [undefined, 7],
    [365, 365],
  ])('gives every Lambda and log group a finite retention (default=%s)', (configured, expected) => {
    const template = synthStack(configured);
    const retention = retentionByFunctionLogicalId(template);
    const functions = Object.keys(template.findResources('AWS::Lambda::Function'))
      .filter(id => !id.startsWith('LogRetention'));

    expect(functions.some(id => id.includes('IterativeStepProcessor'))).toBe(true);
    expect(functions.some(id => id.includes('ConfigInjectorLambda'))).toBe(true);
    expect(functions.some(id => id.startsWith('CustomCDKBucketDeployment'))).toBe(true);
    expect(functions.some(id => id.startsWith('CustomS3AutoDeleteObjects'))).toBe(true);
    for (const id of functions) {
      expect([id, retention.get(id)]).toEqual([id, expected]);
    }

    const logGroups = Object.values(template.findResources('AWS::Logs::LogGroup'));
    expect(logGroups.length).toBeGreaterThan(0);
    for (const group of logGroups) {
      expect(group.Properties.RetentionInDays).toBeLessThan(logs.RetentionDays.INFINITE);
    }
  });
});
