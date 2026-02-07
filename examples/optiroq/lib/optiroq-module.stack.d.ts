import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StageConfig } from '@allma/core-cdk';
export interface OptiroqStageConfig extends StageConfig {
    optiroqApi: {
        domainName: string;
        certificateArn: string;
        hostedZoneId?: string;
        hostedZoneName?: string;
        allowedOrigins: string[];
    };
    optiroqPortal: {
        domainName: string;
        certificateArn: string;
        hostedZoneId?: string;
    };
}
interface OptiroqModuleStackProps extends cdk.StackProps {
    stageConfig: OptiroqStageConfig;
    stageName: string;
    allmaOrchestrationRoleArn: string;
}
export declare class OptiroqModuleStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: OptiroqModuleStackProps);
}
export {};
