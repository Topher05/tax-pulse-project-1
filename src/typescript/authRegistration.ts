import { z } from "zod";

import { roleNameEnum, userStatusEnum } from "./shared/database/schema.js";

/**
 * Public registration is deliberately limited to identity and credential input.
 * Tenant membership, role, and account state are assigned by the service so a
 * caller cannot grant itself elevated access.
 */
const registrationCredentialsSchema = {
  email: z.email(),
  password: z.string().min(1),
};

export const registrationRequestSchema = z
  .strictObject({
    tenant_id: z.uuid().optional(),
    workspace_slug: z
      .string()
      .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
      .optional(),
    ...registrationCredentialsSchema,
  })
  .superRefine((request, context) => {
    if ((request.tenant_id === undefined) === (request.workspace_slug === undefined)) {
      context.addIssue({
        code: "custom",
        path: ["workspace_slug"],
        message: "Provide either workspace_slug or tenant_id, but not both.",
      });
    }
  });

export type RegistrationRequest = z.infer<typeof registrationRequestSchema>;
export type ResolvedRegistrationRequest = RegistrationRequest & { tenant_id: string };

export const registrationInitialAccountValues = {
  role: "Client",
  status: "invited",
} as const;

export const registrationAccountResponseSchema = z
  .object({
    id: z.uuid(),
    tenant_id: z.uuid(),
    email: z.email(),
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
