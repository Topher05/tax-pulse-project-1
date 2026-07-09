import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { describe, expect, test } from "vitest";

import { stageTransition, taxPlanCycle, tenants } from "../../../src/typescript/db/schema.js";
import {
  applyDrizzleMigrations,
  drizzleAppliedMigrationsTableName,
  drizzleMigrationsDirectory,
} from "../../../src/typescript/postgresMigrations.js";
import { startDockerPostgresContainer } from "../bootstrap/dockerPostgres.js";
import { expectPgError, getTableStructure } from "../bootstrap/tableTestUtils.js";
import {
  expectedStageTransitionColumns,
  expectedStageTransitionRows,
  expectedTaxPlanCycleColumnTypes,
  expectedTaxPlanCycleColumns,
  expectedTaxPlanCycleRows,
  sampleClientIds,
  sampleCycleIds,
  sampleMissingCaseId,
  sampleStageTransitionCaseId,
  sampleStageTransitionId,
  sampleTenant,
  stageTransitionDbRowsSchema,
  taxPlanCycleDbRowsSchema,
} from "./taxPlanCycle.test.model.js";

async function withTaxPlanCycleIntegrationDatabase<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  const container = await startDockerPostgresContainer();
  const client = new Client({
    connectionString: container.connectionUri,
  });

  await client.connect();

  try {
    await client.query(`DROP SCHEMA IF EXISTS public CASCADE`);
    await client.query(`CREATE SCHEMA public`);
    await applyDrizzleMigrations(client);
    return await callback(client);
  } finally {
    await client.query("SET search_path TO public").catch(() => undefined);
    await client.end().catch(() => undefined);
    await container.stop();
  }
}

async function seedSampleTenant(client: Client): Promise<void> {
  const db = drizzle(client);

  await db.insert(tenants).values(sampleTenant);
}

describe("taxPlanCycle integration", () => {
  test("records applied migrations and skips them on rerun", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
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
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);

      await seedSampleTenant(client);

      const structure = await getTableStructure(client, "tax_plan_cycle");

      expect(structure.columns).toEqual(expectedTaxPlanCycleColumns);
      expect(structure.columnTypes).toEqual(expectedTaxPlanCycleColumnTypes);
      expect(structure.rowCount).toBe(0);
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
      ).toContain("REFERENCES tenants(id)");
      expect(structure.constraints.tax_plan_cycle_stage_check?.type).toBe("c");
      expect(
        structure.constraints.tax_plan_cycle_stage_check?.definition,
      ).toContain("Modeling");

      await db.insert(taxPlanCycle).values([
        {
          id: sampleCycleIds[0],
          clientId: sampleClientIds[0],
          tenantId: sampleTenant.id,
          planningPeriod: "2026-Q3",
          stage: "Intake",
          owner: "advisor-001",
          priority: "high",
          dueDate: "2026-07-15",
          onHold: false,
        },
        {
          id: sampleCycleIds[1],
          clientId: sampleClientIds[1],
          tenantId: sampleTenant.id,
          planningPeriod: "2026-Q4",
          stage: "Review",
          owner: "advisor-002",
          priority: "medium",
          dueDate: "2026-08-20",
          onHold: true,
          holdReason: "Awaiting broker statements",
        },
      ]);

      const rows = await db
        .select({
          id: taxPlanCycle.id,
          client_id: taxPlanCycle.clientId,
          tenant_id: taxPlanCycle.tenantId,
          planning_period: taxPlanCycle.planningPeriod,
          stage: taxPlanCycle.stage,
          owner: taxPlanCycle.owner,
          priority: taxPlanCycle.priority,
          due_date: taxPlanCycle.dueDate,
          on_hold: taxPlanCycle.onHold,
          hold_reason: taxPlanCycle.holdReason,
        })
        .from(taxPlanCycle)
        .orderBy(asc(taxPlanCycle.id));

      expect(taxPlanCycleDbRowsSchema.parse(rows)).toEqual(
        expectedTaxPlanCycleRows,
      );
    });
  });

  test("rejects invalid stage values", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);

      await seedSampleTenant(client);

      await expectPgError(
        db.insert(taxPlanCycle).values({
          tenantId: sampleTenant.id,
          clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d41",
          planningPeriod: "2026-Q3",
          stage: "Planning",
          owner: "advisor-003",
          priority: "low",
          dueDate: "2026-09-01",
          onHold: false,
        }),
        { code: "23514", constraint: "tax_plan_cycle_stage_check" },
      );
    });
  });

  test("creates the stage transition table and persists transition history", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);

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
      ).toContain("REFERENCES tax_plan_cycle(id)");
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

      await db.insert(taxPlanCycle).values({
        id: sampleStageTransitionCaseId,
        clientId: sampleClientIds[0],
        tenantId: sampleTenant.id,
        planningPeriod: "2026-Q3",
        stage: "Data Aggregation",
        owner: "advisor-001",
        priority: "high",
        dueDate: "2026-07-15",
        onHold: false,
      });

      await db.insert(stageTransition).values({
        id: sampleStageTransitionId,
        caseId: sampleStageTransitionCaseId,
        fromStage: "Intake",
        toStage: "Data Aggregation",
        actor: "advisor-001",
        occurredAt: new Date("2026-07-01T14:00:00.000Z"),
      });

      const rows = await db
        .select({
          id: stageTransition.id,
          case_id: stageTransition.caseId,
          from_stage: stageTransition.fromStage,
          to_stage: stageTransition.toStage,
          actor: stageTransition.actor,
          occurred_at: stageTransition.occurredAt,
        })
        .from(stageTransition)
        .where(eq(stageTransition.caseId, sampleStageTransitionCaseId));

      expect(stageTransitionDbRowsSchema.parse(rows)).toEqual(
        expectedStageTransitionRows,
      );
    });
  });

  test("rejects stage transitions for missing cases", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);

      await expectPgError(
        db.insert(stageTransition).values({
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d35",
          caseId: sampleMissingCaseId,
          fromStage: "Intake",
          toStage: "Data Aggregation",
          actor: "advisor-001",
          occurredAt: new Date("2026-07-01T14:00:00.000Z"),
        }),
        { code: "23503", constraint: "stage_transition_case_id_fk" },
      );
    });
  });

  test("rejects invalid stage transition stage values", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);

      await seedSampleTenant(client);

      await db.insert(taxPlanCycle).values({
        id: sampleStageTransitionCaseId,
        clientId: sampleClientIds[0],
        tenantId: sampleTenant.id,
        planningPeriod: "2026-Q3",
        stage: "Data Aggregation",
        owner: "advisor-001",
        priority: "high",
        dueDate: "2026-07-15",
        onHold: false,
      });

      await expectPgError(
        db.insert(stageTransition).values({
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d36",
          caseId: sampleStageTransitionCaseId,
          fromStage: "Planning",
          toStage: "Data Aggregation",
          actor: "advisor-001",
          occurredAt: new Date("2026-07-01T14:00:00.000Z"),
        }),
        { code: "23514", constraint: "stage_transition_from_stage_check" },
      );

      await expectPgError(
        db.insert(stageTransition).values({
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d37",
          caseId: sampleStageTransitionCaseId,
          fromStage: "Intake",
          toStage: "Planning",
          actor: "advisor-001",
          occurredAt: new Date("2026-07-01T14:00:00.000Z"),
        }),
        { code: "23514", constraint: "stage_transition_to_stage_check" },
      );
    });
  });
});
