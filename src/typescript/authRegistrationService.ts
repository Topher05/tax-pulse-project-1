import { randomBytes, randomUUID } from "node:crypto";

import type { HashPasswordOptions } from "./passwordHashing.js";
import { hashPassword } from "./passwordHashing.js";
import {
  registrationInitialAccountValues,
  type RegistrationAccountResponse,
  type RegistrationAccountStore,
  type RegistrationRequest,
} from "./authRegistration.js";

export interface CreateRegistrationServiceOptions {
  store: RegistrationAccountStore;
  hashPasswordOptions?: HashPasswordOptions;
  createUserId?: () => string;
  createCredentialId?: () => string;
}

function createCredentialId(): string {
  return randomBytes(18).toString("base64url");
}

export function createRegistrationService({
  store,
  hashPasswordOptions,
  createUserId = randomUUID,
  createCredentialId: createNewCredentialId = createCredentialId,
}: CreateRegistrationServiceOptions): {
  register(input: RegistrationRequest): Promise<RegistrationAccountResponse>;
} {
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
