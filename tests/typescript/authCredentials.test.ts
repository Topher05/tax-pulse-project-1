import { describe, expect, test } from "vitest";

import {
  authenticatePasswordForMfaChallenge,
  registerPasswordCredential,
  verifyPasswordHash,
  type PasswordCredentialLoginRecord,
  type PasswordCredentialReader,
  type PasswordCredentialWriter,
  type StoredPasswordCredential,
} from "../../src/typescript/index.js";

const fastHashConfig = {
  memoryCostKiB: 4_096,
  timeCost: 2,
  parallelism: 1,
  hashLength: 24,
  saltLength: 12,
};

class InMemoryCredentialStore implements PasswordCredentialWriter, PasswordCredentialReader {
  readonly credentials: StoredPasswordCredential[] = [];

  constructor(private readonly loginRecords: PasswordCredentialLoginRecord[] = []) {}

  async createPasswordCredential(
    credential: StoredPasswordCredential,
  ): Promise<StoredPasswordCredential> {
    this.credentials.push(credential);
    return credential;
  }

  async findPasswordCredentialByEmail(input: {
    tenantId: string;
    email: string;
  }): Promise<PasswordCredentialLoginRecord | null> {
    return (
      this.loginRecords.find(
        (record) => record.tenantId === input.tenantId && record.email === input.email,
      ) ?? null
    );
  }
}

describe("auth credentials", () => {
  test("hashes registration passwords before writing credential rows", async () => {
    const plaintextPassword = "synthetic-registration-password-57";
    const store = new InMemoryCredentialStore();

    const storedCredential = await registerPasswordCredential(
      {
        credentialId: "cm7zq8f4k0057a1b2c3d4e5f6",
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d57",
        plaintextPassword,
      },
      store,
      { config: fastHashConfig },
    );

    expect(store.credentials).toEqual([storedCredential]);
    expect(Object.keys(storedCredential).sort()).toEqual([
      "id",
      "passwordHash",
      "userId",
    ]);
    expect(storedCredential.passwordHash).toMatch(/^\$argon2id\$/);
    expect(storedCredential.passwordHash).not.toBe(plaintextPassword);
    expect(storedCredential.passwordHash).not.toContain(plaintextPassword);
    expect(storedCredential).not.toHaveProperty("plaintextPassword");
    await expect(
      verifyPasswordHash(storedCredential.passwordHash, plaintextPassword),
    ).resolves.toBe(true);
  });

  test("valid password authentication returns an MFA challenge state without a token", async () => {
    const passwordHash = await registerPasswordCredential(
      {
        credentialId: "cm7zq8f4k0058a1b2c3d4e5f6",
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d58",
        plaintextPassword: "synthetic-login-password-57",
      },
      new InMemoryCredentialStore(),
      { config: fastHashConfig },
    ).then((credential) => credential.passwordHash);
    const store = new InMemoryCredentialStore([
      {
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        email: "alex@example.com",
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d58",
        passwordHash,
      },
    ]);

    const result = await authenticatePasswordForMfaChallenge(
      {
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        email: "alex@example.com",
        plaintextPassword: "synthetic-login-password-57",
      },
      store,
    );

    expect(result).toEqual({
      status: "mfa_challenge_required",
      tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
      email: "alex@example.com",
      userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d58",
    });
    expect(result).not.toHaveProperty("token");
  });

  test("wrong passwords and unknown users return the same invalid credential result", async () => {
    const storedCredential = await registerPasswordCredential(
      {
        credentialId: "cm7zq8f4k0059a1b2c3d4e5f6",
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d59",
        plaintextPassword: "synthetic-login-password-57",
      },
      new InMemoryCredentialStore(),
      { config: fastHashConfig },
    );
    const store = new InMemoryCredentialStore([
      {
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        email: "alex@example.com",
        userId: storedCredential.userId,
        passwordHash: storedCredential.passwordHash,
      },
    ]);

    await expect(
      authenticatePasswordForMfaChallenge(
        {
          tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
          email: "alex@example.com",
          plaintextPassword: "wrong-password",
        },
        store,
      ),
    ).resolves.toEqual({ status: "invalid_credentials" });
    await expect(
      authenticatePasswordForMfaChallenge(
        {
          tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
          email: "unknown@example.com",
          plaintextPassword: "synthetic-login-password-57",
        },
        store,
      ),
    ).resolves.toEqual({ status: "invalid_credentials" });
  });
});
