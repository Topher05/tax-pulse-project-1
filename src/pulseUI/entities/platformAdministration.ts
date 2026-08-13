import type { FirmUserRole, FirmUserStatus, RelativeLastLogin } from "./firmUsers.ts";

export type PlatformPermissionAccess = "Full" | "Scoped" | "Edit";

export type PlatformPermissionRole = FirmUserRole;

export interface PlatformPermissionMatrixRow {
  feature: string;
  access: Record<PlatformPermissionRole, PlatformPermissionAccess | null>;
}

export interface PlatformPermissionMatrixSection {
  id: string;
  title: string;
  description?: string;
  roles: readonly PlatformPermissionRole[];
  rows: readonly PlatformPermissionMatrixRow[];
}

export interface PlatformAuditLogEntry {
  id: string;
  occurredAt: string;
  user: string;
  role: FirmUserRole | null;
  action: string;
  resource: string;
}

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
