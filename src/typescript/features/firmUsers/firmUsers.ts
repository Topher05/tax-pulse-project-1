import { z } from "zod";

export const firmUserRoleSchema = z.enum([
  "Firm Admin",
  "Advisor",
  "Client",
  "TaxPulse Platform Admin",
]);
export const firmUserAssignableRoleSchema = z.enum([
  "Firm Admin",
  "Advisor",
  "Client",
]);

export const firmUserStatusSchema = z.enum(["Active", "Inactive"]);

export const firmUserRowSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  role: firmUserRoleSchema,
  status: firmUserStatusSchema,
  lastLoginAt: z.iso.datetime().nullable(),
});

export const firmUserRoleUpdateParamsSchema = z.object({
  userId: z.uuid(),
});

export const firmUserRoleUpdateRequestSchema = z.object({
  role: firmUserAssignableRoleSchema,
});

export const firmUsersListResponseSchema = z.array(firmUserRowSchema);

export type FirmUserRole = z.infer<typeof firmUserRoleSchema>;
export type FirmUserAssignableRole = z.infer<typeof firmUserAssignableRoleSchema>;
export type FirmUserStatus = z.infer<typeof firmUserStatusSchema>;
export type FirmUserRow = z.infer<typeof firmUserRowSchema>;
export type FirmUserRoleUpdateParams = z.infer<typeof firmUserRoleUpdateParamsSchema>;
export type FirmUserRoleUpdateRequest = z.infer<typeof firmUserRoleUpdateRequestSchema>;
export type FirmUsersListResponse = z.infer<typeof firmUsersListResponseSchema>;
