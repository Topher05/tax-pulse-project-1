import type { FirmUserRole, FirmUserStatus, RelativeLastLogin } from "./firmUsers.ts";

export interface PlatformTenantUserRow {
  id: string;
  name: string;
  email: string;
  role: FirmUserRole;
  status: FirmUserStatus;
  lastLogin: RelativeLastLogin;
}

export interface PlatformTenantUsersTenant {
  id: string;
  name: string;
  loginSlug: string;
  isActive: boolean;
  users: readonly PlatformTenantUserRow[];
}

export interface PlatformTenantUserCreateInput {
  tenantId: string;
  displayName: string;
  email: string;
  role: FirmUserRole;
  status: FirmUserStatus;
}
