import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import type { Client } from "pg";

import {
  applyMigrations,
  getDatabaseUrlFromEnv,
  withDatabaseClient,
} from "../../src/typescript/postgresMigrations.js";

const databaseUrl = getDatabaseUrlFromEnv();

const expectedColumns = ["id", "name", "created_at"];
const expectedColumnTypes = {
  id: "uuid",
  name: "text",
  created_at: "timestamp with time zone",
} as const;

const sampleTenantIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
] as const;

function createTestSchemaName(): string {
  return `taxpulse_migration_${randomUUID().replace(/-/g, "")}`;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function resetTestSchema(client: Client, schemaName: string): Promise<void> {
  const quotedSchemaName = quoteIdentifier(schemaName);

  await client.query(
    `DROP TABLE IF EXISTS ${quotedSchemaName}.stage_transition CASCADE`,
  );
  await client.query(
    `DROP TABLE IF EXISTS ${quotedSchemaName}.tax_plan_cycle CASCADE`,
  );
  await client.query(
    `DROP TABLE IF EXISTS ${quotedSchemaName}.tenants CASCADE`,
  );
}

async function withTestSchema<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  return withDatabaseClient(databaseUrl, async (client) => {
    const schemaName = createTestSchemaName();
    const quotedSchemaName = quoteIdentifier(schemaName);

    await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
    await client.query(`SET search_path TO ${quotedSchemaName}, public`);
    await resetTestSchema(client, schemaName);

    try {
      return await callback(client);
    } finally {
      await client.query("SET search_path TO public");
      await client.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
    }
  });
}

describe("tenants migration", () => {
  test("creates the table and persists two tenants", async () => {
    await withTestSchema(async (client) => {
      await applyMigrations(client);

      const columnsResult = await client.query(
        `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'tenants'
          ORDER BY ordinal_position
        `,
      );

      expect(columnsResult.rows.map((row) => String(row.column_name))).toEqual(
        expectedColumns,
      );
      expect(
        Object.fromEntries(
          columnsResult.rows.map((row) => [
            String(row.column_name),
            String(row.data_type),
          ]),
        ),
      ).toEqual(expectedColumnTypes);

      await client.query(
        `
          INSERT INTO tenants (id, name, created_at) VALUES
            ($1, $2, $3),
            ($4, $5, $6)
        `,
        [
          sampleTenantIds[0],
          "North Shore Advisors",
          "2026-06-29T12:00:00Z",
          sampleTenantIds[1],
          "Harbor View Planning",
          "2026-06-29T12:30:00Z",
        ],
      );

      const rows = await client.query(
        `
          SELECT
            id,
            name,
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS created_at
          FROM tenants
          ORDER BY id
        `,
      );

      expect(rows.rows).toEqual([
        {
          id: sampleTenantIds[0],
          name: "North Shore Advisors",
          created_at: "2026-06-29 12:00:00",
        },
        {
          id: sampleTenantIds[1],
          name: "Harbor View Planning",
          created_at: "2026-06-29 12:30:00",
        },
      ]);
    });
  });
});
