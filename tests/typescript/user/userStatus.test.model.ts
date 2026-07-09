import { z } from "zod";

export const expectedUserStatusColumns = ["id", "status"];
export const expectedUserStatusColumnTypes = {
  id: "integer",
  status: "USER-DEFINED",
} as const;

export const userStatusRows = [
  { id: 1, status: "invited" },
  { id: 2, status: "active" },
  { id: 3, status: "disabled" },
] as const;

export const userStatusRowSchema = z.object({
  id: z.number().int(),
  status: z.enum(["invited", "active", "disabled"]),
});

export const userStatusRowsSchema = z.array(userStatusRowSchema);
