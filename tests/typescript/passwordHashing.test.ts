import { verify } from "argon2";
import { describe, expect, test } from "vitest";

import {
  defaultPasswordHashingConfig,
  hashPassword,
  resolvePasswordHashingConfig,
} from "../../src/typescript/index.js";

describe("password hashing", () => {
  test("hashes plaintext passwords as encoded argon2id hashes", async () => {
    const plaintextPassword = "synthetic-client-password-57";

    const passwordHash = await hashPassword(plaintextPassword);

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toBe(plaintextPassword);
    expect(passwordHash).not.toContain(plaintextPassword);
    await expect(verify(passwordHash, plaintextPassword)).resolves.toBe(true);
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
    expect(resolvePasswordHashingConfig({})).toEqual(
      defaultPasswordHashingConfig,
    );
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
