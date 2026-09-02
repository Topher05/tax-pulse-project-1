import { z } from "zod";

import { firmUserRoleSchema, firmUserStatusSchema, firmUserRowSchema } from "../firmUsers/index.js";

export const platformPermissionAccessSchema = z.enum(["Full", "Scoped", "Edit"]);

export const platformPermissionMatrixRoleSchema = firmUserRoleSchema;

export const platformPermissionMatrixRowSchema = z.object({
  feature: z.string().min(1),
  access: z.record(platformPermissionMatrixRoleSchema, platformPermissionAccessSchema.nullable()),
});

export const platformPermissionMatrixSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  roles: z.array(platformPermissionMatrixRoleSchema).min(1),
  rows: z.array(platformPermissionMatrixRowSchema),
});

export const platformPermissionMatrixResponseSchema = z.array(
  platformPermissionMatrixSectionSchema,
);

export const platformAuditLogEntrySchema = z.object({
  id: z.uuid(),
  occurredAt: z.iso.datetime(),
  user: z.string().min(1),
  role: firmUserRoleSchema.nullable(),
  action: z.string().min(1),
  resource: z.string().min(1),
});

export const platformAuditLogResponseSchema = z.array(platformAuditLogEntrySchema);

export const platformTenantUserRowSchema = firmUserRowSchema;

export const platformTenantUsersTenantSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  loginSlug: z.string().min(1),
  isActive: z.boolean(),
  users: z.array(platformTenantUserRowSchema),
});

export const platformTenantUsersListResponseSchema = z.array(
  platformTenantUsersTenantSchema,
);

export const platformTenantUserCreateParamsSchema = z.object({
  tenantId: z.uuid(),
});

export const platformTenantUserCreateRequestSchema = z
  .object({
    displayName: z.string().trim().min(1),
    email: z.email(),
    role: firmUserRoleSchema,
    status: firmUserStatusSchema,
  })
  .strict();

export type PlatformTenantUserRow = z.infer<typeof platformTenantUserRowSchema>;
export type PlatformTenantUsersTenant = z.infer<typeof platformTenantUsersTenantSchema>;
export type PlatformTenantUsersListResponse = z.infer<
  typeof platformTenantUsersListResponseSchema
>;
export type PlatformTenantUserCreateParams = z.infer<
  typeof platformTenantUserCreateParamsSchema
>;
export type PlatformTenantUserCreateRequest = z.infer<
  typeof platformTenantUserCreateRequestSchema
>;
export type PlatformPermissionAccess = z.infer<typeof platformPermissionAccessSchema>;
export type PlatformPermissionMatrixRole = z.infer<typeof platformPermissionMatrixRoleSchema>;
export type PlatformPermissionMatrixRow = z.infer<typeof platformPermissionMatrixRowSchema>;
export type PlatformPermissionMatrixSection = z.infer<
  typeof platformPermissionMatrixSectionSchema
>;
export type PlatformPermissionMatrixResponse = z.infer<
  typeof platformPermissionMatrixResponseSchema
>;
export type PlatformAuditLogEntry = z.infer<typeof platformAuditLogEntrySchema>;
export type PlatformAuditLogResponse = z.infer<typeof platformAuditLogResponseSchema>;
