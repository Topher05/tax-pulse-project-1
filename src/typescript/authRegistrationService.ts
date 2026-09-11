import { randomBytes, randomUUID } from "node:crypto";

import type { HashPasswordOptions } from "./passwordHashing.js";
import { hashPassword } from "./passwordHashing.js";
import {
  registrationInitialAccountValues,
  type RegistrationAccountResponse,
  type RegistrationAccountStore,
  type ResolvedRegistrationRequest,
} from "./authRegistration.js";

export interface CreateRegistrationServiceOptions {
  store: RegistrationAccountStore;
  hashPasswordOptions?: HashPasswordOptions;
  createUserId?: () => string;
  createCredentialId?: () => string;
}

export interface RegistrationService {
  register(input: ResolvedRegistrationRequest): Promise<RegistrationAccountResponse>;
}

function createCredentialId(): string {
  return randomBytes(18).toString("base64url");
}

export function createRegistrationService({
  store,
  hashPasswordOptions,
  createUserId = randomUUID,
  createCredentialId: createNewCredentialId = createCredentialId,
}: CreateRegistrationServiceOptions): RegistrationService {
  return {
    async register(input) {
      const passwordHash = await hashPassword(input.password, hashPasswordOptions);

      return await store.createRegistrationAccount({
        id: createUserId(),
        tenantId: input.tenant_id,
        email: input.email,
        role: registrationInitialAccountValues.role,
        status: registrationInitialAccountValues.status,
        credentialId: createNewCredentialId(),
        passwordHash,
      });
    },
  };
}
