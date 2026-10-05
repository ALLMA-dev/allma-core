import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';

export function createConfigImporterResource(
  scope: Construct,
  id: string,
  props: {
    importerFunction: lambda.Function;
    configAsset: s3_assets.Asset;
    deploymentParameters: { stage: string; accountId: string; region: string };
  },
): cdk.CustomResource {
  const { importerFunction, configAsset, deploymentParameters } = props;
  const importerCodeKey = cdk.Stack.of(importerFunction).resolve((importerFunction.node.defaultChild as lambda.CfnFunction).code)?.s3Key;
  if (importerCodeKey == null) {
    throw new Error(`Config importer function '${importerFunction.node.path}' has no asset code key to key the config import on.`);
  }
  return new cdk.CustomResource(scope, id, {
    serviceToken: importerFunction.functionArn,
    resourceType: 'Custom::AllmaConfigImporter',
    properties: {
      S3Bucket: configAsset.s3BucketName,
      S3Key: configAsset.s3ObjectKey,
      // CloudFormation sends an Update only on a property change, so the code key makes a new importer re-run the import.
      ImporterCodeKey: importerCodeKey,
      DeploymentParameters: deploymentParameters,
    },
  });
}
