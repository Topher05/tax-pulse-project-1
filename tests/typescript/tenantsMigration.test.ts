import { describe, expect, test } from "vitest";

import { applyDrizzleMigrations } from "../../src/typescript/postgresMigrations.js";
import { withDrizzleTestSchema } from "./bootstrap/migrationTestUtils.js";

const databaseUrl = process.env.DATABASE_URL?.trim();
const describeMigration = databaseUrl ? describe : describe.skip;

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

describeMigration("tenants migration", () => {
  test("creates the table and persists two tenants", async () => {
    await withDrizzleTestSchema(async (client) => {
      await applyDrizzleMigrations(client);

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
