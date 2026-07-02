import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import type { Client } from "pg";

import {
  applyMigrations,
  getDatabaseUrlFromEnv,
  withDatabaseClient,
} from "../../src/typescript/postgresMigrations.js";

const databaseUrl = getDatabaseUrlFromEnv();

const expectedColumns = [
  "client_id",
  "tenant_id",
  "planning_period",
  "stage",
  "owner",
  "priority",
  "due_date",
  "on_hold",
  "hold_reason",
];

const expectedColumnTypes = {
  client_id: "uuid",
  tenant_id: "uuid",
  planning_period: "text",
  stage: "text",
  owner: "text",
  priority: "text",
  due_date: "date",
  on_hold: "boolean",
  hold_reason: "text",
} as const;

const sampleTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11";
const sampleClientIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d21",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
] as const;

async function seedSampleTenant(client: Client): Promise<void> {
  await client.query(
    `
      INSERT INTO tenants (id, name, created_at)
      VALUES ($1, $2, $3)
    `,
    [
      sampleTenantId,
      "North Shore Advisors",
      "2026-06-29T12:00:00Z",
    ],
  );
}

function createTestSchemaName(): string {
  return `taxpulse_migration_${randomUUID().replace(/-/g, "")}`;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function withTestSchema<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  return withDatabaseClient(databaseUrl, async (client) => {
    const schemaName = createTestSchemaName();
    const quotedSchemaName = quoteIdentifier(schemaName);

    await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
    await client.query(`SET search_path TO ${quotedSchemaName}, public`);

    try {
      return await callback(client);
    } finally {
      await client.query("SET search_path TO public");
      await client.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
    }
  });
}

async function getTableStructure(client: Client): Promise<{
  columns: string[];
  columnTypes: Record<string, string>;
  constraints: Record<string, { definition: string; type: string }>;
  indexes: string[];
  rowCount: number;
}> {
  const rowCountResult = await client.query(
    "SELECT count(*)::int AS row_count FROM tax_plan_cycle",
  );
  const columnsResult = await client.query(
    `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'tax_plan_cycle'
      ORDER BY ordinal_position
    `,
  );
  const constraintsResult = await client.query(
    `
      SELECT conname, contype, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'tax_plan_cycle'::regclass
    `,
  );
  const indexesResult = await client.query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND tablename = 'tax_plan_cycle'
      ORDER BY indexname
    `,
  );

  const constraints = Object.fromEntries(
    constraintsResult.rows.map((row) => [
      String(row.conname),
      {
        definition: String(row.definition),
        type: String(row.contype),
      },
    ]),
  );

  return {
    rowCount: Number(rowCountResult.rows[0]?.row_count ?? 0),
    columns: columnsResult.rows.map((row) => String(row.column_name)),
    columnTypes: Object.fromEntries(
      columnsResult.rows.map((row) => [
        String(row.column_name),
        String(row.data_type),
      ]),
    ),
    constraints,
    indexes: indexesResult.rows.map((row) => String(row.indexname)),
  };
}

describe("tax plan cycle migration", () => {
  test("creates the table, verifies it is empty, and persists two records", async () => {
    await withTestSchema(async (client) => {
      await applyMigrations(client);
      await seedSampleTenant(client);

      const structure = await getTableStructure(client);

      expect(structure.rowCount).toBe(0);
      expect(structure.columns).toEqual(expectedColumns);
      expect(structure.columnTypes).toEqual(expectedColumnTypes);
      expect(structure.indexes).toContain(
        "tax_plan_cycle_tenant_id_due_date_idx",
      );
      expect(structure.constraints.tax_plan_cycle_client_id_pk?.type).toBe("p");
      expect(
        structure.constraints.tax_plan_cycle_client_id_pk?.definition,
      ).toContain("PRIMARY KEY (client_id)");
      expect(structure.constraints.tax_plan_cycle_tenant_id_fk?.type).toBe("f");
      expect(
        structure.constraints.tax_plan_cycle_tenant_id_fk?.definition,
      ).toContain("FOREIGN KEY (tenant_id)");
      expect(
        structure.constraints.tax_plan_cycle_tenant_id_fk?.definition,
      ).toContain("REFERENCES tenants(id)");
      expect(structure.constraints.tax_plan_cycle_stage_check?.type).toBe("c");
      expect(
        structure.constraints.tax_plan_cycle_stage_check?.definition,
      ).toContain("Modeling");

      await client.query(
        `
          INSERT INTO tax_plan_cycle (
            client_id,
            tenant_id,
            planning_period,
            stage,
            owner,
            priority,
            due_date,
            on_hold,
            hold_reason
          ) VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9),
            ($10, $11, $12, $13, $14, $15, $16, $17, $18)
        `,
        [
          sampleClientIds[0],
          sampleTenantId,
          "2026-Q3",
          "Intake",
          "advisor-001",
          "high",
          "2026-07-15",
          false,
          null,
          sampleClientIds[1],
          sampleTenantId,
          "2026-Q4",
          "Review",
          "advisor-002",
          "medium",
          "2026-08-20",
          true,
          "Awaiting broker statements",
        ],
      );

      const rows = await client.query(
        `
          SELECT
            client_id,
            tenant_id,
            planning_period,
            stage,
            owner,
            priority,
            due_date::text AS due_date,
            on_hold,
            hold_reason
          FROM tax_plan_cycle
          ORDER BY client_id
        `,
      );

      expect(rows.rows).toEqual([
        {
          client_id: sampleClientIds[0],
          tenant_id: sampleTenantId,
          planning_period: "2026-Q3",
          stage: "Intake",
          owner: "advisor-001",
          priority: "high",
          due_date: "2026-07-15",
          on_hold: false,
          hold_reason: null,
        },
        {
          client_id: sampleClientIds[1],
          tenant_id: sampleTenantId,
          planning_period: "2026-Q4",
          stage: "Review",
          owner: "advisor-002",
          priority: "medium",
          due_date: "2026-08-20",
          on_hold: true,
          hold_reason: "Awaiting broker statements",
        },
      ]);
    });
  });

  test("rejects invalid stage values", async () => {
    await withTestSchema(async (client) => {
      await applyMigrations(client);
      await seedSampleTenant(client);

      await expect(
        client.query(
          `
            INSERT INTO tax_plan_cycle (
              client_id,
              tenant_id,
              planning_period,
              stage,
              owner,
              priority,
              due_date,
              on_hold
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d31",
            sampleTenantId,
            "2026-Q3",
            "Planning",
            "advisor-003",
            "low",
            "2026-09-01",
            false,
          ],
        ),
      ).rejects.toThrow();
    });
  });
});
