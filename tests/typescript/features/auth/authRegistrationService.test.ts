import { verify } from "argon2";
import { describe, expect, test } from "vitest";

import {
  RegistrationEmailConflictError,
  createRegistrationService,
  type RegistrationAccountInsert,
  type RegistrationAccountResponse,
  type RegistrationAccountStore,
} from "../../../../src/typescript/index.js";
import { fastPasswordHashConfig } from "./core/auth.test.model.js";

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";
const credentialId = "cm7zq8f4k0060a1b2c3d4e5f6";
const password = "synthetic-registration-password";

class InMemoryRegistrationStore implements RegistrationAccountStore {
  readonly inserts: RegistrationAccountInsert[] = [];

  async createRegistrationAccount(
    input: RegistrationAccountInsert,
  ): Promise<RegistrationAccountResponse> {
    this.inserts.push(input);

    return {
      id: input.id,
      tenant_id: input.tenantId,
      email: input.email,
      role: input.role,
      status: input.status,
    };
  }
}

describe("registration service", () => {
  test("hashes the password and persists a least-privilege account atomically through its store", async () => {
    const store = new InMemoryRegistrationStore();
    const service = createRegistrationService({
      store,
      hashPasswordOptions: { config: fastPasswordHashConfig },
      createUserId: () => userId,
      createCredentialId: () => credentialId,
    });

    const account = await service.register({
      tenant_id: tenantId,
      email: "new-client@example.com",
      password,
    });

    expect(account).toEqual({
      id: userId,
      tenant_id: tenantId,
      email: "new-client@example.com",
      role: "Client",
      status: "invited",
    });
    expect(account).not.toHaveProperty("password");
    expect(account).not.toHaveProperty("passwordHash");
    expect(store.inserts).toHaveLength(1);
    expect(store.inserts[0]?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(store.inserts[0]?.passwordHash).not.toContain(password);
    await expect(verify(store.inserts[0]!.passwordHash, password)).resolves.toBe(true);
  });

  test("preserves an email conflict without exposing credential data", async () => {
    const store: RegistrationAccountStore = {
      createRegistrationAccount: async () => {
        throw new RegistrationEmailConflictError();
      },
    };
    const service = createRegistrationService({
      store,
      hashPasswordOptions: { config: fastPasswordHashConfig },
    });

    await expect(
      service.register({
        tenant_id: tenantId,
        email: "existing-client@example.com",
        password,
      }),
    ).rejects.toBeInstanceOf(RegistrationEmailConflictError);
  });
});
