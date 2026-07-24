import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  credential as credentialTable,
  users as usersTable,
} from "./shared/database/schema.js";
import type {
  PasswordCredentialLoginRecord,
  PasswordCredentialLookupInput,
  PasswordCredentialStore,
  StoredPasswordCredential,
} from "./authModel.js";

export * from "./authModel.js";
export {
  authenticatePasswordForMfaChallenge,
  registerPasswordCredential,
} from "./authService.js";

export function createPasswordCredentialStore(client: Client): PasswordCredentialStore {
  const db = drizzle(client);

  return {
    async createPasswordCredential(
      credential: StoredPasswordCredential,
    ): Promise<StoredPasswordCredential> {
      const rows = await db
        .insert(credentialTable)
        .values({
          id: credential.id,
          userId: credential.userId,
          passwordHash: credential.passwordHash,
        })
        .returning({
          id: credentialTable.id,
          userId: credentialTable.userId,
          passwordHash: credentialTable.passwordHash,
        });
      const insertedCredential = rows[0];

      if (!insertedCredential) {
        throw new Error("Credential insert did not return a stored credential row.");
      }

      return insertedCredential;
    },

    async findPasswordCredentialByEmail(
      input: PasswordCredentialLookupInput,
    ): Promise<PasswordCredentialLoginRecord | null> {
      const rows = await db
        .select({
          tenantId: usersTable.tenantId,
          email: usersTable.email,
          userId: credentialTable.userId,
          passwordHash: credentialTable.passwordHash,
        })
        .from(credentialTable)
        .innerJoin(usersTable, eq(credentialTable.userId, usersTable.id))
        .where(
          and(
            eq(usersTable.tenantId, input.tenantId),
            eq(usersTable.email, input.email),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    },
  };
}
