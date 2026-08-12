import { z } from "zod";

import { firmUserRoleSchema, firmUserStatusSchema, firmUserRowSchema } from "../firmUsers/index.js";

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
