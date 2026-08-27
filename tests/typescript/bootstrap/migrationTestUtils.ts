import { randomUUID } from "node:crypto";

import { Client } from "pg";

import { applySeed } from "../../../src/typescript/shared/database/seed.js";
import { migrateDatabase } from "../../../src/typescript/shared/database/migrate.js";
import {
  assertComposePostgresReady,
  createComposePostgresConnection,
} from "../../../src/typescript/shared/scripts/composePostgres.js";
import { startDockerPostgresContainer } from "./dockerPostgres.js";

const drizzlePublicSchemaLockId = 20_300_801;
const drizzleTestDatabaseLockId = 20_300_802;
let resolvedDatabaseUrl: Promise<string> | undefined;

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

export function hasDrizzleTestDatabaseConfig(): boolean {
  return hasComposePostgresConfig() || Boolean(process.env.DATABASE_URL?.trim());
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
  const databaseUrl = await resolveDrizzleTestDatabaseUrl();

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const schemaName = createTestSchemaName("taxpulse_drizzle_migration");
  const quotedSchemaName = quoteIdentifier(schemaName);

  await client.query("SELECT pg_advisory_lock($1)", [drizzlePublicSchemaLockId]);

  try {
    await dropDrizzlePublicTypes(client);
    await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("SET search_path TO public");
    await migrateDatabase(client);
    await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
    await client.query(`SET search_path TO ${quotedSchemaName}, public`);

    return await callback(client);
  } finally {
    await client.query("SET search_path TO public").catch(() => undefined);
    await client
      .query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`)
      .catch(() => undefined);
    await dropDrizzlePublicTypes(client).catch(() => undefined);
    await client
      .query("SELECT pg_advisory_unlock($1)", [drizzlePublicSchemaLockId])
      .catch(() => undefined);
    await client.end();
  }
}

async function resolveDrizzleTestDatabaseUrl(): Promise<string> {
  resolvedDatabaseUrl ??= createDrizzleTestDatabaseUrl();
  return resolvedDatabaseUrl;
}

async function createDrizzleTestDatabaseUrl(): Promise<string> {
  if (!hasComposePostgresConfig()) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL or TAXPULSE_COMPOSE_POSTGRES_* is required for migration tests.",
      );
    }
    return databaseUrl;
  }

  assertComposePostgresReady();
  const composeConnection = createComposePostgresConnection();
  const testDatabaseName = `${composeConnection.databaseName}_test`;
  const adminClient = new Client({ connectionString: composeConnection.connectionString });

  await adminClient.connect();
  await adminClient.query("SELECT pg_advisory_lock($1)", [drizzleTestDatabaseLockId]);

  try {
    const existing = await adminClient.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [testDatabaseName],
    );
    if (!existing.rows[0]?.exists) {
      await adminClient.query(`CREATE DATABASE ${quoteIdentifier(testDatabaseName)}`);
    }
  } finally {
    await adminClient
      .query("SELECT pg_advisory_unlock($1)", [drizzleTestDatabaseLockId])
      .catch(() => undefined);
    await adminClient.end();
  }

  const testDatabaseUrl = new URL(composeConnection.connectionString);
  testDatabaseUrl.pathname = `/${testDatabaseName}`;
  return testDatabaseUrl.toString();
}

function hasComposePostgresConfig(): boolean {
  return [
    "TAXPULSE_COMPOSE_POSTGRES_DB",
    "TAXPULSE_COMPOSE_POSTGRES_USER",
    "TAXPULSE_COMPOSE_POSTGRES_PASSWORD",
  ].every((name) => Boolean(process.env[name]?.trim()));
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
        await migrateDatabase(bootstrapClient);
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
