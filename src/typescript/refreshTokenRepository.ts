import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { refreshToken } from "./db/schema.js";

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
  };
}
