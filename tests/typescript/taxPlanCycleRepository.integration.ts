import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { RequestHandler } from "express";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  createApp,
  createLogger,
  createTaxPlanCycleCreateController,
  createTaxPlanCycleReadHelper,
  createTaxPlanCycleRepository,
  createTaxPlanCycleRouter,
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
const missingCycleId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d99";

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

const silentLogger = createLogger({ level: "silent" });

function createTestSchemaName(): string {
  return `taxpulse_repo_${randomUUID().replace(/-/g, "")}`;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

const attachRequestContext: RequestHandler = (req, _res, next) => {
  (req as typeof req & { tenant: { id: string } }).tenant = {
    id: sampleTenantIds[0],
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
        tenantId: sampleTenantIds[0],
        caseId: missingCycleId,
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

  test("POST creates a tenant-scoped Intake cycle that GET reads back", async () => {
    if (!client) {
      throw new Error("Database client was not initialized.");
    }

    const dbClient = client;
    const repository = createTaxPlanCycleRepository(client);

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
          tenantId: sampleTenantIds[0],
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

      const readResponse = await fetch(
        `${baseUrl}/tax-plan-cycles/${body.case_id}`,
      );

      expect(readResponse.status).toBe(200);
      await expect(readResponse.json()).resolves.toEqual({
        id: body.case_id,
        client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
        stage: "Intake",
        owner: "advisor-route-owner-001",
        priority: "medium",
        due_date: "2026-10-15",
        on_hold: false,
      });

      const otherTenantCaseId = await repository.create({
        tenantId: sampleTenantIds[1],
        planningPeriod: "2026-Q3",
        clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
        owner: "advisor-other-tenant-001",
        priority: "high",
        dueDate: "2026-11-15",
        actor: "advisor-other-tenant-001",
      });
      const crossTenantReadResponse = await fetch(
        `${baseUrl}/tax-plan-cycles/${otherTenantCaseId}`,
      );

      expect(crossTenantReadResponse.status).toBe(404);
      expect(crossTenantReadResponse.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      await expect(crossTenantReadResponse.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
        title: "Tax Plan Cycle Not Found",
        status: 404,
        detail: "No tax plan cycle was found for the requested case ID.",
      });

      const transitionRows = await dbClient.query(
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
        [body.case_id],
      );

      expect(transitionRows.rows).toHaveLength(1);
      expect(transitionRows.rows[0]).toMatchObject({
        case_id: body.case_id,
        from_stage: "Intake",
        to_stage: "Intake",
        actor: "advisor-route-actor-001",
      });
      expect(transitionRows.rows[0]?.occurred_at).toBeInstanceOf(Date);
    });
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
