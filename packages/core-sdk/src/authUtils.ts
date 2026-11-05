import type {
    APIGatewayProxyEventV2,
    APIGatewayProxyEventV2WithJWTAuthorizer,
    APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import * as crypto from 'node:crypto';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { buildErrorResponse, createApiGatewayResponse } from './apiResponseBuilder.js';
import { AdminPermission, AdminRole, AdminUserPermissionsSchema, ENV_VAR_NAMES, getDefaultPermissionsForRole, isInCognitoGroup } from '@allma/core-types';
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

// --- Public trigger / resume route authentication ---------------------------------------------
//
// The flow-trigger (`POST /allma/flows/{flowId}/trigger`) and resume (`POST /allma/resume`) routes
// are not Cognito-protected. They are authenticated either by AWS IAM (SigV4, enforced at the
// gateway, surfacing an `iam` authorizer context) or — when a caller secret is configured via
// ALLMA_WEBHOOK_API_KEY_SECRET_ARN — by a secret presented in an `x-api-key` / `Authorization:
// Bearer` header that this module verifies against Secrets Manager. `finalize-flow` resumes a
// waiting flow internally and signs that call with an HMAC over the body so it is recognised as a
// trusted system principal.

const ALLMA_ORCHESTRATION_ROLE_MARKER = 'AllmaOrchestrationLambdaRole';
const SYSTEM_RESUME_SIGNATURE_HEADER = 'x-allma-system-resume-signature';
const OWNER_PRINCIPAL_HEADER = 'x-allma-owner-principal';

const secretsManagerClient = new SecretsManagerClient({});
let cachedWebhookSecret: { arn: string; value: string } | undefined;

export interface TriggerOrResumeAuthSuccess {
    authenticated: true;
    principal: string;
    isSystem: boolean;
}

export interface TriggerOrResumeAuthFailure {
    authenticated: false;
    response: APIGatewayProxyStructuredResultV2;
}

export type TriggerOrResumeAuthResult = TriggerOrResumeAuthSuccess | TriggerOrResumeAuthFailure;

/** A 401 response for a missing/invalid credential on a trigger or resume request. */
function unauthorized(correlationId?: string): TriggerOrResumeAuthFailure {
    return {
        authenticated: false,
        response: createApiGatewayResponse(
            401,
            buildErrorResponse('Unauthorized: Missing valid authentication credentials.', 'UNAUTHORIZED'),
            correlationId,
        ) as APIGatewayProxyStructuredResultV2,
    };
}

/** Fetch and cache the raw webhook caller secret string for a given ARN. */
async function getWebhookSecretString(secretArn: string): Promise<string | undefined> {
    if (cachedWebhookSecret?.arn === secretArn) {
        return cachedWebhookSecret.value;
    }
    const res = await secretsManagerClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
    const value = res.SecretString;
    if (value) {
        cachedWebhookSecret = { arn: secretArn, value };
    }
    return value;
}

/** Normalize an STS assumed-role ARN to its underlying IAM role ARN; pass other identifiers through. */
function normalizeCallerArn(userArn: string | undefined, accountId: string | undefined): string {
    const raw = userArn || accountId || '';
    const assumedRoleMatch = raw.match(/^arn:aws:sts::(\d+):assumed-role\/([^/]+)\/.+$/);
    if (assumedRoleMatch) {
        const [, account, roleName] = assumedRoleMatch;
        return `arn:aws:iam::${account}:role/${roleName}`;
    }
    return raw;
}

/** Constant-time comparison of two UTF-8 strings that tolerates length differences. */
function timingSafeStringEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) {
        // Still run a comparison against a same-length buffer to avoid leaking length via timing.
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

/** Extract an `x-api-key` header or `Authorization: Bearer <token>` token from the event. */
function extractCallerToken(event: APIGatewayProxyEventV2): string | undefined {
    const headers = event.headers || {};
    const apiKey = headers['x-api-key'] || headers['X-Api-Key'];
    if (apiKey) return apiKey;
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader) {
        const match = authHeader.match(/^Bearer\s+(.+)$/i);
        if (match) return match[1];
    }
    return undefined;
}

