import { z } from "zod";

import { roleNameEnum, userStatusEnum } from "./shared/database/schema.js";

/**
 * Public registration is deliberately limited to identity and credential input.
 * Tenant membership, role, and account state are assigned by the service so a
 * caller cannot grant itself elevated access.
 */
export const registrationRequestSchema = z
  .object({
    tenant_id: z.string().uuid(),
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export type RegistrationRequest = z.infer<typeof registrationRequestSchema>;

export const registrationInitialAccountValues = {
  role: "Client",
  status: "invited",
} as const;

export const registrationAccountResponseSchema = z
  .object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(roleNameEnum.enumValues),
    status: z.enum(userStatusEnum.enumValues),
  })
  .strict();

export type RegistrationAccountResponse = z.infer<
  typeof registrationAccountResponseSchema
>;

export interface RegistrationAccountInsert {
  id: string;
  tenantId: string;
  email: string;
  role: RegistrationAccountResponse["role"];
  status: RegistrationAccountResponse["status"];
  credentialId: string;
  passwordHash: string;
}

export interface RegistrationAccountStore {
  createRegistrationAccount(
    input: RegistrationAccountInsert,
  ): Promise<RegistrationAccountResponse>;
}

export class RegistrationEmailConflictError extends Error {
  constructor() {
    super("An account with this email is already registered for the tenant.");
    this.name = "RegistrationEmailConflictError";
  }
}
