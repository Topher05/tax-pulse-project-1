import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import { caseApiGetJson, caseApiSendJson } from "../shared/caseApi.ts";
import type {
  FirmUserRole,
  FirmUserStatus,
  RelativeLastLogin,
} from "./firmUsers.ts";
import type {
  PlatformAuditLogEntry,
  PlatformPermissionMatrixSection,
  PlatformTenantUserCreateInput,
  PlatformTenantUserRow,
  PlatformTenantUsersTenant,
} from "./platformAdministration.ts";

const platformUserRoleSchema = z.enum([
  "Firm Admin",
  "Advisor",
  "Client",
  "TaxPulse Platform Admin",
]);
const platformUserStatusSchema = z.enum(["Active", "Inactive"]);
const platformTenantUserApiRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: platformUserRoleSchema,
  status: platformUserStatusSchema,
  lastLoginAt: z.string().datetime().nullable(),
});
const platformTenantUsersTenantApiSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  loginSlug: z.string().min(1),
  isActive: z.boolean(),
  users: z.array(platformTenantUserApiRowSchema),
});
const platformTenantUsersResponseSchema = z.array(platformTenantUsersTenantApiSchema);
const platformPermissionAccessSchema = z.enum(["Full", "Scoped", "Edit"]);
const platformPermissionMatrixRowSchema = z.object({
  feature: z.string().min(1),
  access: z.record(platformUserRoleSchema, platformPermissionAccessSchema.nullable()),
});
const platformPermissionMatrixSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  roles: z.array(platformUserRoleSchema),
  rows: z.array(platformPermissionMatrixRowSchema),
});
const platformPermissionMatrixResponseSchema = z.array(platformPermissionMatrixSectionSchema);
const platformAuditLogEntrySchema = z.object({
  id: z.string().min(1),
  occurredAt: z.string().datetime(),
  user: z.string().min(1),
  role: platformUserRoleSchema.nullable(),
  action: z.string().min(1),
  resource: z.string().min(1),
});
const platformAuditLogResponseSchema = z.array(platformAuditLogEntrySchema);
const platformTenantUserCreateRequestSchema = z.object({
  displayName: z.string().trim().min(1),
  email: z.string().email(),
  role: platformUserRoleSchema,
  status: platformUserStatusSchema,
});

type PlatformTenantUserApiRow = z.infer<typeof platformTenantUserApiRowSchema>;
type PlatformTenantUsersTenantApi = z.infer<typeof platformTenantUsersTenantApiSchema>;

export const platformTenantUsersQueryKey = ["platformAdministration", "tenantsUsers"] as const;
export const platformRolesPermissionsQueryKey = [
  "platformAdministration",
  "rolesPermissions",
] as const;
export const platformAuditLogQueryKey = ["platformAdministration", "auditLog"] as const;

function formatLastLoginDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function toRelativeLastLogin(lastLoginAt: string | null): RelativeLastLogin {
  if (lastLoginAt === null) {
    return { kind: "date", value: "Never" };
  }

  return { kind: "date", value: formatLastLoginDate(lastLoginAt) };
}

function toPlatformTenantUserRow(row: PlatformTenantUserApiRow): PlatformTenantUserRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as FirmUserRole,
    status: row.status as FirmUserStatus,
    lastLogin: toRelativeLastLogin(row.lastLoginAt),
  };
}

function toPlatformTenantUsersTenant(
  tenant: PlatformTenantUsersTenantApi,
): PlatformTenantUsersTenant {
  return {
    id: tenant.id,
    name: tenant.name,
    loginSlug: tenant.loginSlug,
    isActive: tenant.isActive,
    users: tenant.users.map(toPlatformTenantUserRow),
  };
}

export async function fetchPlatformTenantUsers(
  fetcher?: typeof fetch,
): Promise<readonly PlatformTenantUsersTenant[]> {
  const payload = await caseApiGetJson<unknown>("/v1/administration/tenants-users", fetcher);
  return platformTenantUsersResponseSchema.parse(payload).map(toPlatformTenantUsersTenant);
}

export async function fetchPlatformRolesPermissions(
  fetcher?: typeof fetch,
): Promise<readonly PlatformPermissionMatrixSection[]> {
  const payload = await caseApiGetJson<unknown>("/v1/administration/roles-permissions", fetcher);
  return platformPermissionMatrixResponseSchema.parse(payload);
}

export async function fetchPlatformAuditLog(
  fetcher?: typeof fetch,
): Promise<readonly PlatformAuditLogEntry[]> {
  const payload = await caseApiGetJson<unknown>("/v1/administration/audit-log", fetcher);
  return platformAuditLogResponseSchema.parse(payload);
}

export async function createPlatformTenantUser(
  input: PlatformTenantUserCreateInput,
  fetcher?: typeof fetch,
): Promise<PlatformTenantUserRow> {
  const body = platformTenantUserCreateRequestSchema.parse({
    displayName: input.displayName,
    email: input.email,
    role: input.role,
    status: input.status,
  });
  const payload = await caseApiSendJson<unknown>(
    `/v1/administration/tenants/${input.tenantId}/users`,
    {
      method: "POST",
      body,
    },
    fetcher,
  );

  return toPlatformTenantUserRow(platformTenantUserApiRowSchema.parse(payload));
}

export function usePlatformTenantUsersQuery() {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: platformTenantUsersQueryKey,
    queryFn: () => fetchPlatformTenantUsers(authenticatedFetch),
  });
}

export function usePlatformRolesPermissionsQuery() {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: platformRolesPermissionsQueryKey,
    queryFn: () => fetchPlatformRolesPermissions(authenticatedFetch),
  });
}

export function usePlatformAuditLogQuery() {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: platformAuditLogQueryKey,
    queryFn: () => fetchPlatformAuditLog(authenticatedFetch),
  });
}

export function useCreatePlatformTenantUserMutation() {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlatformTenantUserCreateInput) =>
      createPlatformTenantUser(input, authenticatedFetch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: platformTenantUsersQueryKey });
    },
  });
}
