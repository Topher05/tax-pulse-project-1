// Temporary integration scaffold until the repo is wired to a full Testcontainers setup.
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { Client } from "pg";

import {
  createTaxPlanCycleReadHelper,
} from "../../src/typescript/index.js";
import {
  applyMigrations,
  withDatabaseClient,
} from "../../src/typescript/postgresMigrations.js";
import { startDockerPostgresContainer } from "./dockerPostgres.js";

const sampleTenantIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
] as const;

const sampleCycleIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
] as const;

const sampleCycles = [
  {
    client_id: sampleCycleIds[0],
    tenant_id: sampleTenantIds[0],
    planning_period: "2026-Q3",
    stage: "Review",
    owner: "advisor-001",
    priority: "high",
    due_date: "2026-07-15",
    on_hold: false,
    hold_reason: null,
  },
  {
    client_id: sampleCycleIds[1],
    tenant_id: sampleTenantIds[1],
    planning_period: "2026-Q4",
    stage: "Intake",
    owner: "advisor-002",
    priority: "medium",
    due_date: "2026-08-15",
    on_hold: true,
    hold_reason: "Awaiting client documents",
  },
] as const;

function createTestSchemaName(): string {
  return `taxpulse_repo_${randomUUID().replace(/-/g, "")}`;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function withTestSchema<T>(
  databaseUrl: string,
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

describe("tax plan cycle read helper", () => {
  let container:
    | Awaited<ReturnType<typeof startDockerPostgresContainer>>
    | undefined;

  beforeAll(async () => {
    container = await startDockerPostgresContainer();
  });

  afterAll(async () => {
    await container?.stop();
  });

  test("scopes reads to the request tenant", async () => {
    if (!container) {
      throw new Error("Docker PostgreSQL container was not started.");
    }

    await withTestSchema(container.connectionUri, async (client) => {
      await applyMigrations(client);

      for (const cycle of sampleCycles) {
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
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            cycle.client_id,
            cycle.tenant_id,
            cycle.planning_period,
            cycle.stage,
            cycle.owner,
            cycle.priority,
            cycle.due_date,
            cycle.on_hold,
            cycle.hold_reason ?? null,
          ],
        );
      }

      const readHelper = createTaxPlanCycleReadHelper(client);

      await expect(
        readHelper.findByCaseId({
          tenantId: sampleTenantIds[0],
          caseId: sampleCycleIds[0],
        }),
      ).resolves.toEqual({
        case_id: sampleCycleIds[0],
        client_id: sampleCycleIds[0],
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
        case_id: sampleCycleIds[1],
        client_id: sampleCycleIds[1],
        stage: "Intake",
        owner: "advisor-002",
        priority: "medium",
        due_date: "2026-08-15",
        on_hold: true,
        hold_reason: "Awaiting client documents",
      });
    });
  });
});
