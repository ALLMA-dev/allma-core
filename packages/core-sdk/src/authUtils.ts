import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { buildErrorResponse, createApiGatewayResponse } from './apiResponseBuilder.js';
import { AdminPermission, AdminRole, AdminUserPermissionsSchema, getDefaultPermissionsForRole, isInCognitoGroup } from '@allma/core-types';
import { log_debug, log_error, log_info, log_warn } from './logger.js';

// Constants for Cognito group and custom attribute names
export const ADMIN_COGNITO_GROUP_NAME = 'Admins';
export const CUSTOM_ADMIN_ROLES_ATTRIBUTE = 'custom:admin_roles';

export interface AuthContext {
    userId: string;
    username: string;
    cognitoGroups: string[];
    adminPermissions: {
        roles: AdminRole[];
        permissions: AdminPermission[];
    };
    isAuthenticated: boolean;
    isSuperAdmin: boolean;
    hasPermission: (permission: AdminPermission) => boolean;
}

/**
 * Options for configuring authentication behavior.
 */
export interface AuthOptions {
  /**
   * The name of the Cognito group that a user must be a member of.
   * @default 'Admins'
   */
  requiredGroup?: string;
  /**
   * The name of the custom attribute in the JWT that contains user roles and permissions.
   * @default 'custom:admin_roles'
   */
  customRolesAttribute?: string;
}


/**
 * Extracts and validates authentication and authorization information from an API Gateway event.
 * This function is now a pure context extractor and does not enforce group membership.
 *
 * @param event The APIGatewayProxyEventV2.
 * @param correlationId Optional correlation ID for logging.
 * @param options Optional configuration for the custom roles attribute.
 * @returns An AuthContext object.
 * @throws Error if unauthorized (e.g., missing claims).
 */
export function getAuthContext(
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
    correlationId?: string,
    options?: { customRolesAttribute?: string }
): AuthContext {
    const claims = event.requestContext.authorizer?.jwt?.claims;

    if (!claims) {
        log_warn('Unauthorized: No JWT claims found in event.requestContext.authorizer.', {}, correlationId);
        throw new Error('Unauthorized');
    }

    const userId = claims.sub as string;
    const username = claims.email as string;

    const cognitoGroupsClaimValue = claims['cognito:groups'];
    let cognitoGroups: string[] = [];

    if (Array.isArray(cognitoGroupsClaimValue)) {
        cognitoGroups = cognitoGroupsClaimValue.filter(group => typeof group === 'string');
        log_debug('Parsed cognito:groups from JWT array.', { rawGroups: cognitoGroupsClaimValue, parsed: cognitoGroups }, correlationId);
    } else if (typeof cognitoGroupsClaimValue === 'string') {
        let processableString = cognitoGroupsClaimValue.trim();
        if (processableString.startsWith('[') && processableString.endsWith(']')) {
            processableString = processableString.substring(1, processableString.length - 1);
        }
        cognitoGroups = processableString.split(',').map(group => group.trim()).filter(group => group.length > 0);
        log_debug('Parsed cognito:groups from JWT string.', { rawString: cognitoGroupsClaimValue, processedString: processableString, parsed: cognitoGroups }, correlationId);
    } else if (cognitoGroupsClaimValue !== undefined && cognitoGroupsClaimValue !== null) {
        log_warn('cognito:groups claim is present but is not an array or string.', { type: typeof cognitoGroupsClaimValue, value: cognitoGroupsClaimValue }, correlationId);
    }

    const customRolesAttr = options?.customRolesAttribute || CUSTOM_ADMIN_ROLES_ATTRIBUTE;
    const customAdminRolesString = claims[customRolesAttr];
    let adminUserPermissions: { roles: AdminRole[]; permissions: AdminPermission[] } = { roles: [], permissions: [] };

    if (typeof customAdminRolesString === 'string') {
        try {
            const parsedPermissions = JSON.parse(customAdminRolesString);
            const validationResult = AdminUserPermissionsSchema.safeParse(parsedPermissions);
            if (validationResult.success) {
                adminUserPermissions = validationResult.data;
            } else {
                log_warn(`Invalid ${customRolesAttr} attribute format for user.`, { userId, errors: validationResult.error.flatten().fieldErrors }, correlationId);
            }
        } catch (e) {
            log_warn(`Failed to parse ${customRolesAttr} attribute for user.`, { userId, customAdminRolesString, error: (e as Error).message }, correlationId);
        }
    }

    const isSuperAdmin = adminUserPermissions.roles.includes(AdminRole.SUPER_ADMIN);

    const effectivePermissions = new Set<AdminPermission>();
    adminUserPermissions.roles.forEach(role => {
        getDefaultPermissionsForRole(role).forEach(p => effectivePermissions.add(p));
    });
    adminUserPermissions.permissions.forEach(p => effectivePermissions.add(p));

    const authContext: AuthContext = {
        userId,
        username,
        cognitoGroups,
        adminPermissions: {
            roles: adminUserPermissions.roles,
            permissions: Array.from(effectivePermissions),
        },
        isAuthenticated: true,
        isSuperAdmin,
        hasPermission: (permission: AdminPermission) => (isSuperAdmin || effectivePermissions.has(permission)),
    };

    log_info(`Admin API request auth context established for user: ${username} (ID: ${userId})`, { groups: cognitoGroups, roles: authContext.adminPermissions.roles, permissions: authContext.adminPermissions.permissions.join(',') }, correlationId);
    return authContext;
}

