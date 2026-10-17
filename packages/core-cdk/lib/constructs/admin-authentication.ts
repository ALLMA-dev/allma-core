import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { RemovalPolicy, CfnOutput, Duration } from 'aws-cdk-lib';
import { StageConfig } from '../config/stack-config.js';

export interface AdminAuthenticationProps {
  stageConfig: StageConfig;
  mfa?: cognito.Mfa;
  mfaSecondFactor?: cognito.MfaSecondFactor;
  advancedSecurityMode?: cognito.AdvancedSecurityMode;
  passwordMinLength?: number;
  passwordPolicy?: cognito.PasswordPolicy;
  deletionProtection?: boolean;
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
    const cognitoConfig = props.stageConfig.cognito;

    const mfa = props.mfa ?? cognitoConfig.mfa ?? cognito.Mfa.REQUIRED;
    const mfaSecondFactor = props.mfaSecondFactor ?? cognitoConfig.mfaSecondFactor ?? {
      sms: false,
      otp: true,
    };
    const advancedSecurityMode =
      props.advancedSecurityMode ?? cognitoConfig.advancedSecurityMode ?? cognito.AdvancedSecurityMode.ENFORCED;
    const minLength =
      props.passwordMinLength ??
      props.passwordPolicy?.minLength ??
      cognitoConfig.passwordMinLength ??
      cognitoConfig.passwordPolicy?.minLength ??
      12;
    const passwordPolicy: cognito.PasswordPolicy = {
      requireLowercase: true,
      requireDigits: true,
      requireSymbols: true,
      requireUppercase: true,
      tempPasswordValidity: Duration.days(7),
      ...cognitoConfig.passwordPolicy,
      ...props.passwordPolicy,
      minLength,
    };
    const deletionProtection = props.deletionProtection ?? cognitoConfig.deletionProtection ?? true;

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
      mfa,
      mfaSecondFactor,
      advancedSecurityMode,
      passwordPolicy,
      deletionProtection,
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