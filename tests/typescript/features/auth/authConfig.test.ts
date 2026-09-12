import { describe, expect, test } from "vitest";

import {
  getJwtConfigFromEnv,
  getTenantLoginBaseDomainFromEnv,
} from "../../../../src/typescript/features/auth/infrastructure/authConfig.js";

const validEnvironment: NodeJS.ProcessEnv = {
  JWT_ISSUER: "https://auth.taxpulse.example",
};

describe("JWT configuration", () => {
  test("returns validated defaults for token lifetimes", () => {
    expect(getJwtConfigFromEnv(validEnvironment)).toEqual({
      issuer: "https://auth.taxpulse.example",
      jwksUrl: "https://auth.taxpulse.example/.well-known/jwks.json",
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

  test("uses a configured JWKS URL and ignores the retired signing-secret setting", () => {
    expect(
      getJwtConfigFromEnv({
        ...validEnvironment,
        JWT_JWKS_URL: "https://keys.taxpulse.example/current.json",
        JWT_SIGNING_SECRET: "retired-shared-secret",
      }),
    ).toMatchObject({
      jwksUrl: "https://keys.taxpulse.example/current.json",
    });
    expect(
      getJwtConfigFromEnv({
        ...validEnvironment,
        JWT_JWKS_URL: "https://keys.taxpulse.example/current.json",
        JWT_SIGNING_SECRET: "retired-shared-secret",
      }).signingSecret,
    ).toBeUndefined();
  });

  test("uses the legacy signing secret only without an explicit JWKS URL", () => {
    expect(
      getJwtConfigFromEnv({
        ...validEnvironment,
        JWT_SIGNING_SECRET: "local-test-secret",
      }).signingSecret,
    ).toBe("local-test-secret");
  });

  test.each([
    ["missing issuer", { ...validEnvironment, JWT_ISSUER: undefined }],
    ["malformed issuer", { ...validEnvironment, JWT_ISSUER: "not-a-url" }],
    ["malformed JWKS URL", { ...validEnvironment, JWT_JWKS_URL: "not-a-url" }],
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

describe("tenant login hostname configuration", () => {
  test("returns a trimmed deployment base domain when configured", () => {
    expect(
      getTenantLoginBaseDomainFromEnv({
        TAXPULSE_LOGIN_BASE_DOMAIN: "  staging.taxpulse.example  ",
      }),
    ).toBe("staging.taxpulse.example");
  });

  test("preserves the hostname parser default when omitted or blank", () => {
    expect(getTenantLoginBaseDomainFromEnv({})).toBeUndefined();
    expect(
      getTenantLoginBaseDomainFromEnv({ TAXPULSE_LOGIN_BASE_DOMAIN: "   " }),
    ).toBeUndefined();
  });
});
