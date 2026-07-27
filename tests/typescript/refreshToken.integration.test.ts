import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import type { JwtConfig } from "../../src/typescript/authConfig.js";
import { refreshToken } from "../../src/typescript/shared/database/schema.js";
import { createRefreshTokenRepository } from "../../src/typescript/refreshTokenRepository.js";
import { createTokenService } from "../../src/typescript/tokenService.js";
import { userRows } from "./user/user.test.model.js";
import { withDockerDrizzleSeededDatabase } from "./bootstrap/migrationTestUtils.js";
import { getTableStructure } from "./bootstrap/tableTestUtils.js";

const config: JwtConfig = {
  issuer: "https://auth.taxpulse.example",
  signingSecret: "a-unique-test-secret-that-is-more-than-32-bytes",
  accessTokenLifetimeSeconds: 900,
  refreshTokenLifetimeSeconds: 2_592_000,
};

describe("refresh token integration", () => {
  test("persists a hash and records refresh-token revocation", { timeout: 90_000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const db = drizzle(client);
      const issuedAt = new Date("2026-07-16T12:00:00Z");
      const tokenService = createTokenService({
        config,
        refreshTokenRepository: createRefreshTokenRepository(client),
        now: () => issuedAt,
        randomBytes: () => Buffer.alloc(32, 9),
      });
      const user = userRows[1];

      if (!user) {
        throw new Error("Expected synthetic seeded user.");
      }

      const pair = await tokenService.issue({
        userId: user.id,
        role: "Advisor",
        tenantId: user.tenantId,
      });
      const rows = await db
        .select({
          userId: refreshToken.userId,
          tokenHash: refreshToken.tokenHash,
          issuedAt: refreshToken.issuedAt,
          expiresAt: refreshToken.expiresAt,
          revokedAt: refreshToken.revokedAt,
        })
        .from(refreshToken)
        .where(eq(refreshToken.userId, user.id));

      expect(rows).toEqual([
        {
          userId: user.id,
          tokenHash: createHash("sha256").update(pair.refreshToken).digest("hex"),
          issuedAt,
          expiresAt: new Date("2026-08-15T12:00:00Z"),
          revokedAt: null,
        },
      ]);
      expect(rows[0]?.tokenHash).not.toBe(pair.refreshToken);

      await expect(tokenService.revokeRefreshToken(pair.refreshToken)).resolves.toBe(true);
      await expect(tokenService.revokeRefreshToken(pair.refreshToken)).resolves.toBe(false);

      const revokedRows = await db
        .select({ revokedAt: refreshToken.revokedAt })
        .from(refreshToken)
        .where(eq(refreshToken.userId, user.id));

      expect(revokedRows[0]?.revokedAt).toEqual(issuedAt);

      const structure = await getTableStructure(client, "refresh_token");
      expect(structure.constraints.refresh_token_pkey?.type).toBe("p");
      expect(structure.constraints.refresh_token_user_id_fk?.type).toBe("f");
      expect(structure.indexes).toContain("refresh_token_token_hash_key");
      expect(structure.indexes).toContain("refresh_token_user_id_expires_at_idx");
    });
  });
});
