import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { RemovalPolicy, CfnOutput, Duration } from 'aws-cdk-lib';
import { StageConfig } from '../config/stack-config.js';

interface AdminAuthenticationProps {
  stageConfig: StageConfig;
}

/**
 * Creates and configures the Cognito User Pool for authenticating Admin UI users.
 */
export class AdminAuthentication extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly adminGroup: cognito.CfnUserPoolGroup; 

  constructor(scope: Construct, id: string, props: AdminAuthenticationProps) {
    super(scope, id);

    const isProd = props.stageConfig.stage === 'prod';

    this.userPool = new cognito.UserPool(this, 'AdminUserPool', {
      userPoolName: `${props.stageConfig.cognito.userPoolName}`,
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
        username: false, // Using email as the primary sign-in alias
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
      customAttributes: {
        admin_roles: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
        requireUppercase: true,
        tempPasswordValidity: Duration.days(7), 
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'AdminUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `AllmaAdminUIClient-${props.stageConfig.stage}`,
      authFlows: {
        userSrp: true,
      },
    });

    const adminGroupName = props.stageConfig.cognito.adminGroupName;
    this.adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: adminGroupName,
      description: 'Administrators with full access to the admin panel',
    });

    // Outputs for easy reference
    new CfnOutput(this, 'AdminUserPoolRegionOutput', {
      value: cdk.Aws.REGION,
      description: 'Admin User Pool Region',
    });

    // Correctly construct the Admin Group ARN
    const adminGroupArn = `arn:aws:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/${this.userPool.userPoolId}/group/${adminGroupName}`;
    new CfnOutput(this, 'AdminGroupArnOutput', {
        value: adminGroupArn,
        description: 'ARN of the Admins User Pool Group',
    });
  }
}