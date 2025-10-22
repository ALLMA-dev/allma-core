import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import { WebAppDeployment } from './constructs/web-app-deployment';

export interface WebsitesStackProps extends cdk.StackProps {
  stage: string;
  domainName?: string;
  certificateArn?: string;
}

export class WebsitesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebsitesStackProps) {
    super(scope, id, props);

    new WebAppDeployment(this, `DocsDeployment-${props.stage}`, {
      deploymentId: `AllmaDocs-${props.stage}`,
      assetPath: path.join(__dirname, '../../docs.allma.dev/build'),
      runtimeConfig: {
        // Docs site may not need runtime config, but the prop is required.
      },
      domainName: props.domainName,
      certificateArn: props.certificateArn,
    });
  }
}
