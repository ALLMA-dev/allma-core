import { type AdminPermission, type AdminRole } from '@allma/core-types';

export interface AdminAuthContext {
  userId: string;
  username: string;
  cognitoGroups: string[];
  roles: AdminRole[];
  permissions: AdminPermission[];
  hasPermission: (permission: AdminPermission) => boolean;
}