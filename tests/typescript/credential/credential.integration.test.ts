import type { Client } from "pg";
import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { credential } from "../../../src/typescript/shared/database/schema.js";
import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { expectPgError, getTableStructure } from "../bootstrap/tableTestUtils.js";
import {
  credentialRows,
  credentialRowsSchema,
  expectedCredentialRows,
} from "./credential.test.model.js";

async function stubCredentialIntegrationState(_client: Client): Promise<void> {
  return;
}

async function withCredentialIntegrationDatabase<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  return withDockerDrizzleSeededDatabase(async (client) => {
    await stubCredentialIntegrationState(client);
    return callback(client);
  });
}

describe("credential integration tests", () => {
  test("tracks credential relationships and FK constraints", { timeout: 15000 }, async () => {
    await withCredentialIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const structure = await getTableStructure(client, "credential");

      expect(structure.constraints.credential_userId_fk?.type).toBe("f");
      expect(structure.indexes).toContain("credential_userId_key");

      const rows = await db
        .select({
          id: credential.id,
          userId: credential.userId,
          passwordHash: credential.passwordHash,
        })
        .from(credential)
        .orderBy(asc(credential.id));

      expect(credentialRowsSchema.parse(rows)).toEqual(expectedCredentialRows);
    });
  });

  test("rejects duplicate credential rows and missing user references", { timeout: 15000 }, async () => {
    await withCredentialIntegrationDatabase(async (client) => {
      const db = drizzle(client);

      await expectPgError(
        db.insert(credential).values({
          id: "cm7zq8f4k0000a1b2c3d4e5f9",
          userId: credentialRows[0].userId,
          passwordHash:
            "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1kdXBsaWNhdGUtMQ$ZHVwbGljYXRlLWhhc2gtMDE",
        }),
        { code: "23505", constraint: "credential_userId_key" },
      );
      await expectPgError(
        db.insert(credential).values({
          id: "cm7zq8f4k0000a1b2c3d4e5fa",
          userId: "00000000-0000-0000-0000-000000000001",
          passwordHash:
            "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1taXNzaW5nLXVzZXI$ZHVwbGljYXRlLWhhc2gtMDI",
        }),
        { code: "23503", constraint: "credential_userId_fk" },
      );
    });
  });
});
