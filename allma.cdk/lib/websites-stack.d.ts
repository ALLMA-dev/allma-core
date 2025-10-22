import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface WebsitesStackProps extends cdk.StackProps {
    stage: string;
    domainName?: string;
    certificateArn?: string;
}
export declare class WebsitesStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: WebsitesStackProps);
}
