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

  test("inserts a cycle through Drizzle and reads it back", async () => {
    if (!client) {
      throw new Error("Database client was not initialized.");
    }

    const repository = createTaxPlanCycleRepository(client);

    const caseId = await repository.insert({
      tenantId: sampleTenantIds[0],
      planningPeriod: "2026-Q1",
      cycle: {
        client_id: sampleClientIds[2],
        stage: "Intake",
        owner: "advisor-003",
        priority: "low",
        due_date: "2026-09-30",
        on_hold: false,
      },
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
  });
});
