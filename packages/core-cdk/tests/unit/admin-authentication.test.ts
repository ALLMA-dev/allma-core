import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Template } from 'aws-cdk-lib/assertions';
import { AdminAuthentication, type AdminAuthenticationProps } from '../../lib/constructs/admin-authentication.js';
import { defaultConfig } from '../../lib/config/default-config.js';
import type { StageConfig } from '../../lib/config/stack-config.js';

function synthPool(props: AdminAuthenticationProps) {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-central-1' },
  });
  new AdminAuthentication(stack, 'AdminAuth', props);
  const template = Template.fromStack(stack);
  const pools = Object.values(template.findResources('AWS::Cognito::UserPool'));
  expect(pools).toHaveLength(1);
  return pools[0].Properties;
}

describe('AdminAuthentication', () => {
  it('defaults to MFA REQUIRED (TOTP), ENFORCED threat protection, minLength 12, and ACTIVE deletion protection', () => {
    const props = synthPool({ stageConfig: defaultConfig });
    expect(props.MfaConfiguration).toBe('ON');
    expect(props.EnabledMfas).toEqual(['SOFTWARE_TOKEN_MFA']);
    expect(props.UserPoolAddOns).toEqual({ AdvancedSecurityMode: 'ENFORCED' });
    expect(props.Policies.PasswordPolicy).toMatchObject({
      MinimumLength: 12,
      RequireLowercase: true,
      RequireNumbers: true,
      RequireSymbols: true,
      RequireUppercase: true,
      TemporaryPasswordValidityDays: 7,
    });
    expect(props.DeletionProtection).toBe('ACTIVE');
  });

  it('applies hardened defaults even when stageConfig.cognito provides only userPoolName and adminGroupName', () => {
    const minimalStageConfig: StageConfig = {
      ...defaultConfig,
      cognito: {
        userPoolName: 'MinimalAdminPool',
        adminGroupName: 'MinimalAdmins',
      },
    };
    const props = synthPool({ stageConfig: minimalStageConfig });
    expect(props.MfaConfiguration).toBe('ON');
    expect(props.EnabledMfas).toEqual(['SOFTWARE_TOKEN_MFA']);
    expect(props.UserPoolAddOns).toEqual({ AdvancedSecurityMode: 'ENFORCED' });
    expect(props.Policies.PasswordPolicy.MinimumLength).toBe(12);
    expect(props.DeletionProtection).toBe('ACTIVE');
  });

  it('applies overrides supplied via stageConfig.cognito', () => {
    const customStageConfig: StageConfig = {
      ...defaultConfig,
      cognito: {
        userPoolName: 'CustomAdminPool',
        adminGroupName: 'CustomAdmins',
        mfa: cognito.Mfa.OPTIONAL,
        mfaSecondFactor: { sms: true, otp: true },
        advancedSecurityMode: cognito.AdvancedSecurityMode.AUDIT,
        passwordMinLength: 16,
        deletionProtection: false,
      },
    };
    const props = synthPool({ stageConfig: customStageConfig });
    expect(props.MfaConfiguration).toBe('OPTIONAL');
    expect(props.EnabledMfas).toEqual(['SMS_MFA', 'SOFTWARE_TOKEN_MFA']);
    expect(props.UserPoolAddOns).toEqual({ AdvancedSecurityMode: 'AUDIT' });
    expect(props.Policies.PasswordPolicy.MinimumLength).toBe(16);
    expect(props.DeletionProtection).toBe('INACTIVE');

    const policyStageConfig: StageConfig = {
      ...defaultConfig,
      cognito: {
        userPoolName: 'PolicyAdminPool',
        adminGroupName: 'PolicyAdmins',
        passwordPolicy: { minLength: 15, requireSymbols: false },
      },
    };
    const policyProps = synthPool({ stageConfig: policyStageConfig });
    expect(policyProps.Policies.PasswordPolicy).toMatchObject({
      MinimumLength: 15,
      RequireLowercase: true,
      RequireNumbers: true,
      RequireSymbols: false,
      RequireUppercase: true,
      TemporaryPasswordValidityDays: 7,
    });
  });

  it('applies direct AdminAuthenticationProps overrides with precedence over stageConfig.cognito', () => {
    const props = synthPool({
      stageConfig: defaultConfig,
      mfa: cognito.Mfa.OFF,
      mfaSecondFactor: { sms: false, otp: false },
      advancedSecurityMode: cognito.AdvancedSecurityMode.OFF,
      passwordMinLength: 18,
      passwordPolicy: {
        minLength: 14,
        requireSymbols: false,
      },
      deletionProtection: false,
    });
    expect(props.MfaConfiguration).toBe('OFF');
    expect(props.EnabledMfas).toBeUndefined();
    expect(props.UserPoolAddOns).toEqual({ AdvancedSecurityMode: 'OFF' });
    expect(props.Policies.PasswordPolicy).toMatchObject({
      MinimumLength: 18,
      RequireLowercase: true,
      RequireNumbers: true,
      RequireSymbols: false,
      RequireUppercase: true,
      TemporaryPasswordValidityDays: 7,
    });
    expect(props.DeletionProtection).toBe('INACTIVE');
  });
});
