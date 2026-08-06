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
  createAuditEntryRepository,
  createAuditEntryWriter,
  createLogger,
  buildTaxPlanCycleCreateIdempotencyKey,
  createRedisTaxPlanCycleCreateIdempotencyStore,
  createJwtAuthenticationMiddleware,
  createTaxPlanCycleCreateController,
  createTaxPlanCycleReadHelper,
  createTaxPlanCycleRepository,
  createTaxPlanCycleRouter,
  createTaxPlanCycleTransitionController,
  type JwtConfig,
  auditEntry,
  outboxEvent,
  redactedAuditAmount,
  stageChangedCloudEventSchemaV1,
  stageTransition,
  taxPlanCycle,
  taxPlanCycleSchema,
  tenants,
  type AuditEntryWriter,
  type TaxPlanCycleCreateIdempotencyClient,
} from "../../../../src/typescript/index.js";
import { applySeed } from "../../../../src/typescript/shared/database/seed.js";
import {
  drizzleMigrationsDirectory,
  migrateDatabase,
} from "../../../../src/typescript/shared/database/migrate.js";
import { startDockerPostgresContainer } from "../../bootstrap/dockerPostgres.js";
import {
  hydrateUserClaims,
  obtainAccessTokenViaLoginAndMfa,
} from "../../bootstrap/authFlow.js";
import { expectPgError, getTableStructure } from "../../bootstrap/tableTestUtils.js";
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
const authConfig: JwtConfig = {
  issuer: "https://auth.taxpulse.example",
  signingSecret: "a-unique-test-secret-that-is-more-than-32-bytes",
  accessTokenLifetimeSeconds: 900,
  refreshTokenLifetimeSeconds: 2_592_000,
};
const advisorEditPermissions = { Advisor: ["EDIT"] } as const;
const briannaAuthPrincipal = {
  tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
  userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
  email: "brianna@example.com",
  role: "Advisor" as const,
  password: "correct-password",
  totpSecret: "KRSXG5DSNFXGOIDSMVZXI2LOM5XXE3DE",
  totpCode: "123456",
} as const;
const briannaSeedCycleId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12";

function createInMemoryCreateIdempotencyClient(): TaxPlanCycleCreateIdempotencyClient & {
  store: Map<string, string>;
  setCalls: Array<{
    key: string;
    value: string;
    options?: { EX?: number; NX?: boolean };
  }>;
} {
  const store = new Map<string, string>();
  const setCalls: Array<{
    key: string;
    value: string;
    options?: { EX?: number; NX?: boolean };
  }> = [];

  return {
    store,
    setCalls,
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value, options) {
      setCalls.push({ key, value, options });

      if (options?.NX && store.has(key)) {
        return null;
      }

      store.set(key, value);
      return "OK";
    },
    async del(key) {
      store.delete(key);
      return 1;
    },
  };
}

