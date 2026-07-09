import { randomUUID } from "node:crypto";

import type { Client } from "pg";

import { withDatabaseClient } from "../../src/typescript/postgresMigrations.js";

const databaseUrl = process.env.DATABASE_URL?.trim();

export const drizzleEnumTypeNames = [
  "user_role_name",
  "user_status_value",
] as const;

export function createTestSchemaName(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export async function dropDrizzlePublicTypes(client: Client): Promise<void> {
  for (const typeName of drizzleEnumTypeNames) {
    await client.query(
      `DROP TYPE IF EXISTS public.${quoteIdentifier(typeName)} CASCADE`,
    );
  }
}

export async function withDrizzleTestSchema<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for migration tests.");
  }

  return withDatabaseClient(databaseUrl, async (client) => {
    const schemaName = createTestSchemaName("taxpulse_drizzle_migration");
    const quotedSchemaName = quoteIdentifier(schemaName);

    await dropDrizzlePublicTypes(client);
    await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
    await client.query(`SET search_path TO ${quotedSchemaName}, public`);

    try {
      return await callback(client);
    } finally {
      await client.query("SET search_path TO public");
      await client.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
      await dropDrizzlePublicTypes(client);
    }
  });
}