/**
 * Higher-order function to wrap Lambda handlers with authentication and authorization.
 * This middleware enforces membership in a specified Cognito group and provides an
 * AuthContext for granular permission checks within the handler.
 *
 * @param handler The original Lambda handler function, now receiving an `AuthContext` object.
 * @param options Optional configuration to specify the required group and custom roles attribute.
 * @returns A new Lambda handler function compatible with API Gateway.
 */
export function withAdminAuth(
    handler: (event: APIGatewayProxyEventV2WithJWTAuthorizer, authContext: AuthContext) => Promise<any>,
    options?: AuthOptions
) {
    return async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
        const correlationId = event.requestContext.requestId || event.headers['X-Correlation-Id'] || 'UNKNOWN';
        
        try {
            // Step 1: Extract context. This will throw 'Unauthorized' if claims are missing.
            const authContext = getAuthContext(
                event,
                correlationId,
                options?.customRolesAttribute
                    ? { customRolesAttribute: options.customRolesAttribute }
                    : undefined
            );

            // Step 2: Enforce group membership.
            const requiredGroup = options?.requiredGroup || ADMIN_COGNITO_GROUP_NAME;
            if (!isInCognitoGroup(authContext.cognitoGroups, requiredGroup)) {
                log_warn(
                    `Forbidden: User '${authContext.username}' (ID: ${authContext.userId}) is not a member of the required '${requiredGroup}' group. User groups: ${authContext.cognitoGroups.join(', ')}`,
                    {},
                    correlationId
                );
                throw new Error('Forbidden');
            }
            
            // Step 3: Call the original handler if authorization succeeds.
            return await handler(event, authContext);

        } catch (error: any) {
            log_error(`Authorization error in Lambda middleware: ${error.message}`, { errorName: error.name, stack: error.stack }, correlationId);
            log_error(`Authorization error | event is : ${JSON.stringify(event)}`, {}, correlationId);

            if (error.message === 'Unauthorized') {
                return createApiGatewayResponse(
                    401,
                    buildErrorResponse('Unauthorized: Authentication token is missing or invalid.', 'UNAUTHORIZED'),
                    correlationId
                );
            } else if (error.message === 'Forbidden') {
                return createApiGatewayResponse(
                    403,
                    buildErrorResponse('Forbidden: You do not have access to this resource.', 'FORBIDDEN'),
                    correlationId
                );
            } else {
                return createApiGatewayResponse(
                    500,
                    buildErrorResponse('Internal Server Error: Failed to process authentication.', 'SERVER_ERROR'),
                    correlationId
                );
            }
        }
    };
}
