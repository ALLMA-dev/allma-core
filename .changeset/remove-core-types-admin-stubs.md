---
"@allma/core-types": major
---

**Breaking:** remove the stub helpers `withAdminAuth`, `AuthContext`, `createApiGatewayResponse`, `buildSuccessResponse`, `buildErrorResponse`, `offloadIfLarge` and `getAdminApiDomain`. They did nothing real — `withAdminAuth` passed every request through unchecked. Import `withAdminAuth`, `AuthContext`, the response builders and `offloadIfLarge` from `@allma/core-sdk`. `getAdminApiDomain` has no replacement; it returned a placeholder `example.com` domain.
