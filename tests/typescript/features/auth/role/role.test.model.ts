import { z } from "zod";

export const expectedRoleColumns = ["id", "role"];
export const expectedRoleColumnTypes = {
  id: "integer",
  role: "USER-DEFINED",
} as const;

export const roleRows = [
  { id: 1, role: "Firm Admin" },
  { id: 2, role: "Advisor" },
  { id: 3, role: "Client" },
  { id: 4, role: "TaxPulse Platform Admin" },
] as const;

export const roleRowSchema = z.object({
  id: z.number().int(),
  role: z.enum(["Firm Admin", "Advisor", "Client", "TaxPulse Platform Admin"]),
});

export const roleRowsSchema = z.array(roleRowSchema);
