---
'@allma/core-cdk': minor
---

Harden AdminAuthentication Cognito User Pool defaults (MFA required with TOTP, threat protection enforced, 12-character minimum password length, and active deletion protection) and expose configuration options on `StageConfig.cognito` and `AdminAuthenticationProps`.
