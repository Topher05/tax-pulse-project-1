import { randomUUID } from "node:crypto";

import { Client } from "pg";

import {
  applyDrizzleMigrations,
  withDatabaseClient,
} from "../../../src/typescript/shared/scripts/drizzleMigrations.js";
import { applySeed } from "../../../src/typescript/shared/database/seed.js";
import { startDockerPostgresContainer } from "./dockerPostgres.js";

const databaseUrl = process.env.DATABASE_URL?.trim();
const drizzlePublicSchemaLockId = 20_300_801;

export const drizzleEnumTypeNames = [
  "deduction_category",
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

    await client.query("SELECT pg_advisory_lock($1)", [drizzlePublicSchemaLockId]);

    try {
      await dropDrizzlePublicTypes(client);
      await client.query("DROP SCHEMA IF EXISTS public CASCADE");
      await client.query("CREATE SCHEMA public");
      await client.query("SET search_path TO public");
      await applyDrizzleMigrations(client);
      await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
      await client.query(`SET search_path TO ${quotedSchemaName}, public`);

      return await callback(client);
    } finally {
      await client.query("SET search_path TO public");
      await client.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
      await dropDrizzlePublicTypes(client);
      await client.query("SELECT pg_advisory_unlock($1)", [drizzlePublicSchemaLockId]);
    }
  });
}

export async function withDockerDrizzleSeededDatabase<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  const container = await startDockerPostgresContainer({
    bootstrap: async (connectionUri: string) => {
      const bootstrapClient = new Client({
        connectionString: connectionUri,
      });

      await bootstrapClient.connect();

      try {
        await applyDrizzleMigrations(bootstrapClient);
        await applySeed(bootstrapClient);
      } finally {
        await bootstrapClient.end();
      }
    },
  });
  const client = new Client({
    connectionString: container.connectionUri,
  });

  await client.connect();

  try {
    return await callback(client);
  } finally {
    await client.query("RESET search_path").catch(() => undefined);
    await client.end().catch(() => undefined);
    await container.stop();
  }
}
