import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  credential,
  passwordResetToken,
  users,
  userStatus,
} from "./shared/database/schema.js";
import type {
  ActiveUserRecord,
  PasswordResetRepository,
  PasswordResetTokenInsert,
  PasswordResetTokenRecord,
} from "./passwordReset.js";

export function createPasswordResetRepository(
  client: Client,
): PasswordResetRepository {
  const db = drizzle(client);

  return {
    async findActiveUserByEmail(email) {
      const rows = await db
        .select({
          userId: users.id,
          email: users.email,
        })
        .from(users)
        .innerJoin(userStatus, eq(users.statusId, userStatus.id))
        .where(
          and(
            eq(users.email, email),
            eq(userStatus.status, "active"),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    },

    async createResetToken(input: PasswordResetTokenInsert) {
      await db.insert(passwordResetToken).values({
        id: input.id,
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      });
    },

    async findValidToken(tokenHash) {
      const rows = await db
        .select({
          id: passwordResetToken.id,
          userId: passwordResetToken.userId,
          tokenHash: passwordResetToken.tokenHash,
          expiresAt: passwordResetToken.expiresAt,
          usedAt: passwordResetToken.usedAt,
        })
        .from(passwordResetToken)
        .where(
          and(
            eq(passwordResetToken.tokenHash, tokenHash),
            isNull(passwordResetToken.usedAt),
          ),
        )
        .limit(1);

      const row: PasswordResetTokenRecord | undefined = rows[0];

      return row ?? null;
    },

    async markTokenUsed(tokenId) {
      await db
        .update(passwordResetToken)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetToken.id, tokenId));
    },

    async updatePasswordHash(userId, newPasswordHash) {
      await db
        .update(credential)
        .set({ passwordHash: newPasswordHash })
        .where(eq(credential.userId, userId));
    },
  };
}
