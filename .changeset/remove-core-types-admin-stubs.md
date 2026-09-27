---
"@allma/core-types": major
---

**Breaking:** remove the stub helpers `withAdminAuth`, `AuthContext`, `createApiGatewayResponse`, `buildSuccessResponse`, `buildErrorResponse`, `offloadIfLarge` and `getAdminApiDomain`. They did nothing real — `withAdminAuth` passed every request through unchecked. Import `withAdminAuth`, the response builders and `offloadIfLarge` from `@allma/core-sdk`. `AuthContext` is now the core-sdk interface of the same name (a type, not a class), filled by `getAuthContext`. `getAdminApiDomain` has no replacement; it returned a placeholder `example.com` domain.
