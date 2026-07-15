import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  credential as credentialTable,
  users as usersTable,
} from "./db/schema.js";
import type { HashPasswordOptions } from "./passwordHashing.js";
import { hashPassword, verifyPasswordHash } from "./passwordHashing.js";

export interface PasswordCredentialRegistrationInput {
  credentialId: string;
  userId: string;
  plaintextPassword: string;
}

export interface StoredPasswordCredential {
  id: string;
  userId: string;
  passwordHash: string;
}

export interface PasswordCredentialWriter {
  createPasswordCredential(
    credential: StoredPasswordCredential,
  ): Promise<StoredPasswordCredential>;
}

export interface PasswordCredentialLookupInput {
  tenantId: string;
  email: string;
}

export interface PasswordCredentialLoginInput extends PasswordCredentialLookupInput {
  plaintextPassword: string;
}

export interface PasswordCredentialLoginRecord {
  tenantId: string;
  email: string;
  userId: string;
  passwordHash: string;
}

export interface PasswordCredentialReader {
  findPasswordCredentialByEmail(
    input: PasswordCredentialLookupInput,
  ): Promise<PasswordCredentialLoginRecord | null>;
}

export type PasswordCredentialStore = PasswordCredentialWriter & PasswordCredentialReader;

export interface InvalidPasswordCredentialResult {
  status: "invalid_credentials";
}

export interface MfaChallengeRequiredResult {
  status: "mfa_challenge_required";
  tenantId: string;
  email: string;
  userId: string;
}

export type PasswordAuthenticationResult =
  | InvalidPasswordCredentialResult
  | MfaChallengeRequiredResult;

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

export async function registerPasswordCredential(
  input: PasswordCredentialRegistrationInput,
  writer: PasswordCredentialWriter,
  options: HashPasswordOptions = {},
): Promise<StoredPasswordCredential> {
  const passwordHash = await hashPassword(input.plaintextPassword, options);

  return await writer.createPasswordCredential({
    id: input.credentialId,
    userId: input.userId,
    passwordHash,
  });
}

export async function authenticatePasswordForMfaChallenge(
  input: PasswordCredentialLoginInput,
  reader: PasswordCredentialReader,
): Promise<PasswordAuthenticationResult> {
  const credential = await reader.findPasswordCredentialByEmail({
    tenantId: input.tenantId,
    email: input.email,
  });

  if (!credential) {
    return { status: "invalid_credentials" };
  }

  const passwordMatches = await verifyPasswordHash(
    credential.passwordHash,
    input.plaintextPassword,
  );

  if (!passwordMatches) {
    return { status: "invalid_credentials" };
  }

  return {
    status: "mfa_challenge_required",
    tenantId: credential.tenantId,
    email: credential.email,
    userId: credential.userId,
  };
}
