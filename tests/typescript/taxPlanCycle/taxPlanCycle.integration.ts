import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { once } from "node:events";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { Client } from "pg";
import type { RequestHandler } from "express";
import { describe, expect, test } from "vitest";

import {
  createApp,
  createLogger,
  createTaxPlanCycleCreateController,
  createTaxPlanCycleReadHelper,
  createTaxPlanCycleRepository,
  createTaxPlanCycleRouter,
  stageTransition,
  taxPlanCycle,
  taxPlanCycleSchema,
  tenants,
} from "../../../src/typescript/index.js";
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
  taxPlanCycleRepositoryQueueItemsSchema,
  taxPlanCycleDbRowsSchema,
} from "./taxPlanCycle.test.model.js";

const sampleTenantIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
] as const;

const repositoryTenantIds = {
  primary: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d41",
  secondary: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d42",
} as const;

const repositoryClientIds = {
  primary: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d45",
  secondary: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d46",
} as const;

const repositoryQueueTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d47";
const repositoryQueueOtherTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d48";
const repositoryQueueCycleIds = {
  overdue: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d49",
  onHold: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d4a",
  future: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d4b",
  otherTenant: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d4c",
} as const;
const repositoryQueueClientIds = {
  overdue: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d4d",
  onHold: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d4e",
  future: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d4f",
  otherTenant: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d50",
} as const;

const silentLogger = createLogger({ level: "silent" });

const attachRequestContext: RequestHandler = (req, _res, next) => {
  (req as typeof req & { tenant: { id: string } }).tenant = {
    id: sampleTenant.id,
  };
  (req as typeof req & { user: { id: string } }).user = {
    id: "advisor-route-actor-001",
  };
  next();
};