/**
 * Compare a presented caller token against the configured secret. The secret may be a plain string
 * (one shared secret) or a JSON map of `{ [callerId]: secret }`. Returns the resolved principal on
 * a match, or `undefined` on mismatch.
 */
function matchCallerToken(token: string, rawSecret: string): string | undefined {
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawSecret);
    } catch {
        parsed = undefined;
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [callerId, secret] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof secret === 'string' && timingSafeStringEqual(token, secret)) {
                return `webhook-secret:${callerId}`;
            }
        }
        return undefined;
    }

    return timingSafeStringEqual(token, rawSecret) ? 'webhook-secret:default' : undefined;
}

/**
 * Authenticate a request to the public flow-trigger or resume route.
 *
 * Resolution order:
 * 1. An IAM (SigV4) authorizer context on the event — the default gateway posture. The caller ARN
 *    is normalized; the Allma orchestration role is recognised as a trusted system principal and
 *    may name the real owner via the `x-allma-owner-principal` header.
 * 2. Otherwise a caller secret, required via ALLMA_WEBHOOK_API_KEY_SECRET_ARN. The internal system
 *    resume signs the body (`x-allma-system-resume-signature`); other callers present the secret in
 *    `x-api-key` / `Authorization: Bearer`.
 *
 * Returns either an authenticated principal or a ready-to-return 401 response.
 */
export async function verifyTriggerOrResumeAuth(
    event: APIGatewayProxyEventV2,
    correlationId?: string,
): Promise<TriggerOrResumeAuthResult> {
    const iamContext = (event.requestContext as any)?.authorizer?.iam;

    if (iamContext && (iamContext.userArn || iamContext.accountId)) {
        const callerArn = normalizeCallerArn(iamContext.userArn, iamContext.accountId);
        const isSystem = callerArn.includes(ALLMA_ORCHESTRATION_ROLE_MARKER);
        const ownerHeader = event.headers?.[OWNER_PRINCIPAL_HEADER];
        const principal = isSystem && ownerHeader ? ownerHeader : callerArn;
        log_debug('Trigger/resume request authenticated via IAM authorizer.', { principal, isSystem }, correlationId);
        return { authenticated: true, principal, isSystem };
    }

    const secretArn = process.env[ENV_VAR_NAMES.ALLMA_WEBHOOK_API_KEY_SECRET_ARN];
    if (!secretArn) {
        log_warn('Trigger/resume request rejected: no IAM authorizer context and no caller secret configured.', {}, correlationId);
        return unauthorized(correlationId);
    }

    let rawSecret: string | undefined;
    try {
        rawSecret = await getWebhookSecretString(secretArn);
    } catch (error: any) {
        log_error('Failed to read the webhook caller secret from Secrets Manager.', { secretArn, error: error.message }, correlationId);
        rawSecret = undefined;
    }

    if (!rawSecret) {
        return unauthorized(correlationId);
    }

    // Internal system resume: finalize-flow signs the body with the shared secret.
    const signatureHeader = event.headers?.[SYSTEM_RESUME_SIGNATURE_HEADER];
    if (signatureHeader) {
        const expected = `sha256=${crypto.createHmac('sha256', rawSecret).update(event.body || '', 'utf-8').digest('hex')}`;
        if (timingSafeStringEqual(signatureHeader, expected)) {
            const principal = event.headers?.[OWNER_PRINCIPAL_HEADER] || 'system:finalize-flow';
            log_debug('Trigger/resume request authenticated via system resume signature.', { principal }, correlationId);
            return { authenticated: true, principal, isSystem: true };
        }
        log_warn('Trigger/resume request presented an invalid system resume signature.', {}, correlationId);
        return unauthorized(correlationId);
    }

    const token = extractCallerToken(event);
    if (!token) {
        return unauthorized(correlationId);
    }

    const principal = matchCallerToken(token, rawSecret);
    if (!principal) {
        log_warn('Trigger/resume request presented an invalid caller secret.', {}, correlationId);
        return unauthorized(correlationId);
    }

    log_debug('Trigger/resume request authenticated via caller secret.', { principal }, correlationId);
    return { authenticated: true, principal, isSystem: false };
}

