#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AllmaStack, defaultConfig, StageConfig } from '@allma/core-cdk';
import { devConfig } from '../config/allma.config.js';
import * as path from 'path';
import { OptiroqModuleStack, OptiroqStageConfig } from '../lib/optiroq-module.stack.js';
import { deepMerge } from '@allma/core-sdk';

const app = new cdk.App();

// Create a complete stage configuration by merging the user-provided overrides
// with the default configuration. This ensures that all required properties are present.
console.log(JSON.stringify(defaultConfig));
console.log(JSON.stringify(devConfig));
const stageConfig: StageConfig = deepMerge(defaultConfig, devConfig);
console.log(JSON.stringify(stageConfig));

// It's crucial to validate that the AWS account and region are explicitly set.
// The default values are placeholders and must be overridden by the user.
if (!stageConfig.awsAccountId || stageConfig.awsAccountId === 'YOUR_ACCOUNT_ID' || !stageConfig.awsRegion) {
  throw new Error(
    'The `awsAccountId` and `awsRegion` must be set in your `allma.config.ts` file.',
  );
}

const stageName = stageConfig.stage ? `${stageConfig.stage.charAt(0).toUpperCase()}${stageConfig.stage.slice(1)}` : 'Dev';
const stackEnv = { account: stageConfig.awsAccountId, region: stageConfig.awsRegion };
const stackPrefix = `Optiroq-${stageName}`;

new AllmaStack(app, `AllmaPlatformStack-${stageName}`, {
  env: stackEnv,
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  stageConfig,
  adminShell: {
    assetPath: path.join(__dirname, '../src/admin-app/dist'),
    domainName: 'allma-admin-beta.optiroq.com',
    certificateArn: 'arn:aws:acm:us-east-1:871610744338:certificate/54df458a-2b05-454f-a490-ac035b76381f',
  },
});

// Import the ARN of the Allma execution role exported by the AllmaStack
// This is the secure way to grant cross-stack permissions.
const coreStackExportPrefix = `AllmaPlatform-${devConfig.stage}`;
const allmaOrchestrationRoleArn = cdk.Fn.importValue(`${coreStackExportPrefix}-OrchestrationLambdaRoleArn`);

let optiroqStageConfig = stageConfig as OptiroqStageConfig;
optiroqStageConfig.optiroqApi = {
  domainName: 'api-beta.optiroq.com',
  certificateArn: 'arn:aws:acm:us-west-2:871610744338:certificate/035a55be-44b1-470d-a579-87d8e938b466',
  allowedOrigins: [
    'http://localhost:3000',
    'https://portal-beta.optiroq.com', // Placeholder for beta UI
    'https://portal.optiroq.com',     // Placeholder for prod UI
  ]
};

optiroqStageConfig.optiroqPortal = {
  domainName: "portal-beta.optiroq.com",
  certificateArn: "arn:aws:acm:us-east-1:871610744338:certificate/74ed3a77-d696-4f02-84b3-145e1401481c"
}


// Deploy the Optiroq Application Module Stack
new OptiroqModuleStack(app, `${stackPrefix}-ModuleStack`, {
  env: stackEnv,
  stageConfig: optiroqStageConfig,
  stageName,
  allmaOrchestrationRoleArn,
});
