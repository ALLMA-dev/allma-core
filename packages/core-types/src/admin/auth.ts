import { z } from 'zod';

/**
 * Defines high-level roles for the Admin UI.
 * These roles are collections of granular permissions.
 */
export enum AdminRole {
    SUPER_ADMIN = 'SUPER_ADMIN',     // Full access, including user management (future).
    FLOW_MANAGER = 'FLOW_MANAGER',   // Can create, edit, and manage flows and prompts.
    DEBUG_VIEWER = 'DEBUG_VIEWER',   // Read-only access to execution logs and flow definitions for debugging.
}

import { AdminPermission } from './permissions.js';

// Schema for the custom:admin_roles attribute (a JSON string in the JWT).
export const AdminUserPermissionsSchema = z.object({
    roles: z.array(z.nativeEnum(AdminRole)).optional().default([]),
    permissions: z.array(z.nativeEnum(AdminPermission)).optional().default([]),
});
export type AdminUserPermissions = z.infer<typeof AdminUserPermissionsSchema>;

/**
 * Provides a default set of permissions for each role.
 * This is the basis for role-based access control.
 * @param role The AdminRole to get permissions for.
 * @returns An array of AdminPermissions.
 */
export const getDefaultPermissionsForRole = (role: AdminRole): AdminPermission[] => {
    switch (role) {
        case AdminRole.SUPER_ADMIN:
            return Object.values(AdminPermission); // All permissions

        case AdminRole.FLOW_MANAGER:
            return [
                AdminPermission.DASHBOARD_VIEW,
                AdminPermission.EXECUTIONS_READ, 
                AdminPermission.DEFINITIONS_READ,
                AdminPermission.DEFINITIONS_WRITE,
                AdminPermission.DEFINITIONS_DELETE,
            ];

        case AdminRole.DEBUG_VIEWER:
            return [
                AdminPermission.DASHBOARD_VIEW,
                AdminPermission.EXECUTIONS_READ,
                AdminPermission.DEFINITIONS_READ,
            ];
            
        default:
            return [];
    }
};

/**
 * Checks if a user has a specific permission based on their roles and explicit permissions.
 * This is primarily a client-side helper for UI rendering. Server-side authorization
 * should always be performed in the Lambda handler.
 * @param userPermissions The parsed permissions object from the user's JWT.
 * @param requiredPermission The permission to check for.
 * @returns True if the user has the permission, false otherwise.
 */
export const hasPermission = (userPermissions: AdminUserPermissions | null | undefined, requiredPermission: AdminPermission): boolean => {
    if (!userPermissions) return false;

    // A SUPER_ADMIN role implicitly grants all permissions.
    if (userPermissions.roles?.includes(AdminRole.SUPER_ADMIN)) {
        return true;
    }
    
    // Check for explicitly granted permissions first.
    if (userPermissions.permissions?.includes(requiredPermission)) {
        return true;
    }

    // Check if any of the user's assigned roles inherently grant the permission.
    if (userPermissions.roles?.some(role => getDefaultPermissionsForRole(role).includes(requiredPermission))) {
        return true;
    }

    return false;
};

/**
 * Checks if a user belongs to a specific Cognito Group. This is the primary server-side check.
 * @param cognitoGroups An array of groups from the JWT claims (cognito:groups).
 * @param requiredGroup The group name to check for (e.g., 'Admins').
 * @returns True if the user is in the required group, false otherwise.
 */
export const isInCognitoGroup = (cognitoGroups: string[] | undefined | null, requiredGroup: string): boolean => {
    if (!cognitoGroups || cognitoGroups.length === 0) {
        return false;
    }
    return cognitoGroups.includes(requiredGroup);
};