async function withRouteServer(
  repository: ReturnType<typeof createTaxPlanCycleRepository>,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(attachRequestContext);
      app.use(
        createTaxPlanCycleRouter({
          controller: createTaxPlanCycleCreateController(repository),
        }),
      );
    },
  });

  const server = app.listen(0);
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

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

  test("scopes repository reads and preserves insert round-trips", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);
      const readHelper = createTaxPlanCycleReadHelper(client);

      await db.insert(tenants).values([
        {
          id: repositoryTenantIds.primary,
          name: "Repository Primary Tenant",
          createdAt: new Date("2026-06-29T15:00:00Z"),
        },
        {
          id: repositoryTenantIds.secondary,
          name: "Repository Secondary Tenant",
          createdAt: new Date("2026-06-29T15:30:00Z"),
        },
      ]);

      const primaryCaseId = await repository.insert({
        tenantId: repositoryTenantIds.primary,
        planningPeriod: "2026-Q1",
        cycle: {
          client_id: repositoryClientIds.primary,
          stage: "Intake",
          owner: "advisor-repo-001",
          priority: "low",
          due_date: "2026-09-30",
          on_hold: false,
        },
      });
      const secondaryCaseId = await repository.insert({
        tenantId: repositoryTenantIds.secondary,
        planningPeriod: "2026-Q2",
        cycle: {
          client_id: repositoryClientIds.secondary,
          stage: "Review",
          owner: "advisor-repo-002",
          priority: "medium",
          due_date: "2026-08-15",
          on_hold: true,
          hold_reason: "Awaiting client documents",
        },
      });

      await expect(
        readHelper.findByCaseId({
          tenantId: repositoryTenantIds.primary,
          caseId: primaryCaseId,
        }),
      ).resolves.toEqual(
        taxPlanCycleSchema.parse({
          id: primaryCaseId,
          client_id: repositoryClientIds.primary,
          stage: "Intake",
          owner: "advisor-repo-001",
          priority: "low",
          due_date: "2026-09-30",
          on_hold: false,
        }),
      );

      await expect(
        readHelper.findByCaseId({
          tenantId: repositoryTenantIds.primary,
          caseId: secondaryCaseId,
        }),
      ).resolves.toBeNull();

      await expect(
        readHelper.findByCaseId({
          tenantId: repositoryTenantIds.secondary,
          caseId: secondaryCaseId,
        }),
      ).resolves.toEqual(
        taxPlanCycleSchema.parse({
          id: secondaryCaseId,
          client_id: repositoryClientIds.secondary,
          stage: "Intake",
          owner: "advisor-repo-002",
          priority: "medium",
          due_date: "2026-08-15",
          on_hold: true,
          hold_reason: "Awaiting client documents",
        }),
      );
    });
  });

  test("lists a tenant's queue by due date and flags overdue cycles", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);

      await db.insert(tenants).values([
        {
          id: repositoryQueueTenantId,
          name: "Queue Tenant Advisors",
          createdAt: new Date("2026-06-29T16:00:00Z"),
        },
        {
          id: repositoryQueueOtherTenantId,
          name: "Other Queue Tenant",
          createdAt: new Date("2026-06-29T16:30:00Z"),
        },
      ]);

      await db.insert(taxPlanCycle).values([
        {
          id: repositoryQueueCycleIds.overdue,
          clientId: repositoryQueueClientIds.overdue,
          tenantId: repositoryQueueTenantId,
          planningPeriod: "2026-Q1",
          stage: "Intake",
          owner: "advisor-queue-001",
          priority: "medium",
          dueDate: "2026-07-10",
          onHold: false,
        },
        {
          id: repositoryQueueCycleIds.onHold,
          clientId: repositoryQueueClientIds.onHold,
          tenantId: repositoryQueueTenantId,
          planningPeriod: "2026-Q2",
          stage: "Review",
          owner: "advisor-queue-002",
          priority: "high",
          dueDate: "2026-07-15",
          onHold: true,
          holdReason: "Client upload pending",
        },
        {
          id: repositoryQueueCycleIds.future,
          clientId: repositoryQueueClientIds.future,
          tenantId: repositoryQueueTenantId,
          planningPeriod: "2026-Q3",
          stage: "Modeling",
          owner: "advisor-queue-003",
          priority: "low",
          dueDate: "2026-07-20",
          onHold: false,
        },
        {
          id: repositoryQueueCycleIds.otherTenant,
          clientId: repositoryQueueClientIds.otherTenant,
          tenantId: repositoryQueueOtherTenantId,
          planningPeriod: "2026-Q4",
          stage: "Executed",
          owner: "advisor-queue-004",
          priority: "medium",
          dueDate: "2026-07-01",
          onHold: false,
        },
      ]);

      const rows = await repository.listQueue({
        tenantId: repositoryQueueTenantId,
        asOfDate: "2026-07-15",
      });

      expect(taxPlanCycleRepositoryQueueItemsSchema.parse(rows)).toEqual([
        {
          id: repositoryQueueCycleIds.overdue,
          client_id: repositoryQueueClientIds.overdue,
          stage: "Intake",
          owner: "advisor-queue-001",
          priority: "medium",
          due_date: "2026-07-10",
          on_hold: false,
          is_overdue: true,
        },
        {
          id: repositoryQueueCycleIds.onHold,
          client_id: repositoryQueueClientIds.onHold,
          stage: "Review",
          owner: "advisor-queue-002",
          priority: "high",
          due_date: "2026-07-15",
          on_hold: true,
          hold_reason: "Client upload pending",
          is_overdue: false,
        },
        {
          id: repositoryQueueCycleIds.future,
          client_id: repositoryQueueClientIds.future,
          stage: "Modeling",
          owner: "advisor-queue-003",
          priority: "low",
          due_date: "2026-07-20",
          on_hold: false,
          is_overdue: false,
        },
      ]);
    });
  });

  test("scopes reads to the request tenant by generated case ID", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleReadHelper(client);

      await db.insert(tenants).values([
        {
          id: sampleTenantIds[0],
          name: "Generated Sample Tenant One",
          createdAt: new Date("2026-06-29T13:00:00Z"),
        },
        {
          id: sampleTenantIds[1],
          name: "Generated Sample Tenant Two",
          createdAt: new Date("2026-06-29T13:30:00Z"),
        },
      ]);

      await db.insert(taxPlanCycle).values([
        {
          id: sampleCycleIds[0],
          clientId: sampleClientIds[0],
          tenantId: sampleTenantIds[0],
          planningPeriod: "2026-Q3",
          stage: "Review",
          owner: "advisor-001",
          priority: "high",
          dueDate: "2026-07-15",
          onHold: false,
        },
        {
          id: sampleCycleIds[1],
          clientId: sampleClientIds[1],
          tenantId: sampleTenantIds[1],
          planningPeriod: "2026-Q4",
          stage: "Intake",
          owner: "advisor-002",
          priority: "medium",
          dueDate: "2026-08-15",
          onHold: true,
          holdReason: "Awaiting client documents",
        },
      ]);

      await expect(
        repository.findByCaseId({
          tenantId: sampleTenantIds[0],
          caseId: sampleCycleIds[0],
        }),
      ).resolves.toEqual({
        id: sampleCycleIds[0],
        client_id: sampleClientIds[0],
        stage: "Review",
        owner: "advisor-001",
        priority: "high",
        due_date: "2026-07-15",
        on_hold: false,
      });

      await expect(
        repository.findByCaseId({
          tenantId: sampleTenantIds[0],
          caseId: sampleCycleIds[1],
        }),
      ).resolves.toBeNull();

      await expect(
        repository.findByCaseId({
          tenantId: sampleTenantIds[1],
          caseId: sampleCycleIds[1],
        }),
      ).resolves.toEqual({
        id: sampleCycleIds[1],
        client_id: sampleClientIds[1],
        stage: "Intake",
        owner: "advisor-002",
        priority: "medium",
        due_date: "2026-08-15",
        on_hold: true,
        hold_reason: "Awaiting client documents",
      });
    });
  });

  test("creates a cycle in Intake through Drizzle and reads it back", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);

      await seedSampleTenant(client);

      const caseId = await repository.create({
        tenantId: sampleTenant.id,
        planningPeriod: "2026-Q1",
        clientId: repositoryClientIds.primary,
        owner: "advisor-003",
        priority: "low",
        dueDate: "2026-09-30",
        actor: "advisor-003",
      });

      expect(caseId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      await expect(
        repository.findByCaseId({
          tenantId: sampleTenant.id,
          caseId,
        }),
      ).resolves.toEqual({
        id: caseId,
        client_id: repositoryClientIds.primary,
        stage: "Intake",
        owner: "advisor-003",
        priority: "low",
        due_date: "2026-09-30",
        on_hold: false,
      });

      await expect(
        repository.findByCaseId({
          tenantId: sampleTenantIds[1],
          caseId,
        }),
      ).resolves.toBeNull();

      const transitionRows = await db
        .select({
          id: stageTransition.id,
          case_id: stageTransition.caseId,
          from_stage: stageTransition.fromStage,
          to_stage: stageTransition.toStage,
          actor: stageTransition.actor,
          occurred_at: stageTransition.occurredAt,
        })
        .from(stageTransition)
        .where(eq(stageTransition.caseId, caseId));

      expect(stageTransitionDbRowsSchema.parse(transitionRows)).toHaveLength(1);
      expect(transitionRows[0]).toMatchObject({
        case_id: caseId,
        from_stage: "Intake",
        to_stage: "Intake",
        actor: "advisor-003",
      });
      expect(transitionRows[0]?.occurred_at).toBeInstanceOf(Date);
    });
  });

  test("POST creates a tenant-scoped Intake cycle and initial transition", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);

      await seedSampleTenant(client);

      await withRouteServer(repository, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/tax-plan-cycles`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
            planning_period: "2026-Q2",
            owner: "advisor-route-owner-001",
            priority: "medium",
            due_date: "2026-10-15",
          }),
        });
        const body = (await response.json()) as { case_id: string };

        expect(response.status).toBe(202);
        expect(body.case_id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );

        await expect(
          repository.findByCaseId({
            tenantId: sampleTenant.id,
            caseId: body.case_id,
          }),
        ).resolves.toEqual({
          id: body.case_id,
          client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
          stage: "Intake",
          owner: "advisor-route-owner-001",
          priority: "medium",
          due_date: "2026-10-15",
          on_hold: false,
        });

        await expect(
          repository.findByCaseId({
            tenantId: sampleTenantIds[1],
            caseId: body.case_id,
          }),
        ).resolves.toBeNull();

        const transitionRows = await db
          .select({
            id: stageTransition.id,
            case_id: stageTransition.caseId,
            from_stage: stageTransition.fromStage,
            to_stage: stageTransition.toStage,
            actor: stageTransition.actor,
            occurred_at: stageTransition.occurredAt,
          })
          .from(stageTransition)
          .where(eq(stageTransition.caseId, body.case_id));

        expect(stageTransitionDbRowsSchema.parse(transitionRows)).toHaveLength(1);
        expect(transitionRows[0]).toMatchObject({
          case_id: body.case_id,
          from_stage: "Intake",
          to_stage: "Intake",
          actor: "advisor-route-actor-001",
        });
        expect(transitionRows[0]?.occurred_at).toBeInstanceOf(Date);
      });
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
