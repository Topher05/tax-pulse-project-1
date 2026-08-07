import { z } from "zod";

export const firmUserRoleSchema = z.enum([
  "Firm Admin",
  "Advisor",
  "Client",
  "TaxPulse Platform Admin",
]);

export const firmUserStatusSchema = z.enum(["Active", "Inactive"]);

export const firmUserRowSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  role: firmUserRoleSchema,
  status: firmUserStatusSchema,
  lastLoginAt: z.string().datetime().nullable(),
});

export const firmUsersListResponseSchema = z.array(firmUserRowSchema);

export type FirmUserRole = z.infer<typeof firmUserRoleSchema>;
export type FirmUserStatus = z.infer<typeof firmUserStatusSchema>;
export type FirmUserRow = z.infer<typeof firmUserRowSchema>;
export type FirmUsersListResponse = z.infer<typeof firmUsersListResponseSchema>;
