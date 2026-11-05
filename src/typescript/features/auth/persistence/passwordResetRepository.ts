import { and, eq, gt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  credential,
  passwordResetToken,
  refreshToken,
  users,
  userStatus,
} from "../../../shared/database/schema.js";
import type {
  ActiveUserRecord,
  PasswordResetRepository,
  PasswordResetTokenInsert,
  PasswordResetTokenRecord,
} from "../domain/passwordReset.js";

export function createPasswordResetRepository(
  client: Client,
): PasswordResetRepository {
  const db = drizzle(client);

  return {
    async findActiveUserByEmail(tenantId, email) {
      const rows = await db
        .select({
          userId: users.id,
          email: users.email,
        })
        .from(users)
        .innerJoin(userStatus, eq(users.statusId, userStatus.id))
        .where(
          and(
            eq(users.tenantId, tenantId),
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

    async resetPasswordWithToken(tokenHash, newPasswordHash, usedAt) {
      return await db.transaction(async (transaction) => {
        const tokenRows = await transaction
          .update(passwordResetToken)
          .set({ usedAt })
          .where(
            and(
              eq(passwordResetToken.tokenHash, tokenHash),
              isNull(passwordResetToken.usedAt),
              gt(passwordResetToken.expiresAt, usedAt),
            ),
          )
          .returning({
            id: passwordResetToken.id,
            userId: passwordResetToken.userId,
            tokenHash: passwordResetToken.tokenHash,
            expiresAt: passwordResetToken.expiresAt,
            usedAt: passwordResetToken.usedAt,
          });

        const tokenRecord: PasswordResetTokenRecord | undefined = tokenRows[0];

        if (!tokenRecord) {
          return null;
        }

        const credentialRows = await transaction
          .update(credential)
          .set({ passwordHash: newPasswordHash })
          .where(eq(credential.userId, tokenRecord.userId))
          .returning({ id: credential.id });

        if (!credentialRows[0]) {
          throw new Error("Password reset token owner has no credential row.");
        }

        await transaction
          .update(refreshToken)
          .set({ revokedAt: usedAt })
          .where(
            and(
              eq(refreshToken.userId, tokenRecord.userId),
              isNull(refreshToken.revokedAt),
            ),
          );

        return tokenRecord;
      });
    },
  };
}