async function createAccessToken(input: {
  tenantId: string;
  userId: string;
  email: string;
  role: "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin";
  password: string;
  totpSecret: string;
  totpCode: string;
}): Promise<string> {
  const result = await obtainAccessTokenViaLoginAndMfa({
    config: authConfig,
    principal: {
      tenantId: input.tenantId,
      userId: input.userId,
      email: input.email,
      role: input.role,
      password: input.password,
      totpSecret: input.totpSecret,
      totpCode: input.totpCode,
    },
  });

  return result.access_token;
}

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
  run: (
    baseUrl: string,
    idempotencyClient: ReturnType<typeof createInMemoryCreateIdempotencyClient>,
  ) => Promise<void>,
): Promise<void> {
  const idempotencyClient = createInMemoryCreateIdempotencyClient();
  const idempotencyStore = createRedisTaxPlanCycleCreateIdempotencyStore(
    idempotencyClient,
  );
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(attachRequestContext);
      app.use(
        "/v1",
        createTaxPlanCycleRouter({
          controller: createTaxPlanCycleCreateController(repository, {
            idempotencyStore,
          }),
        }),
      );
    },
  });

  const server = app.listen(0);
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`, idempotencyClient);
  } finally {
    server.close();
    await once(server, "close");
  }
}

async function withTransitionRouteServer(
  repository: ReturnType<typeof createTaxPlanCycleRepository>,
  auditEntryWriter: AuditEntryWriter,
  permissionsForRole: Partial<
    Record<
      "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin",
      ReadonlyArray<string>
    >
  >,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(createJwtAuthenticationMiddleware({ config: authConfig }));
      app.use(hydrateUserClaims(permissionsForRole));
      app.use(
        createTaxPlanCycleRouter({
          controller: createTaxPlanCycleCreateController(repository, {
            idempotencyStore: createRedisTaxPlanCycleCreateIdempotencyStore(
              createInMemoryCreateIdempotencyClient(),
            ),
          }),
          transitionController: createTaxPlanCycleTransitionController(
            repository,
          ),
          auditEntryWriter,
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
  callback: (client: Client, connectionString: string) => Promise<T>,
): Promise<T> {
  const container = await startDockerPostgresContainer();
  const client = new Client({
    connectionString: container.connectionUri,
  });

  await client.connect();

  try {
    await client.query(`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await client.query(`DROP SCHEMA IF EXISTS public CASCADE`);
    await client.query(`CREATE SCHEMA public`);
    await migrateDatabase(client);
    return await callback(client, container.connectionUri);
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
      await migrateDatabase(client);

      const migrationFiles = readdirSync(drizzleMigrationsDirectory)
        .filter((fileName) => fileName.endsWith(".sql"))
        .sort((left, right) => left.localeCompare(right));
      const appliedRows = await client.query(
        `
          SELECT COUNT(*)::integer AS migration_count
          FROM drizzle.__drizzle_migrations
        `,
      );

      expect(appliedRows.rows[0]?.migration_count).toBe(migrationFiles.length);
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
    expect(migrationSql).not.toContain('CREATE TABLE "tax_plan_cycle_idempotency_key"');
    expect(migrationSql).not.toContain("tax_plan_cycle_idempotency_key_tenant_key_idx");
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
          loginSlug: "repository-primary",
        },
        {
          id: repositoryTenantIds.secondary,
          name: "Repository Secondary Tenant",
          createdAt: new Date("2026-06-29T15:30:00Z"),
          loginSlug: "repository-secondary",
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
          loginSlug: "queue-tenant-advisors",
        },
        {
          id: repositoryQueueOtherTenantId,
          name: "Other Queue Tenant",
          createdAt: new Date("2026-06-29T16:30:00Z"),
          loginSlug: "other-queue-tenant",
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
          loginSlug: "generated-sample-one",
        },
        {
          id: sampleTenantIds[1],
          name: "Generated Sample Tenant Two",
          createdAt: new Date("2026-06-29T13:30:00Z"),
          loginSlug: "generated-sample-two",
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

      const auditRows = await db
        .select({
          case_id: auditEntry.caseId,
          actor: auditEntry.actor,
          action: auditEntry.action,
          outcome: auditEntry.outcome,
          occurred_at: auditEntry.occurredAt,
        })
        .from(auditEntry)
        .where(eq(auditEntry.caseId, caseId));

      expect(auditRows).toHaveLength(1);
      expect(auditRows[0]).toMatchObject({
        case_id: caseId,
        actor: "advisor-003",
        action: "stage_transition:Intake->Intake",
        outcome: "succeeded",
      });
      expect(auditRows[0]?.occurred_at).toEqual(transitionRows[0]?.occurred_at);
    });
  });

  test("redacts audit output without mutating stored audit entries", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const auditRepository = createAuditEntryRepository(client);

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

      await db.insert(auditEntry).values({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d72",
        caseId: sampleStageTransitionCaseId,
        actor: "advisor-001",
        action: "income amount 125000 collected and deduction amount $18,500 reviewed",
        outcome: "succeeded with withholding 1,400",
        occurredAt: new Date("2026-07-20T14:00:00.000Z"),
      });

      const output = await auditRepository.listByCase({
        tenantId: sampleTenant.id,
        caseId: sampleStageTransitionCaseId,
      });
      const storedRows = await db
        .select({
          action: auditEntry.action,
          outcome: auditEntry.outcome,
        })
        .from(auditEntry)
        .where(eq(auditEntry.caseId, sampleStageTransitionCaseId));

      expect(output).toEqual([
        {
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d72",
          case_id: sampleStageTransitionCaseId,
          actor: "advisor-001",
          action: `income amount ${redactedAuditAmount} collected and deduction amount ${redactedAuditAmount} reviewed`,
          outcome: `succeeded with withholding ${redactedAuditAmount}`,
          occurred_at: "2026-07-20T14:00:00.000Z",
        },
      ]);
      expect(JSON.stringify(output)).not.toContain("125000");
      expect(JSON.stringify(output)).not.toContain("$18,500");
      expect(JSON.stringify(output)).not.toContain("1,400");
      expect(storedRows).toEqual([
        {
          action:
            "income amount 125000 collected and deduction amount $18,500 reviewed",
          outcome: "succeeded with withholding 1,400",
        },
      ]);
    });
  });

  test("POST creates a tenant-scoped Intake cycle and initial transition", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);

      await seedSampleTenant(client);

      await withRouteServer(repository, async (baseUrl, idempotencyClient) => {
        const response = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "Idempotency-Key": "case-create-key-000",
          },
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

        const auditRows = await db
          .select({
            case_id: auditEntry.caseId,
            actor: auditEntry.actor,
            action: auditEntry.action,
            outcome: auditEntry.outcome,
            occurred_at: auditEntry.occurredAt,
          })
          .from(auditEntry)
          .where(eq(auditEntry.caseId, body.case_id));

        expect(auditRows).toHaveLength(1);
        expect(auditRows[0]).toMatchObject({
          case_id: body.case_id,
          actor: "advisor-route-actor-001",
          action: "stage_transition:Intake->Intake",
          outcome: "succeeded",
        });
        expect(auditRows[0]?.occurred_at).toEqual(transitionRows[0]?.occurred_at);
      });
    });
  });

  test("POST with the same Idempotency-Key returns the original case ID", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);

      await seedSampleTenant(client);

      await withRouteServer(repository, async (baseUrl, idempotencyClient) => {
        const createBody = {
          client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
          planning_period: "2026-Q2",
          owner: "advisor-route-owner-002",
          priority: "medium",
          due_date: "2026-10-20",
        };
        const request = {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "Idempotency-Key": "case-create-key-001",
          },
          body: JSON.stringify(createBody),
        };

        const firstResponse = await fetch(`${baseUrl}/v1/tax-plan-cycles`, request);
        expect(firstResponse.status).toBe(202);
        const firstBody = (await firstResponse.json()) as { case_id: string };
        const repeatResponse = await fetch(`${baseUrl}/v1/tax-plan-cycles`, request);
        expect(repeatResponse.status).toBe(202);
        const repeatBody = (await repeatResponse.json()) as { case_id: string };

        expect(repeatBody).toEqual(firstBody);

        const cycleRows = await db
          .select({ id: taxPlanCycle.id })
          .from(taxPlanCycle)
          .where(eq(taxPlanCycle.tenantId, sampleTenant.id));
        const transitionRows = await db
          .select({ id: stageTransition.id })
          .from(stageTransition)
          .where(eq(stageTransition.caseId, firstBody.case_id));
        const auditRows = await db
          .select({ id: auditEntry.id })
          .from(auditEntry)
          .where(eq(auditEntry.caseId, firstBody.case_id));
        const idempotencyRedisKey = buildTaxPlanCycleCreateIdempotencyKey({
          tenantId: sampleTenant.id,
          idempotencyKey: "case-create-key-001",
        });

        expect(cycleRows).toEqual([{ id: firstBody.case_id }]);
        expect(transitionRows).toHaveLength(1);
        expect(auditRows).toHaveLength(1);
        expect(idempotencyClient.store.get(idempotencyRedisKey)).toBe(
          JSON.stringify({
            status: "completed",
            result: firstBody,
          }),
        );
        expect(idempotencyClient.setCalls).toContainEqual(
          expect.objectContaining({
            key: idempotencyRedisKey,
            options: { EX: 86_400 },
          }),
        );
      });
    });
  });

  test("concurrent creates with the same Idempotency-Key create one cycle", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client, connectionString) => {
      const db = drizzle(client);
      const firstClient = new Client({ connectionString });
      const secondClient = new Client({ connectionString });

      await seedSampleTenant(client);
      await client.query(`
        CREATE OR REPLACE FUNCTION slow_tax_plan_cycle_insert()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          PERFORM pg_sleep(0.1);
          RETURN NEW;
        END;
        $$;
      `);
      await client.query(`
        CREATE TRIGGER slow_tax_plan_cycle_insert_trigger
        BEFORE INSERT ON tax_plan_cycle
        FOR EACH ROW
        EXECUTE FUNCTION slow_tax_plan_cycle_insert();
      `);
      await firstClient.connect();
      await secondClient.connect();

      try {
        const idempotencyClient = createInMemoryCreateIdempotencyClient();
        const idempotencyStore = createRedisTaxPlanCycleCreateIdempotencyStore(
          idempotencyClient,
        );
        const firstRepository = createTaxPlanCycleRepository(firstClient);
        const secondRepository = createTaxPlanCycleRepository(secondClient);
        const firstController = createTaxPlanCycleCreateController(firstRepository, {
          idempotencyStore,
        });
        const secondController = createTaxPlanCycleCreateController(secondRepository, {
          idempotencyStore,
        });
        const createInput = {
          tenantId: sampleTenant.id,
          planning_period: "2026-Q2",
          client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
          owner: "advisor-concurrent-001",
          priority: "high",
          due_date: "2026-10-31",
          actor: "advisor-concurrent-001",
          idempotencyKey: "case-create-key-concurrent-001",
        } as const;

        const [firstResult, secondResult] = await Promise.all([
          firstController.create(createInput),
          secondController.create(createInput),
        ]);

        expect(secondResult).toEqual(firstResult);

        const cycleRows = await db
          .select({ id: taxPlanCycle.id })
          .from(taxPlanCycle)
          .where(eq(taxPlanCycle.tenantId, sampleTenant.id));
        const transitionRows = await db
          .select({ id: stageTransition.id })
          .from(stageTransition)
          .where(eq(stageTransition.caseId, firstResult.case_id));
        const auditRows = await db
          .select({ id: auditEntry.id })
          .from(auditEntry)
          .where(eq(auditEntry.caseId, firstResult.case_id));
        const idempotencyRedisKey = buildTaxPlanCycleCreateIdempotencyKey({
          tenantId: sampleTenant.id,
          idempotencyKey: "case-create-key-concurrent-001",
        });

        expect(cycleRows).toEqual([{ id: firstResult.case_id }]);
        expect(transitionRows).toHaveLength(1);
        expect(auditRows).toHaveLength(1);
        expect(idempotencyClient.store.get(idempotencyRedisKey)).toBe(
          JSON.stringify({
            status: "completed",
            result: firstResult,
          }),
        );
      } finally {
        await firstClient.end().catch(() => undefined);
        await secondClient.end().catch(() => undefined);
      }
    });
  });

  test("POST with distinct Idempotency-Key values creates distinct cycles", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);

      await seedSampleTenant(client);

      await withRouteServer(repository, async (baseUrl, idempotencyClient) => {
        const createBody = {
          client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d63",
          planning_period: "2026-Q3",
          owner: "advisor-route-owner-003",
          priority: "high",
          due_date: "2026-11-15",
        };

        const firstResponse = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "Idempotency-Key": "case-create-key-002",
          },
          body: JSON.stringify(createBody),
        });
        const secondResponse = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "Idempotency-Key": "case-create-key-003",
          },
          body: JSON.stringify(createBody),
        });
        const firstBody = (await firstResponse.json()) as { case_id: string };
        const secondBody = (await secondResponse.json()) as { case_id: string };

        expect(firstResponse.status).toBe(202);
        expect(secondResponse.status).toBe(202);
        expect(secondBody.case_id).not.toBe(firstBody.case_id);

        const cycleRows = await db
          .select({ id: taxPlanCycle.id })
          .from(taxPlanCycle)
          .where(eq(taxPlanCycle.tenantId, sampleTenant.id));
        const firstRedisKey = buildTaxPlanCycleCreateIdempotencyKey({
          tenantId: sampleTenant.id,
          idempotencyKey: "case-create-key-002",
        });
        const secondRedisKey = buildTaxPlanCycleCreateIdempotencyKey({
          tenantId: sampleTenant.id,
          idempotencyKey: "case-create-key-003",
        });

        expect(cycleRows).toHaveLength(2);
        expect(idempotencyClient.store.get(firstRedisKey)).toBe(
          JSON.stringify({
            status: "completed",
            result: firstBody,
          }),
        );
        expect(idempotencyClient.store.get(secondRedisKey)).toBe(
          JSON.stringify({
            status: "completed",
            result: secondBody,
          }),
        );
      });
    });
  });

  test("PATCH transitions a cycle and persists the stage transition", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);
      const auditEntryWriter = createAuditEntryWriter(client);
      const accessToken = await createAccessToken({
        tenantId: sampleTenant.id,
        userId: "advisor-transition-001",
        email: "advisor-transition-001@example.com",
        role: "Advisor",
        password: "correct-password",
        totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
        totpCode: "123456",
      });

      await seedSampleTenant(client);

      await db.insert(taxPlanCycle).values({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
        clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d72",
        tenantId: sampleTenant.id,
        planningPeriod: "2026-Q4",
        stage: "Data Aggregation",
        owner: "advisor-transition-001",
        priority: "high",
        dueDate: "2026-10-15",
        onHold: false,
      });

      await withTransitionRouteServer(
        repository,
        auditEntryWriter,
        advisorEditPermissions,
        async (baseUrl) => {
          const response = await fetch(
            `${baseUrl}/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71/transition`,
            {
              method: "PATCH",
              headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({ to_stage: "Modeling" }),
            },
          );
          const body = (await response.json()) as {
            id: string;
            stage: string;
          };

          expect(response.status).toBe(200);
          expect(body).toMatchObject({
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
            stage: "Modeling",
          });

          await expect(
            repository.findByCaseId({
              tenantId: sampleTenant.id,
              caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
            }),
          ).resolves.toEqual({
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
            client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d72",
            stage: "Modeling",
            owner: "advisor-transition-001",
            priority: "high",
            due_date: "2026-10-15",
            on_hold: false,
          });

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
            .where(
              eq(
                stageTransition.caseId,
                "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
              ),
            );

          expect(stageTransitionDbRowsSchema.parse(transitionRows)).toHaveLength(
            1,
          );
          expect(transitionRows[0]).toMatchObject({
            case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
            from_stage: "Data Aggregation",
            to_stage: "Modeling",
            actor: "advisor-transition-001",
          });

          const outboxRows = await db
            .select({
              payload: outboxEvent.payload,
              created_at: outboxEvent.createdAt,
            })
            .from(outboxEvent);

          expect(outboxRows).toHaveLength(1);
          const outboxPayload = stageChangedCloudEventSchemaV1.parse(
            JSON.parse(outboxRows[0]!.payload),
          );

          expect(outboxPayload.data).toEqual({
            case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
            tenant_id: sampleTenant.id,
            from_stage: "Data Aggregation",
            to_stage: "Modeling",
            actor: "advisor-transition-001",
          });
          expect(outboxPayload.time).toBe(
            transitionRows[0]?.occurred_at.toISOString(),
          );
          expect(outboxRows[0]?.created_at).toEqual(
            transitionRows[0]?.occurred_at,
          );

          const auditRows = await db
            .select({
              id: auditEntry.id,
              case_id: auditEntry.caseId,
              actor: auditEntry.actor,
              action: auditEntry.action,
              outcome: auditEntry.outcome,
              occurred_at: auditEntry.occurredAt,
            })
            .from(auditEntry)
            .where(eq(auditEntry.caseId, "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71"));

          expect(auditRows).toHaveLength(0);
        },
      );
    });
  });

  test("PATCH rejects unauthorized review transitions without mutating the cycle", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);
      const auditEntryWriter = createAuditEntryWriter(client);
      const accessToken = await createAccessToken({
        tenantId: sampleTenant.id,
        userId: "advisor-transition-002",
        email: "advisor-transition-002@example.com",
        role: "Advisor",
        password: "correct-password",
        totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
        totpCode: "123456",
      });

      await seedSampleTenant(client);

      await db.insert(taxPlanCycle).values({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d73",
        clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d74",
        tenantId: sampleTenant.id,
        planningPeriod: "2026-Q4",
        stage: "Review",
        owner: "advisor-transition-002",
        priority: "medium",
        dueDate: "2026-10-20",
        onHold: false,
      });

      await withTransitionRouteServer(
        repository,
        auditEntryWriter,
        { Advisor: [] },
        async (baseUrl) => {
          const response = await fetch(
            `${baseUrl}/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d73/transition`,
            {
              method: "PATCH",
              headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({ to_stage: "Client Approval" }),
            },
          );

          expect(response.status).toBe(403);
          await expect(
            repository.findByCaseId({
              tenantId: sampleTenant.id,
              caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d73",
            }),
          ).resolves.toEqual({
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d73",
            client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d74",
            stage: "Review",
            owner: "advisor-transition-002",
            priority: "medium",
            due_date: "2026-10-20",
            on_hold: false,
          });

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
            .where(
              eq(
                stageTransition.caseId,
                "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d73",
              ),
            );

          expect(transitionRows).toHaveLength(0);

          const auditRows = await db
            .select({
              id: auditEntry.id,
              case_id: auditEntry.caseId,
              actor: auditEntry.actor,
              action: auditEntry.action,
              outcome: auditEntry.outcome,
              occurred_at: auditEntry.occurredAt,
            })
            .from(auditEntry)
            .where(eq(auditEntry.caseId, "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d73"));

          expect(auditRows).toHaveLength(1);
          expect(auditRows[0]).toMatchObject({
            case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d73",
            actor: "advisor-transition-002",
            action: "transition Review -> Client Approval",
            outcome: "403",
          });
          expect(auditRows[0]?.occurred_at).toBeInstanceOf(Date);
        },
      );
    });
  });

  test("PATCH rejects illegal transitions without mutating the cycle", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);
      const auditEntryWriter = createAuditEntryWriter(client);
      const accessToken = await createAccessToken({
        tenantId: sampleTenant.id,
        userId: "advisor-transition-003",
        email: "advisor-transition-003@example.com",
        role: "Advisor",
        password: "correct-password",
        totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
        totpCode: "123456",
      });

      await seedSampleTenant(client);

      await db.insert(taxPlanCycle).values({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d75",
        clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d76",
        tenantId: sampleTenant.id,
        planningPeriod: "2026-Q4",
        stage: "Data Aggregation",
        owner: "advisor-transition-003",
        priority: "low",
        dueDate: "2026-10-25",
        onHold: false,
      });

      await withTransitionRouteServer(
        repository,
        auditEntryWriter,
        advisorEditPermissions,
        async (baseUrl) => {
          const response = await fetch(
            `${baseUrl}/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d75/transition`,
            {
              method: "PATCH",
              headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({ to_stage: "Archived" }),
            },
          );

          expect(response.status).toBe(422);
          await expect(
            repository.findByCaseId({
              tenantId: sampleTenant.id,
              caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d75",
            }),
          ).resolves.toEqual({
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d75",
            client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d76",
            stage: "Data Aggregation",
            owner: "advisor-transition-003",
            priority: "low",
            due_date: "2026-10-25",
            on_hold: false,
          });

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
            .where(
              eq(
                stageTransition.caseId,
                "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d75",
              ),
            );

          expect(transitionRows).toHaveLength(0);

          const auditRows = await db
            .select({
              id: auditEntry.id,
              case_id: auditEntry.caseId,
              actor: auditEntry.actor,
              action: auditEntry.action,
              outcome: auditEntry.outcome,
              occurred_at: auditEntry.occurredAt,
            })
            .from(auditEntry)
            .where(eq(auditEntry.caseId, "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d75"));

          expect(auditRows).toHaveLength(1);
          expect(auditRows[0]).toMatchObject({
            case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d75",
            actor: "advisor-transition-003",
            action: "transition Data Aggregation -> Archived",
            outcome: "422",
          });
          expect(auditRows[0]?.occurred_at).toBeInstanceOf(Date);
        },
      );
    });
  });

  test("PATCH returns 404 for cross-tenant cycle transitions without writing audit entries", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);
      const auditEntryWriter = createAuditEntryWriter(client);
      const accessToken = await createAccessToken({
        tenantId: repositoryTenantIds.secondary,
        userId: "advisor-transition-004",
        email: "advisor-transition-004@example.com",
        role: "Advisor",
        password: "correct-password",
        totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
        totpCode: "123456",
      });

      await seedSampleTenant(client);

      await db.insert(taxPlanCycle).values({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d77",
        clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d78",
        tenantId: sampleTenant.id,
        planningPeriod: "2026-Q4",
        stage: "Data Aggregation",
        owner: "advisor-transition-004",
        priority: "medium",
        dueDate: "2026-10-30",
        onHold: false,
      });

      await withTransitionRouteServer(
        repository,
        auditEntryWriter,
        advisorEditPermissions,
        async (baseUrl) => {
          const response = await fetch(
            `${baseUrl}/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d77/transition`,
            {
              method: "PATCH",
              headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({ to_stage: "Modeling" }),
            },
          );

          expect(response.status).toBe(404);

          const transitionRows = await db
            .select({
              id: stageTransition.id,
              case_id: stageTransition.caseId,
            })
            .from(stageTransition)
            .where(
              eq(
                stageTransition.caseId,
                "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d77",
              ),
            );
          const auditRows = await db
            .select({
              id: auditEntry.id,
              case_id: auditEntry.caseId,
            })
            .from(auditEntry)
            .where(eq(auditEntry.caseId, "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d77"));

          expect(transitionRows).toHaveLength(0);
          expect(auditRows).toHaveLength(0);
        },
      );
    });
  });

  test("runs the Brianna auth and cycle flow end to end with bearer auth", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);
      const auditEntryWriter = createAuditEntryWriter(client);

      await applySeed(client);

      const accessToken = await createAccessToken(briannaAuthPrincipal);

      await withTransitionRouteServer(
        repository,
        auditEntryWriter,
        advisorEditPermissions,
        async (baseUrl) => {
          const authHeaders = {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          };

          const existingResponse = await fetch(
            `${baseUrl}/tax-plan-cycles/${briannaSeedCycleId}`,
            {
              headers: {
                authorization: `Bearer ${accessToken}`,
              },
            },
          );

          expect(existingResponse.status).toBe(200);
          expect(
            taxPlanCycleSchema.parse(await existingResponse.json()),
          ).toMatchObject({
            id: briannaSeedCycleId,
            stage: "Intake",
            owner: "advisor-002",
            priority: "medium",
            due_date: "2026-08-15",
            on_hold: true,
            hold_reason: "Awaiting client documents",
          });

          const createResponse = await fetch(
            `${baseUrl}/tax-plan-cycles`,
            {
              method: "POST",
              headers: {
                ...authHeaders,
                "Idempotency-Key": "brianna-cycle-create-key-001",
              },
              body: JSON.stringify({
                client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d91",
                planning_period: "2026-Q3",
                owner: "brianna@example.com",
                priority: "medium",
                due_date: "2026-08-15",
              }),
            },
          );

          expect(createResponse.status).toBe(202);
          const createBody = (await createResponse.json()) as {
            case_id: string;
          };
          expect(createBody.case_id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          );

          const createdCaseResponse = await fetch(
            `${baseUrl}/tax-plan-cycles/${createBody.case_id}`,
            {
              headers: {
                authorization: `Bearer ${accessToken}`,
              },
            },
          );

          expect(createdCaseResponse.status).toBe(200);
          expect(
            taxPlanCycleSchema.parse(await createdCaseResponse.json()),
          ).toMatchObject({
            id: createBody.case_id,
            client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d91",
            stage: "Intake",
            owner: "brianna@example.com",
            priority: "medium",
            due_date: "2026-08-15",
            on_hold: false,
          });

          const patchResponse = await fetch(
            `${baseUrl}/tax-plan-cycles/${createBody.case_id}/transition`,
            {
              method: "PATCH",
              headers: authHeaders,
              body: JSON.stringify({ to_stage: "Data Aggregation" }),
            },
          );

          expect(patchResponse.status).toBe(200);
          expect(
            taxPlanCycleSchema.parse(await patchResponse.json()),
          ).toMatchObject({
            id: createBody.case_id,
            stage: "Data Aggregation",
            owner: "brianna@example.com",
          });

          const rereadResponse = await fetch(
            `${baseUrl}/tax-plan-cycles/${createBody.case_id}`,
            {
              headers: {
                authorization: `Bearer ${accessToken}`,
              },
            },
          );

          expect(rereadResponse.status).toBe(200);
          expect(
            taxPlanCycleSchema.parse(await rereadResponse.json()),
          ).toMatchObject({
            id: createBody.case_id,
            stage: "Data Aggregation",
            owner: "brianna@example.com",
          });
        },
      );

      const persistedCycle = await repository.findByCaseId({
        tenantId: briannaAuthPrincipal.tenantId,
        caseId: briannaSeedCycleId,
      });

      expect(persistedCycle).toMatchObject({
        id: briannaSeedCycleId,
        stage: "Intake",
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

  test("rolls back the stage transition when its outbox write fails", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleRepository(client);

      await seedSampleTenant(client);
      await db.insert(taxPlanCycle).values({
        id: sampleStageTransitionCaseId,
        clientId: sampleClientIds[0],
        tenantId: sampleTenant.id,
        planningPeriod: "2026-Q3",
        stage: "Intake",
        owner: "advisor-001",
        priority: "high",
        dueDate: "2026-07-15",
        onHold: false,
      });
      await client.query(`
        CREATE FUNCTION reject_outbox_insert() RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'forced outbox failure';
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER reject_outbox_insert
        BEFORE INSERT ON outbox_event
        FOR EACH ROW EXECUTE FUNCTION reject_outbox_insert();
      `);

      await expect(
        repository.transition({
          tenantId: sampleTenant.id,
          caseId: sampleStageTransitionCaseId,
          toStage: "Data Aggregation",
          actor: "advisor-001",
        }),
      ).rejects.toThrow("forced outbox failure");

      await expect(
        repository.findByCaseId({
          tenantId: sampleTenant.id,
          caseId: sampleStageTransitionCaseId,
        }),
      ).resolves.toMatchObject({ stage: "Intake" });

      const transitionRows = await db
        .select({ id: stageTransition.id })
        .from(stageTransition)
        .where(eq(stageTransition.caseId, sampleStageTransitionCaseId));
      const outboxRows = await db
        .select({ id: outboxEvent.id })
        .from(outboxEvent);

      expect(transitionRows).toEqual([]);
      expect(outboxRows).toEqual([]);
    });
  });

  test("rolls back a transition when its audit entry fails in the same transaction", async () => {
    await withTaxPlanCycleIntegrationDatabase(async (client) => {
      const db = drizzle(client);

      await seedSampleTenant(client);

      await expectPgError(
        db.transaction(async (tx) => {
          await tx.insert(taxPlanCycle).values({
            id: sampleStageTransitionCaseId,
            clientId: sampleClientIds[0],
            tenantId: sampleTenant.id,
            planningPeriod: "2026-Q3",
            stage: "Intake",
            owner: "advisor-001",
            priority: "high",
            dueDate: "2026-07-15",
            onHold: false,
          });

          await tx.insert(stageTransition).values({
            id: sampleStageTransitionId,
            caseId: sampleStageTransitionCaseId,
            fromStage: "Intake",
            toStage: "Data Aggregation",
            actor: "advisor-001",
            occurredAt: new Date("2026-07-01T14:00:00.000Z"),
          });

          await tx.insert(auditEntry).values({
            caseId: sampleMissingCaseId,
            actor: "advisor-001",
            action: "stage_transition:Intake->Data Aggregation",
            outcome: "succeeded",
            occurredAt: new Date("2026-07-01T14:00:00.000Z"),
          });
        }),
        { code: "23503", constraint: "audit_entry_case_id_fk" },
      );

      const transitionRows = await db
        .select({ id: stageTransition.id })
        .from(stageTransition)
        .where(eq(stageTransition.caseId, sampleStageTransitionCaseId));
      const auditRows = await db
        .select({ id: auditEntry.id })
        .from(auditEntry)
        .where(eq(auditEntry.caseId, sampleStageTransitionCaseId));

      expect(transitionRows).toEqual([]);
      expect(auditRows).toEqual([]);
    });
  });
});
