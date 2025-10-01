// packages/allma-admin-shell/src/hooks/useAdminAuth.ts

import { useQuery } from '@tanstack/react-query';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  type AdminPermission,
  type AdminRole,
  AdminUserPermissionsSchema,
  getDefaultPermissionsForRole,
} from '@allma/core-types';
import { CUSTOM_ADMIN_ROLES_ATTRIBUTE } from '@allma/core-sdk';
import { type AdminAuthContext } from '../types';


async function fetchAuthContext(): Promise<AdminAuthContext> {
  try {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken;

    if (!idToken) {
      throw new Error('Not authenticated. No ID token found.');
    }

    const claims = idToken.payload;
    const cognitoGroups = (claims['cognito:groups'] as string[]) || [];
    const customRolesString = claims[CUSTOM_ADMIN_ROLES_ATTRIBUTE] as string | undefined;

    let roles: AdminRole[] = [];
    let explicitPermissions: AdminPermission[] = [];

    if (customRolesString) {
      try {
        const parsed = JSON.parse(customRolesString);
        const validationResult = AdminUserPermissionsSchema.safeParse(parsed);
        if (validationResult.success) {
          // Use the validated data, falling back to an empty array if a property is missing
          roles = validationResult.data.roles ?? [];
          explicitPermissions = validationResult.data.permissions ?? [];
        } else {
            console.warn("Could not parse custom:admin_roles attribute", validationResult.error);
        }
      } catch (e) {
        console.error("Failed to JSON.parse custom:admin_roles attribute", e);
      }
    }

    const effectivePermissions = new Set<AdminPermission>(explicitPermissions);
    roles.forEach(role => {
      getDefaultPermissionsForRole(role).forEach(p => effectivePermissions.add(p));
    });

    const isSuperAdmin = roles.includes('SUPER_ADMIN' as AdminRole);

    return {
      userId: claims.sub!,
      username: (claims.email as string) || (claims.username as string),
      cognitoGroups,
      roles,
      permissions: Array.from(effectivePermissions),
      hasPermission: (permission: AdminPermission) => isSuperAdmin || effectivePermissions.has(permission),
    };
  } catch (err: any) {
    console.error("Error fetching auth context:", err);
    // Propagate a user-friendly error message
    throw new Error(err.message || 'Failed to fetch user session.');
  }
}

/**
 * A hook to provide a strongly-typed, session-aware authentication and
 * authorization context for the admin application.
 *
 * It handles fetching the user's session, parsing Cognito groups and custom roles,
 * and provides a convenient `hasPermission` checker.
 *
 * This hook is cached by React Query to prevent re-fetching on every component render.
 */
export function useAdminAuth() {
  const { data, isLoading, error, isError } = useQuery<AdminAuthContext, Error>({
    queryKey: ['adminAuthContext'],
    queryFn: fetchAuthContext,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false, // Don't retry on auth errors
  });

  return {
    authContext: data,
    isLoading,
    error,
    isError,
  };
}