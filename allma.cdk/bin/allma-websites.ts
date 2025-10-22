#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebsitesStack } from '../lib/websites-stack';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage');
const account = app.node.tryGetContext('account');
const region = app.node.tryGetContext('region');
const domainName = app.node.tryGetContext('domainName');
const certificateArn = app.node.tryGetContext('certificateArn');

if (!stage || !account || !region) {
  throw new Error('CDK context variables "stage", "account", and "region" must be provided. Example: cdk deploy -c stage=prod -c account=123456789012 -c region=us-east-1');
}

new WebsitesStack(app, `AllmaWebsitesStack-${stage}`, {
  env: {
    account,
    region,
  },
  stage,
  domainName,
  certificateArn,
});
