import { describe, expect, test } from "vitest";

import { getJwtConfigFromEnv } from "../../src/typescript/authConfig.js";

const validEnvironment: NodeJS.ProcessEnv = {
  JWT_ISSUER: "https://auth.taxpulse.example",
  JWT_SIGNING_SECRET: "a-unique-test-secret-that-is-more-than-32-bytes",
};

describe("JWT configuration", () => {
  test("returns validated defaults for token lifetimes", () => {
    expect(getJwtConfigFromEnv(validEnvironment)).toEqual({
      issuer: "https://auth.taxpulse.example",
      signingSecret: "a-unique-test-secret-that-is-more-than-32-bytes",
      accessTokenLifetimeSeconds: 900,
      refreshTokenLifetimeSeconds: 2_592_000,
    });
  });

  test("accepts configured token lifetimes", () => {
    expect(
      getJwtConfigFromEnv({
        ...validEnvironment,
        JWT_ACCESS_TOKEN_TTL_SECONDS: "600",
        JWT_REFRESH_TOKEN_TTL_SECONDS: "1200",
      }),
    ).toMatchObject({
      accessTokenLifetimeSeconds: 600,
      refreshTokenLifetimeSeconds: 1200,
    });
  });

  test.each([
    ["missing issuer", { ...validEnvironment, JWT_ISSUER: undefined }],
    ["malformed issuer", { ...validEnvironment, JWT_ISSUER: "not-a-url" }],
    ["missing secret", { ...validEnvironment, JWT_SIGNING_SECRET: undefined }],
    ["short secret", { ...validEnvironment, JWT_SIGNING_SECRET: "too-short" }],
    [
      "non-integer access lifetime",
      { ...validEnvironment, JWT_ACCESS_TOKEN_TTL_SECONDS: "60.5" },
    ],
    [
      "refresh lifetime not longer than access lifetime",
      {
        ...validEnvironment,
        JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
        JWT_REFRESH_TOKEN_TTL_SECONDS: "900",
      },
    ],
  ])("rejects %s", (_description, environment) => {
    expect(() => getJwtConfigFromEnv(environment)).toThrow();
  });
});