/** Pick the plain secret, or the first secret in a `{ [callerId]: secret }` JSON map. */
function pickWebhookApiKey(rawSecret: string): string | undefined {
    try {
        const parsed = JSON.parse(rawSecret);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const first = Object.values(parsed as Record<string, unknown>).find((v) => typeof v === 'string');
            return typeof first === 'string' ? first : undefined;
        }
    } catch {
        // Not JSON — treat the whole string as the secret below.
    }
    return rawSecret;
}

const uriEncode = (value: string): string =>
    encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

function hmac(key: crypto.BinaryLike, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data, 'utf-8').digest();
}

/**
 * Compute AWS SigV4 headers for a `POST` of `bodyString` to `url` against `execute-api`. Returns the
 * `Authorization`, `X-Amz-Date`, `X-Amz-Content-Sha256` (and `X-Amz-Security-Token` for temporary
 * credentials) headers. Implemented directly on `node:crypto` to avoid pulling in a signer.
 */
function computeSigV4Headers(url: string, bodyString: string): Record<string, string> {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!;
    const sessionToken = process.env.AWS_SESSION_TOKEN;
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
    const service = 'execute-api';

    const parsed = new URL(url);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const canonicalUri = parsed.pathname
        .split('/')
        .map((segment) => uriEncode(decodeURIComponent(segment)))
        .join('/') || '/';
    const canonicalQuerystring = '';
    const payloadHash = crypto.createHash('sha256').update(bodyString, 'utf-8').digest('hex');

    const headers: Record<string, string> = {
        host: parsed.host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
    };
    if (sessionToken) {
        headers['x-amz-security-token'] = sessionToken;
    }

    const sortedHeaderKeys = Object.keys(headers).sort();
    const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headers[k]}\n`).join('');
    const signedHeaders = sortedHeaderKeys.join(';');

    const canonicalRequest = ['POST', canonicalUri, canonicalQuerystring, canonicalHeaders, signedHeaders, payloadHash].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        crypto.createHash('sha256').update(canonicalRequest, 'utf-8').digest('hex'),
    ].join('\n');

    const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf-8').digest('hex');

    const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const result: Record<string, string> = {
        Authorization: authorization,
        'X-Amz-Date': amzDate,
        'X-Amz-Content-Sha256': payloadHash,
    };
    if (sessionToken) {
        result['X-Amz-Security-Token'] = sessionToken;
    }
    return result;
}

/**
 * Build the headers for the internal system resume call made by `finalize-flow` to
 * ALLMA_RESUME_API_URL. Attaches the owner principal, a webhook signature + `x-api-key` when a
 * caller secret is configured, and SigV4 headers when the Lambda has AWS credentials — so the
 * resume route authenticates the call under whichever posture the gateway is enforcing.
 */
export async function buildSystemResumeAuthHeaders(
    url: string,
    bodyString: string,
    ownerPrincipal?: string,
    correlationId?: string,
): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (ownerPrincipal) {
        headers[OWNER_PRINCIPAL_HEADER] = ownerPrincipal;
    }

    const secretArn = process.env[ENV_VAR_NAMES.ALLMA_WEBHOOK_API_KEY_SECRET_ARN];
    if (secretArn) {
        try {
            const rawSecret = await getWebhookSecretString(secretArn);
            if (rawSecret) {
                headers[SYSTEM_RESUME_SIGNATURE_HEADER] = `sha256=${crypto.createHmac('sha256', rawSecret).update(bodyString, 'utf-8').digest('hex')}`;
                const apiKey = pickWebhookApiKey(rawSecret);
                if (apiKey) {
                    headers['x-api-key'] = apiKey;
                }
            }
        } catch (error: any) {
            log_error('Failed to read the webhook caller secret while building system resume headers.', { secretArn, error: error.message }, correlationId);
        }
    }

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        try {
            Object.assign(headers, computeSigV4Headers(url, bodyString));
        } catch (error: any) {
            log_error('Failed to compute SigV4 headers for the system resume call.', { error: error.message }, correlationId);
        }
    }

    return headers;
}
