import { verify } from "argon2";
import { describe, expect, test } from "vitest";

import {
  authenticatePasswordForMfaChallenge,
  defaultPasswordHashingConfig,
  hashPassword,
  registerPasswordCredential,
  resolvePasswordHashingConfig,
  verifyPasswordHash,
} from "../../../src/typescript/index.js";
import {
  authEmail,
  authTenantId,
  authUserId,
  fastPasswordHashConfig,
  InMemoryCredentialStore,
} from "./auth.test.model.js";

describe("password hashing", () => {
  test("hashes plaintext passwords as encoded argon2id hashes", async () => {
    const plaintextPassword = "synthetic-client-password-57";

    const passwordHash = await hashPassword(plaintextPassword);

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toBe(plaintextPassword);
    expect(passwordHash).not.toContain(plaintextPassword);
    await expect(verify(passwordHash, plaintextPassword)).resolves.toBe(true);
    await expect(verifyPasswordHash(passwordHash, plaintextPassword)).resolves.toBe(true);
    await expect(verifyPasswordHash(passwordHash, "wrong-password")).resolves.toBe(false);
    await expect(
      verifyPasswordHash("not-an-argon2-hash", plaintextPassword),
    ).resolves.toBe(false);
  });

  test("parses configured argon2id work-factor overrides from the environment", () => {
    expect(
      resolvePasswordHashingConfig({
        TAXPULSE_ARGON2_MEMORY_COST_KIB: "32768",
        TAXPULSE_ARGON2_TIME_COST: "2",
        TAXPULSE_ARGON2_PARALLELISM: "1",
        TAXPULSE_ARGON2_HASH_LENGTH: "24",
        TAXPULSE_ARGON2_SALT_LENGTH: "12",
      }),
    ).toEqual({
      memoryCostKiB: 32_768,
      timeCost: 2,
      parallelism: 1,
      hashLength: 24,
      saltLength: 12,
    });
  });

  test("uses documented defaults when environment overrides are absent", () => {
    expect(resolvePasswordHashingConfig({})).toEqual(defaultPasswordHashingConfig);
  });

  test("rejects invalid work-factor environment overrides", () => {
    expect(() =>
      resolvePasswordHashingConfig({
        TAXPULSE_ARGON2_MEMORY_COST_KIB: "0",
      }),
    ).toThrow("TAXPULSE_ARGON2_MEMORY_COST_KIB must be a positive integer.");

    expect(() =>
      resolvePasswordHashingConfig({
        TAXPULSE_ARGON2_TIME_COST: "1.5",
      }),
    ).toThrow("TAXPULSE_ARGON2_TIME_COST must be a positive integer.");
  });
});

describe("password credential service", () => {
  test("hashes registration passwords before writing credential rows", async () => {
    const plaintextPassword = "synthetic-registration-password-57";
    const store = new InMemoryCredentialStore();

    const storedCredential = await registerPasswordCredential(
      {
        credentialId: "cm7zq8f4k0057a1b2c3d4e5f6",
        userId: authUserId,
        plaintextPassword,
      },
      store,
      { config: fastPasswordHashConfig },
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
        userId: authUserId,
        plaintextPassword: "synthetic-login-password-57",
      },
      new InMemoryCredentialStore(),
      { config: fastPasswordHashConfig },
    ).then((credential) => credential.passwordHash);
    const store = new InMemoryCredentialStore([
      {
        tenantId: authTenantId,
        email: authEmail,
        userId: authUserId,
        passwordHash,
      },
    ]);

    const result = await authenticatePasswordForMfaChallenge(
      {
        tenantId: authTenantId,
        email: authEmail,
        plaintextPassword: "synthetic-login-password-57",
      },
      store,
    );

    expect(result).toEqual({
      status: "mfa_challenge_required",
      tenantId: authTenantId,
      email: authEmail,
      userId: authUserId,
    });
    expect(result).not.toHaveProperty("token");
  });

  test("wrong passwords and unknown users return the same invalid credential result", async () => {
    const storedCredential = await registerPasswordCredential(
      {
        credentialId: "cm7zq8f4k0059a1b2c3d4e5f6",
        userId: authUserId,
        plaintextPassword: "synthetic-login-password-57",
      },
      new InMemoryCredentialStore(),
      { config: fastPasswordHashConfig },
    );
    const store = new InMemoryCredentialStore([
      {
        tenantId: authTenantId,
        email: authEmail,
        userId: storedCredential.userId,
        passwordHash: storedCredential.passwordHash,
      },
    ]);

    await expect(
      authenticatePasswordForMfaChallenge(
        {
          tenantId: authTenantId,
          email: authEmail,
          plaintextPassword: "wrong-password",
        },
        store,
      ),
    ).resolves.toEqual({ status: "invalid_credentials" });
    await expect(
      authenticatePasswordForMfaChallenge(
        {
          tenantId: authTenantId,
          email: "unknown@example.com",
          plaintextPassword: "synthetic-login-password-57",
        },
        store,
      ),
    ).resolves.toEqual({ status: "invalid_credentials" });
  });
});
