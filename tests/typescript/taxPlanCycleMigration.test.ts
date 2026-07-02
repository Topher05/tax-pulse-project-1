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
  "case_id",
  "tenant_id",
  "planning_period",
  "stage",
  "owner",
  "priority",
  "due_date",
  "on_hold",
  "hold_reason",
];

const expectedStageTransitionColumns = [
  "case_id",
  "from_stage",
  "to_stage",
  "actor",
  "occurred_at",
];

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

async function getTableStructure(
  client: Client,
  tableName: string,
): Promise<{
  columns: string[];
  nullableColumns: Record<string, boolean>;
  constraints: Record<string, { definition: string; type: string }>;
  indexes: string[];
  rowCount: number;
}> {
  const rowCountResult = await client.query(
    `SELECT count(*)::int AS row_count FROM ${quoteIdentifier(tableName)}`,
  );
  const columnsResult = await client.query(
    `
      SELECT column_name
      , is_nullable
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName],
  );
  const constraintsResult = await client.query(
    `
      SELECT conname, contype, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = $1::regclass
    `,
    [tableName],
  );
  const indexesResult = await client.query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND tablename = $1
      ORDER BY indexname
    `,
    [tableName],
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
    nullableColumns: Object.fromEntries(
      columnsResult.rows.map((row) => [
        String(row.column_name),
        row.is_nullable === "YES",
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

      const structure = await getTableStructure(client, "tax_plan_cycle");

      expect(structure.rowCount).toBe(0);
      expect(structure.columns).toEqual(expectedColumns);
      expect(structure.nullableColumns.case_id).toBe(false);
      expect(structure.indexes).toContain(
        "tax_plan_cycle_tenant_id_due_date_idx",
      );
      expect(structure.constraints.tax_plan_cycle_client_id_pk?.type).toBe("p");
      expect(
        structure.constraints.tax_plan_cycle_client_id_pk?.definition,
      ).toContain("PRIMARY KEY (client_id)");
      expect(structure.constraints.tax_plan_cycle_case_id_key?.type).toBe("u");
      expect(
        structure.constraints.tax_plan_cycle_case_id_key?.definition,
      ).toContain("UNIQUE (case_id)");
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

      await client.query("INSERT INTO tenants (id) VALUES ($1)", [
        "tenant-001",
      ]);

      await client.query(
        `
          INSERT INTO tax_plan_cycle (
            client_id,
            case_id,
            tenant_id,
            planning_period,
            stage,
            owner,
            priority,
            due_date,
            on_hold,
            hold_reason
          ) VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10),
            ($11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        `,
        [
          "client-001",
          "case-001",
          "tenant-001",
          "2026-Q3",
          "Intake",
          "advisor-001",
          "high",
          "2026-07-15",
          false,
          null,
          "client-002",
          "case-002",
          "tenant-001",
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
            case_id,
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
          client_id: "client-001",
          case_id: "case-001",
          tenant_id: "tenant-001",
          planning_period: "2026-Q3",
          stage: "Intake",
          owner: "advisor-001",
          priority: "high",
          due_date: "2026-07-15",
          on_hold: false,
          hold_reason: null,
        },
        {
          client_id: "client-002",
          case_id: "case-002",
          tenant_id: "tenant-001",
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
      await client.query("INSERT INTO tenants (id) VALUES ($1)", [
        "tenant-001",
      ]);

      await expect(
        client.query(
          `
            INSERT INTO tax_plan_cycle (
              client_id,
              case_id,
              tenant_id,
              planning_period,
              stage,
              owner,
              priority,
              due_date,
              on_hold
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            "client-invalid",
            "case-invalid",
            "tenant-001",
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

  test("creates the stage transition table and persists transition history", async () => {
    await withTestSchema(async (client) => {
      await applyMigrations(client);

      const structure = await getTableStructure(client, "stage_transition");

      expect(structure.rowCount).toBe(0);
      expect(structure.columns).toEqual(expectedStageTransitionColumns);
      expect(structure.indexes).toContain("stage_transition_case_id_idx");
      expect(structure.constraints.stage_transition_case_id_fk?.type).toBe(
        "f",
      );
      expect(
        structure.constraints.stage_transition_case_id_fk?.definition,
      ).toContain("FOREIGN KEY (case_id)");
      expect(
        structure.constraints.stage_transition_case_id_fk?.definition,
      ).toContain("REFERENCES tax_plan_cycle(case_id)");
      expect(
        structure.constraints.stage_transition_from_stage_check?.type,
      ).toBe("c");
      expect(
        structure.constraints.stage_transition_from_stage_check?.definition,
      ).toContain("Data Aggregation");
      expect(
        structure.constraints.stage_transition_to_stage_check?.type,
      ).toBe("c");
      expect(
        structure.constraints.stage_transition_to_stage_check?.definition,
      ).toContain("Data Aggregation");

      await client.query("INSERT INTO tenants (id) VALUES ($1)", [
        "tenant-001",
      ]);

      await client.query(
        `
          INSERT INTO tax_plan_cycle (
            client_id,
            case_id,
            tenant_id,
            planning_period,
            stage,
            owner,
            priority,
            due_date,
            on_hold
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          "client-001",
          "case-001",
          "tenant-001",
          "2026-Q3",
          "Data Aggregation",
          "advisor-001",
          "high",
          "2026-07-15",
          false,
        ],
      );

      await client.query(
        `
          INSERT INTO stage_transition (
            case_id,
            from_stage,
            to_stage,
            actor,
            occurred_at
          ) VALUES ($1, $2, $3, $4, $5)
        `,
        [
          "case-001",
          "Intake",
          "Data Aggregation",
          "advisor-001",
          "2026-07-01T14:00:00.000Z",
        ],
      );

      const rows = await client.query(
        `
          SELECT
            case_id,
            from_stage,
            to_stage,
            actor,
            occurred_at AT TIME ZONE 'UTC' AS occurred_at
          FROM stage_transition
          WHERE case_id = $1
        `,
        ["case-001"],
      );

      expect(rows.rows).toEqual([
        {
          case_id: "case-001",
          from_stage: "Intake",
          to_stage: "Data Aggregation",
          actor: "advisor-001",
          occurred_at: new Date("2026-07-01T14:00:00.000Z"),
        },
      ]);
    });
  });

  test("rejects stage transitions for missing cases", async () => {
    await withTestSchema(async (client) => {
      await applyMigrations(client);

      await expect(
        client.query(
          `
            INSERT INTO stage_transition (
              case_id,
              from_stage,
              to_stage,
              actor,
              occurred_at
            ) VALUES ($1, $2, $3, $4, $5)
          `,
          [
            "missing-case",
            "Intake",
            "Data Aggregation",
            "advisor-001",
            "2026-07-01T14:00:00.000Z",
          ],
        ),
      ).rejects.toThrow();
    });
  });

  test("rejects invalid stage transition stage values", async () => {
    await withTestSchema(async (client) => {
      await applyMigrations(client);

      await client.query("INSERT INTO tenants (id) VALUES ($1)", [
        "tenant-001",
      ]);

      await client.query(
        `
          INSERT INTO tax_plan_cycle (
            client_id,
            case_id,
            tenant_id,
            planning_period,
            stage,
            owner,
            priority,
            due_date,
            on_hold
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          "client-001",
          "case-001",
          "tenant-001",
          "2026-Q3",
          "Intake",
          "advisor-001",
          "high",
          "2026-07-15",
          false,
        ],
      );

      await expect(
        client.query(
          `
            INSERT INTO stage_transition (
              case_id,
              from_stage,
              to_stage,
              actor,
              occurred_at
            ) VALUES ($1, $2, $3, $4, $5)
          `,
          [
            "case-001",
            "Planning",
            "Data Aggregation",
            "advisor-001",
            "2026-07-01T14:00:00.000Z",
          ],
        ),
      ).rejects.toThrow();

      await expect(
        client.query(
          `
            INSERT INTO stage_transition (
              case_id,
              from_stage,
              to_stage,
              actor,
              occurred_at
            ) VALUES ($1, $2, $3, $4, $5)
          `,
          [
            "case-001",
            "Intake",
            "Planning",
            "advisor-001",
            "2026-07-01T14:00:00.000Z",
          ],
        ),
      ).rejects.toThrow();
    });
  });
});
