import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  applyDrizzleMigrations,
  drizzleAppliedMigrationsTableName,
  drizzleMigrationsDirectory,
} from "../../src/typescript/postgresMigrations.js";
import { quoteIdentifier, withDrizzleTestSchema } from "./migrationTestUtils.js";
import type { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
const describeMigration = databaseUrl ? describe : describe.skip;

const expectedColumns = [
  "id",
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
  id: "uuid",
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
const sampleCycleIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d31",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d32",
] as const;
const sampleStageTransitionCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d33";
const sampleMissingCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d24";

async function seedSampleTenant(client: Client): Promise<void> {
  await client.query(
    `
      INSERT INTO public.tenants (id, name, created_at)
      VALUES ($1, $2, $3)
    `,
    [
      sampleTenantId,
      "North Shore Advisors",
      "2026-06-29T12:00:00Z",
    ],
  );
}
const expectedStageTransitionColumns = [
  "id",
  "case_id",
  "from_stage",
  "to_stage",
  "actor",
  "occurred_at",
];

async function getTableStructure(
  client: Client,
  tableName: string,
): Promise<{
  columns: string[];
  columnTypes: Record<string, string>;
  constraints: Record<string, { definition: string; type: string }>;
  indexes: string[];
  rowCount: number;
}> {
  const rowCountResult = await client.query(
    `SELECT count(*)::int AS row_count FROM ${quoteIdentifier(tableName)}`,
  );
  const columnsResult = await client.query(
    `
      SELECT column_name, data_type
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

describeMigration("tax plan cycle migration", () => {
  test("records applied migrations and skips them on rerun", async () => {
    await withDrizzleTestSchema(async (client) => {
      await applyDrizzleMigrations(client);

      const migrationFiles = readdirSync(drizzleMigrationsDirectory)
        .filter((fileName) => fileName.endsWith(".sql"))
        .sort((left, right) => left.localeCompare(right));
      const appliedRows = await client.query(
        `
          SELECT file_name
          FROM ${drizzleAppliedMigrationsTableName}
          ORDER BY file_name
        `,
      );

      expect(appliedRows.rows.map((row) => String(row.file_name))).toEqual(
        migrationFiles,
      );
    });
  });

  test("keeps Drizzle-generated migration evidence aligned with the table contract", () => {
    const drizzleMigrationsDir = drizzleMigrationsDirectory;

    expect(existsSync(drizzleMigrationsDir)).toBe(true);

    const migrationSql = readdirSync(drizzleMigrationsDir)
      .filter((fileName) => fileName.endsWith(".sql"))
      .map((fileName) => readFileSync(join(drizzleMigrationsDir, fileName), "utf8"))
      .join("\n");

    expect(migrationSql).toContain('CREATE TABLE "tenants"');
    expect(migrationSql).toContain('CREATE TABLE "tax_plan_cycle"');
    expect(migrationSql).not.toContain('CONSTRAINT "tax_plan_cycle_case_id_key" UNIQUE');
    expect(migrationSql).toContain('CREATE TABLE "stage_transition"');
    expect(migrationSql).toContain(
      'FOREIGN KEY ("case_id") REFERENCES "public"."tax_plan_cycle"("id")',
    );
  });

  test("creates the table, verifies it is empty, and persists two records", async () => {
    await withDrizzleTestSchema(async (client) => {
      await seedSampleTenant(client);

      const structure = await getTableStructure(client, "tax_plan_cycle");

      expect(structure.columns).toEqual(expectedColumns);
      expect(structure.columnTypes).toEqual(expectedColumnTypes);
      expect(structure.indexes).toContain(
        "tax_plan_cycle_tenant_id_due_date_idx",
      );
      expect(structure.constraints.tax_plan_cycle_id_pk?.type).toBe("p");
      expect(structure.constraints.tax_plan_cycle_id_pk?.definition).toContain(
        "PRIMARY KEY (id)",
      );
      expect(structure.constraints.tax_plan_cycle_client_id_pk).toBeUndefined();
      expect(structure.constraints.tax_plan_cycle_case_id_key).toBeUndefined();
      expect(structure.constraints.tax_plan_cycle_tenant_id_fk?.type).toBe("f");
      expect(
        structure.constraints.tax_plan_cycle_tenant_id_fk?.definition,
      ).toContain("FOREIGN KEY (tenant_id)");
      expect(
        structure.constraints.tax_plan_cycle_tenant_id_fk?.definition,
      ).toContain("REFERENCES public.tenants(id)");
      expect(structure.constraints.tax_plan_cycle_stage_check?.type).toBe("c");
      expect(
        structure.constraints.tax_plan_cycle_stage_check?.definition,
      ).toContain("Modeling");

      await client.query(
        `
          INSERT INTO tax_plan_cycle (
            id,
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
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10),
            ($11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        `,
        [
          sampleCycleIds[0],
          sampleClientIds[0],
          sampleTenantId,
          "2026-Q3",
          "Intake",
          "advisor-001",
          "high",
          "2026-07-15",
          false,
          null,
          sampleCycleIds[1],
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
            id,
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
          ORDER BY id
        `,
      );

      expect(rows.rows).toEqual([
        {
          id: sampleCycleIds[0],
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
          id: sampleCycleIds[1],
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
    await withDrizzleTestSchema(async (client) => {
      await seedSampleTenant(client);

      await expect(
        client.query(
          `
            INSERT INTO tax_plan_cycle (
              tenant_id,
              client_id,
              planning_period,
              stage,
              owner,
              priority,
              due_date,
              on_hold
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            sampleTenantId,
            "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d41",
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
    await withDrizzleTestSchema(async (client) => {
      const structure = await getTableStructure(client, "stage_transition");

      expect(structure.columns).toEqual(expectedStageTransitionColumns);
      expect(structure.constraints.stage_transition_id_pk?.type).toBe("p");
      expect(structure.constraints.stage_transition_id_pk?.definition).toContain(
        "PRIMARY KEY (id)",
      );
      expect(structure.indexes).toContain("stage_transition_case_id_idx");
      expect(structure.constraints.stage_transition_case_id_fk?.type).toBe(
        "f",
      );
      expect(
        structure.constraints.stage_transition_case_id_fk?.definition,
      ).toContain("FOREIGN KEY (case_id)");
      expect(
        structure.constraints.stage_transition_case_id_fk?.definition,
      ).toContain("REFERENCES public.tax_plan_cycle(id)");
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

      await seedSampleTenant(client);

      await client.query(
        `
          INSERT INTO tax_plan_cycle (
            id,
            client_id,
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
          sampleStageTransitionCaseId,
          sampleClientIds[0],
          sampleTenantId,
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
          sampleStageTransitionCaseId,
          "Intake",
          "Data Aggregation",
          "advisor-001",
          "2026-07-01T14:00:00.000Z",
        ],
      );

      const rows = await client.query(
        `
          SELECT
            id::int AS id,
            case_id,
            from_stage,
            to_stage,
            actor,
            occurred_at AT TIME ZONE 'UTC' AS occurred_at
          FROM stage_transition
          WHERE case_id = $1
        `,
        [sampleStageTransitionCaseId],
      );

      expect(rows.rows).toEqual([
        {
          id: 1,
          case_id: sampleStageTransitionCaseId,
          from_stage: "Intake",
          to_stage: "Data Aggregation",
          actor: "advisor-001",
          occurred_at: new Date("2026-07-01T18:00:00.000Z"),
        },
      ]);
    });
  });

  test("rejects stage transitions for missing cases", async () => {
    await withDrizzleTestSchema(async (client) => {
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
            sampleMissingCaseId,
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
    await withDrizzleTestSchema(async (client) => {
      await seedSampleTenant(client);

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
            sampleStageTransitionCaseId,
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
            sampleStageTransitionCaseId,
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
