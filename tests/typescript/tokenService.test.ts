import { createHash } from "node:crypto";

import { decodeProtectedHeader, jwtVerify } from "jose";
import { describe, expect, test } from "vitest";

import type { JwtConfig } from "../../src/typescript/authConfig.js";
import type { AuthenticatedPrincipal } from "../../src/typescript/authTypes.js";
import type {
  PersistRefreshTokenInput,
  RefreshTokenRepository,
  RevokeRefreshTokenByHashInput,
} from "../../src/typescript/refreshTokenRepository.js";
import { createTokenService } from "../../src/typescript/tokenService.js";

const config: JwtConfig = {
  issuer: "https://auth.taxpulse.example",
  signingSecret: "a-unique-test-secret-that-is-more-than-32-bytes",
  accessTokenLifetimeSeconds: 900,
  refreshTokenLifetimeSeconds: 2_592_000,
};
const principal: AuthenticatedPrincipal = {
  userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
  role: "Advisor",
  tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
};
const issuedAt = new Date("2026-07-16T12:00:00.500Z");

function createRepository(): {
  repository: RefreshTokenRepository;
  persisted: PersistRefreshTokenInput[];
  revoked: RevokeRefreshTokenByHashInput[];
} {
  const persisted: PersistRefreshTokenInput[] = [];
  const revoked: RevokeRefreshTokenByHashInput[] = [];

  return {
    persisted,
    revoked,
    repository: {
      async persist(input) {
        persisted.push(input);
      },
      async revokeByTokenHash(input) {
        revoked.push(input);
        return true;
      },
    },
  };
}

describe("token service", () => {
  test("issues a signed access JWT and stores only the refresh-token hash", async () => {
    const state = createRepository();
    const tokenService = createTokenService({
      config,
      refreshTokenRepository: state.repository,
      now: () => issuedAt,
      randomBytes: () => Buffer.alloc(32, 7),
    });

    const pair = await tokenService.issue(principal);
    const verified = await jwtVerify(
      pair.accessToken,
      new TextEncoder().encode(config.signingSecret),
      { issuer: config.issuer, currentDate: issuedAt },
    );

    expect(decodeProtectedHeader(pair.accessToken)).toMatchObject({ alg: "HS256" });
    expect(verified.payload).toMatchObject({
      sub: principal.userId,
      role: principal.role,
      tenant_id: principal.tenantId,
      iss: config.issuer,
      iat: Math.floor(issuedAt.getTime() / 1000),
      exp: Math.floor(issuedAt.getTime() / 1000) + 900,
    });
    expect(pair.accessTokenExpiresAt).toEqual(new Date("2026-07-16T12:15:00.000Z"));
    expect(pair.refreshTokenExpiresAt).toEqual(new Date("2026-08-15T12:00:00.000Z"));
    expect(pair.accessTokenExpiresInSeconds).toBe(900);
    expect(pair.refreshTokenExpiresInSeconds).toBe(2_592_000);
    expect(state.persisted).toEqual([
      {
        userId: principal.userId,
        tokenHash: createHash("sha256").update(pair.refreshToken).digest("hex"),
        issuedAt: new Date("2026-07-16T12:00:00.000Z"),
        expiresAt: new Date("2026-08-15T12:00:00.000Z"),
      },
    ]);
    expect(state.persisted[0]?.tokenHash).not.toBe(pair.refreshToken);
  });

  test("does not return a token pair when refresh-token persistence fails", async () => {
    const tokenService = createTokenService({
      config,
      refreshTokenRepository: {
        async persist() {
          throw new Error("database unavailable");
        },
        async revokeByTokenHash() {
          return false;
        },
      },
      now: () => issuedAt,
      randomBytes: () => Buffer.alloc(32, 7),
    });

    await expect(tokenService.issue(principal)).rejects.toThrow("database unavailable");
  });

  test("hashes a bearer refresh token before requesting revocation", async () => {
    const state = createRepository();
    const tokenService = createTokenService({
      config,
      refreshTokenRepository: state.repository,
      now: () => issuedAt,
    });

    await expect(tokenService.revokeRefreshToken("synthetic-refresh-token")).resolves.toBe(true);
    expect(state.revoked).toEqual([
      {
        tokenHash: createHash("sha256")
          .update("synthetic-refresh-token")
          .digest("hex"),
        revokedAt: new Date("2026-07-16T12:00:00.000Z"),
      },
    ]);
  });
});
