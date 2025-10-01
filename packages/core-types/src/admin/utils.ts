import { AdminPermission } from './permissions.js';

export const getAdminApiDomain = (stage: string): string => {
  return `admin-api.${stage}.example.com`;
};

export const withAdminAuth = (handler: any): any => {
  return handler;
};

export class AuthContext {
  get aaid(): string {
    return 'test-aaid';
  }
  get aat(): string {
    return 'test-aat';
  }
  get username(): string {
    return 'test-user';
  }
  get permissions(): AdminPermission[] {
    return [];
  }
  hasPermission(_: AdminPermission): boolean {
    return true;
  }
}

export const createApiGatewayResponse = (statusCode: number, body: any, correlationId?: string): any => {
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-Id': correlationId,
    },
    body: JSON.stringify(body),
  };
  return response;
};

export const buildSuccessResponse = (body: any): any => {
  return createApiGatewayResponse(200, body);
};

export const buildErrorResponse = (message: string, code: string, details?: any): any => {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };
};

export const offloadIfLarge = async (params: {
  data: any;
  bucketName: string;
  s3KeyPrefix: string;
  correlationId: string;
  sizeThresholdBytes: number;
}): Promise<any> => {
  return params.data;
};
