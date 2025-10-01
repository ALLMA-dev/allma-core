import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { AwsCustomResource, AwsSdkCall, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { StepType } from '@allma/core-types';
export interface ExternalStepRegistrationProps {
    /**
    The name of the central Allma configuration table.
    */
    configTableName: string;
    /** 
    The unique identifier for the step (e.g., 'my-module/my-step').
    */
    moduleIdentifier: string;
    /**
    The user-friendly name for the step in the UI.
    */
    displayName: string;
    /**
    A short description of what the step does.
    */
    description: string;
    /**
    The step's functional type (e.g., DATA_LOAD).
    */
    stepType: StepType;
    /**
    The ARN of the Lambda function that executes the step's logic.
    */
    lambdaArn: string;
    /**
    A default configuration object for the step instance when dragged onto the canvas.
    It will be automatically merged with the moduleIdentifier.
    */
    defaultConfig: Record<string, any>;
}
/**
A reusable CDK utility to register an external step in the Allma DynamoDB registry.
Creates an AwsCustomResource that handles putting the item on deploy/update and deleting it on destroy.
@param scope The CDK Construct scope.
@param id The unique ID for this construct.
@param props The properties for the step registration.
*/
export function createExternalStepRegistration(scope: Construct, id: string, props: ExternalStepRegistrationProps) {
    const { configTableName, moduleIdentifier, displayName, description, stepType, lambdaArn, defaultConfig } = props;
    const registrationId = `EXTERNAL_STEP#${ moduleIdentifier }`;
    const stack = cdk.Stack.of(scope);
    const sdkCall: AwsSdkCall = {
        service: 'DynamoDB',
        action: 'putItem',
        parameters: {
            TableName: configTableName,
            Item: {
                PK: { S: registrationId },
                SK: { S: 'METADATA' },
                itemType: { S: 'ALLMA_EXTERNAL_STEP_REGISTRY' },
                moduleIdentifier: { S: moduleIdentifier },
                lambdaArn: { S: lambdaArn },
                displayName: { S: displayName },
                description: { S: description },
                stepType: { S: stepType },
                defaultConfig: { S: JSON.stringify({ moduleIdentifier, ...defaultConfig }) },
            },
        },
        physicalResourceId: PhysicalResourceId.of(registrationId),
    };
    const deleteCall: AwsSdkCall = {
        service: 'DynamoDB',
        action: 'deleteItem',
        parameters: {
            TableName: configTableName,
            Key: {
                PK: { S: registrationId },
                SK: { S: 'METADATA' },
            },
        },
    };
    new AwsCustomResource(scope, id, {
        onCreate: sdkCall,
        onUpdate: sdkCall,
        onDelete: deleteCall,
        logRetention: RetentionDays.ONE_WEEK,
        installLatestAwsSdk: true, // Ensures SDK is up-to-date for DynamoDB calls
        policy: {
            statements: [
                new iam.PolicyStatement({
                    actions: ['dynamodb:PutItem', 'dynamodb:DeleteItem'],
                    resources: [`arn:aws:dynamodb:${stack.region}:${stack.account}:table/${configTableName}`],
                }),
            ],
        },
    });
}
