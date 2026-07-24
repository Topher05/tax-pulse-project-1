import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { jwtVerify } from "jose";
import { describe, expect, test } from "vitest";

import type { JwtConfig } from "../../src/typescript/authConfig.js";
import { createAuthMfaLoginController } from "../../src/typescript/authMfaLogin.js";
import { refreshToken } from "../../src/typescript/shared/database/schema.js";
import { createMfaEnrollmentRepository } from "../../src/typescript/mfaEnrollmentRepository.js";
import { createRefreshTokenRepository } from "../../src/typescript/refreshTokenRepository.js";
import { createTokenService } from "../../src/typescript/tokenService.js";
import { userRows } from "./user/user.test.model.js";
import { withDockerDrizzleSeededDatabase } from "./bootstrap/migrationTestUtils.js";

const config: JwtConfig = {
  issuer: "https://auth.taxpulse.example",
  signingSecret: "a-unique-test-secret-that-is-more-than-32-bytes",
  accessTokenLifetimeSeconds: 900,
  refreshTokenLifetimeSeconds: 2_592_000,
};

describe("MFA login token issuance integration", () => {
  test("issues claims from the trusted user record and persists only the refresh hash", { timeout: 90_000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const user = userRows[1];

      if (!user) {
        throw new Error("Expected synthetic seeded user.");
      }

      const tokenService = createTokenService({
        config,
        refreshTokenRepository: createRefreshTokenRepository(client),
        now: () => new Date("2026-07-17T12:00:00Z"),
        randomBytes: () => Buffer.alloc(32, 11),
      });
      const controller = createAuthMfaLoginController({
        tokenService,
        repository: createMfaEnrollmentRepository(client),
        totpProvider: {
          generateSecret: () => "unused",
          generateProvisioningUri: () => "otpauth://totp/unused",
          verifyCode: async ({ code }) => code === "123456",
        },
      });

      const result = await controller.verify({
        tenant_id: user.tenantId,
        user_id: user.id,
        code: "123456",
      });
      const verified = await jwtVerify(
        result.access_token,
        new TextEncoder().encode(config.signingSecret),
        { issuer: config.issuer, currentDate: new Date("2026-07-17T12:00:00Z") },
      );
      const db = drizzle(client);
      const rows = await db
        .select({ tokenHash: refreshToken.tokenHash, revokedAt: refreshToken.revokedAt })
        .from(refreshToken)
        .where(eq(refreshToken.userId, user.id));

      expect(verified.payload).toMatchObject({
        sub: user.id,
        role: "Advisor",
        tenant_id: user.tenantId,
        iss: config.issuer,
      });
      expect(result).toMatchObject({
        token_type: "Bearer",
        expires_in: 900,
        refresh_expires_in: 2_592_000,
      });
      expect(rows).toEqual([
        {
          tokenHash: createHash("sha256").update(result.refresh_token).digest("hex"),
          revokedAt: null,
        },
      ]);
      expect(rows[0]?.tokenHash).not.toBe(result.refresh_token);
    });
  });

  test("rejects a disabled user before token issuance", { timeout: 90_000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const disabledUser = userRows[4];

      if (!disabledUser) {
        throw new Error("Expected synthetic disabled user.");
      }

      const controller = createAuthMfaLoginController({
        tokenService: createTokenService({
          config,
          refreshTokenRepository: createRefreshTokenRepository(client),
          randomBytes: () => Buffer.alloc(32, 12),
        }),
        repository: createMfaEnrollmentRepository(client),
        totpProvider: {
          generateSecret: () => "unused",
          generateProvisioningUri: () => "otpauth://totp/unused",
          verifyCode: async () => true,
        },
      });

      await expect(
        controller.verify({
          tenant_id: disabledUser.tenantId,
          user_id: disabledUser.id,
          code: "123456",
        }),
      ).rejects.toMatchObject({ status: 401 });

      const db = drizzle(client);
      const rows = await db
        .select({ id: refreshToken.id })
        .from(refreshToken)
        .where(eq(refreshToken.userId, disabledUser.id));

      expect(rows).toEqual([]);
    });
  });
});
