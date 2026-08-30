import { describe, it, expect } from 'vitest';
import * as RootExports from '../index.js';
import * as AdminExports from './index.js';

const REMOVED_STUBS = [
  'withAdminAuth',
  'AuthContext',
  'createApiGatewayResponse',
  'buildSuccessResponse',
  'buildErrorResponse',
  'offloadIfLarge',
  'getAdminApiDomain',
] as const;

describe('admin barrel exports', () => {
  it('does not export stub auth, response, or offload helpers from root or admin barrels', () => {
    for (const stub of REMOVED_STUBS) {
      expect(stub in AdminExports, `AdminExports should not contain ${stub}`).toBe(false);
      expect(stub in RootExports, `RootExports should not contain ${stub}`).toBe(false);
      expect((AdminExports as Record<string, unknown>)[stub]).toBeUndefined();
      expect((RootExports as Record<string, unknown>)[stub]).toBeUndefined();
    }
  });

  it('retains legitimate admin exports in root and admin barrels', () => {
    const expectedExports = {
      ALLMA_ADMIN_API_ROUTES: expect.any(Object),
      AdminRole: expect.any(Object),
      AdminPermission: expect.any(Object),
      hasPermission: expect.any(Function),
      isInCognitoGroup: expect.any(Function),
      AdminUserPermissionsSchema: expect.any(Object),
      AllmaExportFormatSchema: expect.any(Object),
    };

    for (const [key, matcher] of Object.entries(expectedExports)) {
      expect(AdminExports[key as keyof typeof AdminExports]).toEqual(matcher);
      expect(RootExports[key as keyof typeof RootExports]).toEqual(matcher);
    }
  });
});
