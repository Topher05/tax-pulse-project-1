import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";

import {
  applyMigrations,
  isPsqlAvailable,
  runPsqlScript,
} from "../../src/typescript/postgresMigrations.js";

const databaseUrl = process.env.DATABASE_URL;
const canRunIntegration = databaseUrl !== undefined && isPsqlAvailable();
const describeIfDatabase = canRunIntegration ? describe : describe.skip;

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

function createTestSchemaName(): string {
  return `taxpulse_migration_${randomUUID().replace(/-/g, "")}`;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function schemaPrelude(schemaName: string): string {
  return [
    `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE;`,
    `CREATE SCHEMA ${quoteIdentifier(schemaName)};`,
    `SET search_path TO ${quoteIdentifier(schemaName)}, public;`,
    "CREATE TABLE tenants (id text PRIMARY KEY);",
    "INSERT INTO tenants (id) VALUES ('tenant-001'), ('tenant-002');",
  ].join("\n");
}

function applyTestMigration(schemaName: string): void {
  applyMigrations(databaseUrl!, {
    preludeSql: `SET search_path TO ${quoteIdentifier(schemaName)}, public;`,
  });
}

describeIfDatabase("tax plan cycle migration", () => {
  test("creates the table, verifies it is empty, and persists two records", () => {
    const schemaName = createTestSchemaName();

    try {
      runPsqlScript(databaseUrl!, schemaPrelude(schemaName));
      applyTestMigration(schemaName);

      const structureJson = runPsqlScript(
        databaseUrl!,
        [
          `SET search_path TO ${quoteIdentifier(schemaName)}, public;`,
          `SELECT json_build_object(
            'row_count', (SELECT count(*) FROM tax_plan_cycle),
            'columns', (
              SELECT json_agg(column_name ORDER BY ordinal_position)
              FROM information_schema.columns
              WHERE table_schema = current_schema()
                AND table_name = 'tax_plan_cycle'
            ),
            'constraints', (
              SELECT json_object_agg(
                conname,
                json_build_object(
                  'type', contype,
                  'definition', pg_get_constraintdef(oid)
                )
              )
              FROM pg_constraint
              WHERE conrelid = 'tax_plan_cycle'::regclass
            ),
            'indexes', (
              SELECT json_agg(indexname ORDER BY indexname)
              FROM pg_indexes
              WHERE schemaname = current_schema()
                AND tablename = 'tax_plan_cycle'
            )
          )::text;`,
        ].join("\n"),
      );
      const structure = JSON.parse(structureJson) as {
        columns: string[];
        constraints: Record<
          string,
          { definition: string; type: string }
        >;
        indexes: string[];
        row_count: number;
      };

      expect(structure.row_count).toBe(0);
      expect(structure.columns).toEqual(expectedColumns);
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
      ).toContain("REFERENCES tenants");
      expect(
        structure.constraints.tax_plan_cycle_tenant_id_fk?.definition,
      ).toContain("(id)");
      expect(structure.constraints.tax_plan_cycle_stage_check?.type).toBe("c");
      expect(
        structure.constraints.tax_plan_cycle_stage_check?.definition,
      ).toContain("Modeling Advisor");

      runPsqlScript(
        databaseUrl!,
        [
          `SET search_path TO ${quoteIdentifier(schemaName)}, public;`,
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
              (
                'client-001',
                'tenant-001',
                '2026-Q3',
                'Intake',
                'advisor-001',
                'high',
                '2026-07-15',
                FALSE,
                NULL
              ),
              (
                'client-002',
                'tenant-001',
                '2026-Q4',
                'Review',
                'advisor-002',
                'medium',
                '2026-08-20',
                TRUE,
                'Awaiting broker statements'
              );
          `,
        ].join("\n"),
      );

      const rowsJson = runPsqlScript(
        databaseUrl!,
        [
          `SET search_path TO ${quoteIdentifier(schemaName)}, public;`,
          `
            SELECT json_agg(row_to_json(records) ORDER BY client_id)::text
            FROM (
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
            ) AS records;
          `,
        ].join("\n"),
      );
      const rows = JSON.parse(rowsJson) as Array<{
        client_id: string;
        due_date: string;
        hold_reason: string | null;
        on_hold: boolean;
        owner: string;
        planning_period: string;
        priority: string;
        stage: string;
        tenant_id: string;
      }>;

      expect(rows).toEqual([
        {
          client_id: "client-001",
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
    } finally {
      runPsqlScript(
        databaseUrl!,
        `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE;`,
      );
    }
  });

  test("rejects invalid stage values", () => {
    const schemaName = createTestSchemaName();

    try {
      runPsqlScript(databaseUrl!, schemaPrelude(schemaName));
      applyTestMigration(schemaName);

      expect(() =>
        runPsqlScript(
          databaseUrl!,
          [
            `SET search_path TO ${quoteIdentifier(schemaName)}, public;`,
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
              ) VALUES (
                'client-invalid',
                'tenant-001',
                '2026-Q3',
                'Planning',
                'advisor-003',
                'low',
                '2026-09-01',
                FALSE
              );
            `,
          ].join("\n"),
        ),
      ).toThrow();
    } finally {
      runPsqlScript(
        databaseUrl!,
        `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE;`,
      );
    }
  });
});
