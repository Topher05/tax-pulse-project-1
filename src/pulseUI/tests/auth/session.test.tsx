import { describe, expect, test } from "vitest";

import {
  createAuthenticatedSession,
  parseAccessTokenClaims,
  type IssuedTokenResponse,
} from "../../auth/session.ts";

function createAccessToken(claims: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(claims)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}.signature`;
}

function createTokenResponse(
  accessToken = createAccessToken({
    sub: "user-synthetic-001",
    role: "Advisor",
    tenant_id: "tenant-synthetic-001",
    exp: 1_800_000_000,
  }),
): IssuedTokenResponse {
  return {
    access_token: accessToken,
    refresh_token: "synthetic-refresh-token",
    token_type: "Bearer",
    expires_in: 900,
    refresh_expires_in: 2_592_000,
  };
}

describe("auth session contract", () => {
  test("maps trusted-shaped access-token identity claims into a browser session", () => {
    const session = createAuthenticatedSession(createTokenResponse(), 100_000);

    expect(session).toEqual({
      accessToken: expect.any(String),
      accessTokenExpiresAt: 1_000_000,
      refreshTokenExpiresAt: 2_592_100_000,
      user: {
        userId: "user-synthetic-001",
        role: "Advisor",
        tenantId: "tenant-synthetic-001",
      },
    });
    expect(session).not.toHaveProperty("refreshToken");
  });

  test("rejects malformed tokens and unsupported roles", () => {
    expect(parseAccessTokenClaims("not-a-jwt")).toBeNull();
    expect(
      parseAccessTokenClaims(
        createAccessToken({
          sub: "user-synthetic-001",
          role: "Unrecognized role",
          tenant_id: "tenant-synthetic-001",
          exp: 1_800_000_000,
        }),
      ),
    ).toBeNull();
  });

  test("rejects incomplete or invalid issued-token responses", () => {
    expect(
      createAuthenticatedSession({
        ...createTokenResponse(),
        expires_in: 0,
      }),
    ).toBeNull();
    expect(
      createAuthenticatedSession({
        ...createTokenResponse(),
        token_type: "bearer" as "Bearer",
      }),
    ).toBeNull();
  });
});
