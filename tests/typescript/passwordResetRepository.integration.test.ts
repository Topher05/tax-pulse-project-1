import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { createPasswordResetRepository } from "../../src/typescript/index.js";
import {
  credential,
  passwordResetToken,
  refreshToken,
} from "../../src/typescript/shared/database/schema.js";
import { withDockerDrizzleSeededDatabase } from "./bootstrap/migrationTestUtils.js";
import { userRows } from "./user/user.test.model.js";

describe("password reset repository integration", () => {
  test("atomically resets the credential and revokes active refresh tokens", { timeout: 90_000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const user = userRows[1];
      if (!user) {
        throw new Error("Expected synthetic seeded user.");
      }

      const db = drizzle(client);
      const tokenHash = "a".repeat(64);
      const refreshTokenHash = "b".repeat(64);
      const usedAt = new Date("2026-09-04T12:00:00Z");

      await db.insert(passwordResetToken).values({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
        userId: user.id,
        tokenHash,
        expiresAt: new Date("2026-09-04T13:00:00Z"),
      });
      await db.insert(refreshToken).values({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d72",
        userId: user.id,
        tokenHash: refreshTokenHash,
        issuedAt: new Date("2026-09-04T11:00:00Z"),
        expiresAt: new Date("2026-10-04T11:00:00Z"),
      });

      const result = await createPasswordResetRepository(client).resetPasswordWithToken(
        tokenHash,
        "synthetic-new-password-hash",
        usedAt,
      );

      expect(result?.usedAt).toEqual(usedAt);
      await expect(
        db
          .select({ passwordHash: credential.passwordHash })
          .from(credential)
          .where(eq(credential.userId, user.id)),
      ).resolves.toEqual([{ passwordHash: "synthetic-new-password-hash" }]);
      await expect(
        db
          .select({ revokedAt: refreshToken.revokedAt })
          .from(refreshToken)
          .where(eq(refreshToken.userId, user.id)),
      ).resolves.toEqual([{ revokedAt: usedAt }]);

      await expect(
        createPasswordResetRepository(client).resetPasswordWithToken(
          tokenHash,
          "another-synthetic-password-hash",
          new Date("2026-09-04T12:01:00Z"),
        ),
      ).resolves.toBeNull();
    });
  });
});
