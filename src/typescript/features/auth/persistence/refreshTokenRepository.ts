import { and, eq, gt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { refreshToken, roles, users, userStatus } from "../../../shared/database/schema.js";
import type { AuthenticatedPrincipal } from "../domain/authTypes.js";

export interface PersistRefreshTokenInput {
  userId: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface RevokeRefreshTokenByHashInput {
  tokenHash: string;
  revokedAt: Date;
}

export interface RefreshTokenRepository {
  persist(input: PersistRefreshTokenInput): Promise<void>;
  revokeByTokenHash(input: RevokeRefreshTokenByHashInput): Promise<boolean>;
  findActivePrincipalByTokenHash(input: {
    tokenHash: string;
    now: Date;
  }): Promise<AuthenticatedPrincipal | null>;
}

export function createRefreshTokenRepository(client: Client): RefreshTokenRepository {
  const db = drizzle(client);

  return {
    async persist(input) {
      await db.insert(refreshToken).values(input);
    },

    async revokeByTokenHash({ tokenHash, revokedAt }) {
      const rows = await db
        .update(refreshToken)
        .set({ revokedAt })
        .where(
          and(
            eq(refreshToken.tokenHash, tokenHash),
            isNull(refreshToken.revokedAt),
          ),
        )
        .returning({ id: refreshToken.id });

      return rows.length === 1;
    },

    async findActivePrincipalByTokenHash({ tokenHash, now }) {
      const rows = await db
        .select({
          userId: users.id,
          tenantId: users.tenantId,
          role: roles.role,
        })
        .from(refreshToken)
        .innerJoin(users, eq(refreshToken.userId, users.id))
        .innerJoin(roles, eq(users.roleId, roles.id))
        .innerJoin(userStatus, eq(users.statusId, userStatus.id))
        .where(
          and(
            eq(refreshToken.tokenHash, tokenHash),
            isNull(refreshToken.revokedAt),
            gt(refreshToken.expiresAt, now),
            eq(userStatus.status, "active"),
          ),
        )
        .limit(1);

      const principal = rows[0];
      return principal ?? null;
    },
  };
}
