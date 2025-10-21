#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AllmaStack } from '@allma/core-cdk';
import { devConfig } from '../config/allma.config';
import * as path from 'path';

const app = new cdk.App();

const stageName = devConfig.stage ? `${devConfig.stage.charAt(0).toUpperCase()}${devConfig.stage.slice(1)}` : 'Dev';

new AllmaStack(app, `AllmaPlatformStack-${stageName}`, {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
   env: { account: devConfig.awsAccountId, region: devConfig.awsRegion },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  stageConfig: devConfig,

    adminShell: {
      assetPath: path.join(__dirname, '../src/admin-app/dist'),
  },
});
