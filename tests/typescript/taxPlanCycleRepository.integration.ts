import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  createTaxPlanCycleReadHelper,
  createTaxPlanCycleRepository,
} from "../../src/typescript/index.js";
import { applyMigrations } from "../../src/typescript/postgresMigrations.js";
import { applySeed } from "../../src/typescript/runSeed.js";
import { startDockerPostgresContainer } from "./dockerPostgres.js";

const sampleTenantIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
] as const;

const sampleCycleIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
] as const;

const sampleClientIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d21",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d23",
] as const;

const queueTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d31";
const queueOtherTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d32";
const queueCycleIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d41",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d42",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d43",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d44",
] as const;
const queueClientIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d51",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d52",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d53",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d54",
] as const;

function createTestSchemaName(): string {
  return `taxpulse_repo_${randomUUID().replace(/-/g, "")}`;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

describe("tax plan cycle repository", () => {
  let container:
    | Awaited<ReturnType<typeof startDockerPostgresContainer>>
    | undefined;
  let client: Client | undefined;
  let schemaName: string | undefined;

  beforeAll(async () => {
    container = await startDockerPostgresContainer();
    client = new Client({
      connectionString: container.connectionUri,
    });
    await client.connect();

    schemaName = createTestSchemaName();
    const quotedSchemaName = quoteIdentifier(schemaName);

    await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
    await client.query(`SET search_path TO ${quotedSchemaName}, public`);
    await applyMigrations(client);
    await applySeed(client);
  });

  afterAll(async () => {
    if (client && schemaName) {
      const quotedSchemaName = quoteIdentifier(schemaName);

      await client.query("SET search_path TO public").catch(() => undefined);
      await client.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
    }

    await client?.end().catch(() => undefined);
    await container?.stop();
  });

  test("scopes reads to the request tenant by generated case ID", async () => {
    if (!client) {
      throw new Error("Database client was not initialized.");
    }

    const readHelper = createTaxPlanCycleReadHelper(client);

    await expect(
      readHelper.findByCaseId({
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
      readHelper.findByCaseId({
        tenantId: sampleTenantIds[0],
        caseId: sampleCycleIds[1],
      }),
    ).resolves.toBeNull();

    await expect(
      readHelper.findByCaseId({
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

  test("creates a cycle in Intake through Drizzle and reads it back", async () => {
    if (!client) {
      throw new Error("Database client was not initialized.");
    }

    const repository = createTaxPlanCycleRepository(client);

    const caseId = await repository.create({
      tenantId: sampleTenantIds[0],
      planningPeriod: "2026-Q1",
      clientId: sampleClientIds[2],
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
        tenantId: sampleTenantIds[0],
        caseId,
      }),
    ).resolves.toEqual({
      id: caseId,
      client_id: sampleClientIds[2],
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

    const transitionRows = await client.query(
      `
        SELECT
          case_id,
          from_stage,
          to_stage,
          actor,
          occurred_at
        FROM stage_transition
        WHERE case_id = $1
      `,
      [caseId],
    );

    expect(transitionRows.rows).toHaveLength(1);
    expect(transitionRows.rows[0]).toMatchObject({
      case_id: caseId,
      from_stage: "Intake",
      to_stage: "Intake",
      actor: "advisor-003",
    });
    expect(transitionRows.rows[0]?.occurred_at).toBeInstanceOf(Date);
  });

  test("lists a tenant's queue by due date and flags overdue cycles", async () => {
    if (!client) {
      throw new Error("Database client was not initialized.");
    }

    const repository = createTaxPlanCycleRepository(client);

    await client.query(
      `
        INSERT INTO tenants (id, name, created_at) VALUES
          ($1, 'Queue Tenant Advisors', '2026-06-29T13:00:00Z'),
          ($2, 'Other Queue Tenant', '2026-06-29T13:30:00Z')
      `,
      [queueTenantId, queueOtherTenantId],
    );

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
          ($1, $5, $9, '2026-Q1', 'Intake', 'advisor-queue-001', 'medium', '2026-07-20', FALSE, NULL),
          ($2, $6, $9, '2026-Q2', 'Review', 'advisor-queue-002', 'high', '2026-07-10', FALSE, NULL),
          ($3, $7, $9, '2026-Q3', 'Modeling', 'advisor-queue-003', 'low', '2026-07-15', TRUE, 'Client upload pending'),
          ($4, $8, $10, '2026-Q4', 'Executed', 'advisor-queue-004', 'medium', '2026-07-01', FALSE, NULL)
      `,
      [
        queueCycleIds[0],
        queueCycleIds[1],
        queueCycleIds[2],
        queueCycleIds[3],
        queueClientIds[0],
        queueClientIds[1],
        queueClientIds[2],
        queueClientIds[3],
        queueTenantId,
        queueOtherTenantId,
      ],
    );

    await expect(
      repository.listQueue({
        tenantId: queueTenantId,
        asOfDate: "2026-07-15",
      }),
    ).resolves.toEqual([
      {
        id: queueCycleIds[1],
        client_id: queueClientIds[1],
        stage: "Review",
        owner: "advisor-queue-002",
        priority: "high",
        due_date: "2026-07-10",
        on_hold: false,
        is_overdue: true,
      },
      {
        id: queueCycleIds[2],
        client_id: queueClientIds[2],
        stage: "Modeling",
        owner: "advisor-queue-003",
        priority: "low",
        due_date: "2026-07-15",
        on_hold: true,
        hold_reason: "Client upload pending",
        is_overdue: false,
      },
      {
        id: queueCycleIds[0],
        client_id: queueClientIds[0],
        stage: "Intake",
        owner: "advisor-queue-001",
        priority: "medium",
        due_date: "2026-07-20",
        on_hold: false,
        is_overdue: false,
      },
    ]);
  });
});
