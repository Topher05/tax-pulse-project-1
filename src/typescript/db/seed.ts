import { drizzle } from "drizzle-orm/node-postgres";
import { seed } from "drizzle-seed";
import { fileURLToPath } from "node:url";
import type { Client } from "pg";

import {
  getDatabaseUrlFromEnv,
  withDatabaseClient,
} from "../postgresMigrations.js";
import {
  roles,
  stageTransition,
  taxPlanCycle,
  tenants,
  userStatus,
  users,
} from "./schema.js";

type SeedGeneratorValue = string | number | boolean | undefined;
type SeedValue = SeedGeneratorValue | Date;

function generatorValues(values: SeedValue[]): SeedGeneratorValue[] {
  return values as SeedGeneratorValue[];
}

function columnValues<
  TRows extends ReadonlyArray<Record<string, SeedValue>>,
  K extends keyof TRows[number],
>(rows: TRows, key: K): SeedValue[] {
  return rows.map((row) => row[key as never]) as SeedValue[];
}

const tenantRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
    name: "North Shore Advisors",
    createdAt: new Date("2026-06-29T12:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
    name: "Harbor View Planning",
    createdAt: new Date("2026-06-29T12:30:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d03",
    name: "Summit Ridge Tax",
    createdAt: new Date("2026-06-29T13:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d04",
    name: "Blue Harbor Tax",
    createdAt: new Date("2026-06-29T13:30:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d05",
    name: "North Star Planning",
    createdAt: new Date("2026-06-29T14:00:00Z"),
  },
] as const;

const roleRows = [
  { id: 1, role: "Firm Admin" },
  { id: 2, role: "Advisor" },
  { id: 3, role: "Client" },
  { id: 4, role: "TaxPulse Platform Admin" },
] as const;

const userStatusRows = [
  { id: 1, status: "invited" },
  { id: 2, status: "active" },
  { id: 3, status: "disabled" },
] as const;

const userRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
    tenantId: tenantRows[0].id,
    email: "alex@example.com",
    roleId: roleRows[0].id,
    statusId: userStatusRows[0].id,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
    tenantId: tenantRows[1].id,
    email: "brianna@example.com",
    roleId: roleRows[1].id,
    statusId: userStatusRows[1].id,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d63",
    tenantId: tenantRows[2].id,
    email: "casey@example.com",
    roleId: roleRows[2].id,
    statusId: userStatusRows[0].id,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
    tenantId: tenantRows[3].id,
    email: "devon@example.com",
    roleId: roleRows[3].id,
    statusId: userStatusRows[1].id,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d65",
    tenantId: tenantRows[4].id,
    email: "elliot@example.com",
    roleId: roleRows[1].id,
    statusId: userStatusRows[2].id,
  },
] as const;

const taxPlanCycleRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11",
    clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d21",
    tenantId: tenantRows[0].id,
    planningPeriod: "2026-Q3",
    stage: "Review",
    owner: "advisor-001",
    priority: "high",
    dueDate: new Date("2026-07-15T00:00:00Z"),
    onHold: false,
    holdReason: undefined,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
    clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
    tenantId: tenantRows[1].id,
    planningPeriod: "2026-Q4",
    stage: "Intake",
    owner: "advisor-002",
    priority: "medium",
    dueDate: new Date("2026-08-15T00:00:00Z"),
    onHold: true,
    holdReason: "Awaiting client documents",
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d13",
    clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d23",
    tenantId: tenantRows[2].id,
    planningPeriod: "2027-Q1",
    stage: "Modeling",
    owner: "advisor-003",
    priority: "low",
    dueDate: new Date("2026-09-30T00:00:00Z"),
    onHold: false,
    holdReason: undefined,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d14",
    clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d24",
    tenantId: tenantRows[3].id,
    planningPeriod: "2027-Q2",
    stage: "Client Approval",
    owner: "advisor-004",
    priority: "medium",
    dueDate: new Date("2026-10-15T00:00:00Z"),
    onHold: false,
    holdReason: undefined,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d15",
    clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d25",
    tenantId: tenantRows[4].id,
    planningPeriod: "2027-Q3",
    stage: "Archived",
    owner: "advisor-005",
    priority: "high",
    dueDate: new Date("2026-11-30T00:00:00Z"),
    onHold: true,
    holdReason: "Archived workpapers pending review",
  },
] as const;

const stageTransitionRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d31",
    caseId: taxPlanCycleRows[0].id,
    fromStage: "Intake",
    toStage: "Data Aggregation",
    actor: "advisor-001",
    occurredAt: new Date("2026-07-01T14:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d32",
    caseId: taxPlanCycleRows[1].id,
    fromStage: "Data Aggregation",
    toStage: "Modeling",
    actor: "advisor-002",
    occurredAt: new Date("2026-07-02T14:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d33",
    caseId: taxPlanCycleRows[2].id,
    fromStage: "Modeling",
    toStage: "Review",
    actor: "advisor-003",
    occurredAt: new Date("2026-07-03T14:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d34",
    caseId: taxPlanCycleRows[3].id,
    fromStage: "Review",
    toStage: "Client Approval",
    actor: "advisor-004",
    occurredAt: new Date("2026-07-04T14:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d35",
    caseId: taxPlanCycleRows[4].id,
    fromStage: "Client Approval",
    toStage: "Executed",
    actor: "advisor-005",
    occurredAt: new Date("2026-07-05T14:00:00Z"),
  },
] as const;

export async function applySeed(client: Client): Promise<void> {
  const db = drizzle(client);

  await seed(
    db,
    { tenants, roles, userStatus, users, taxPlanCycle, stageTransition },
    { count: 5, seed: 20260709 },
  ).refine((funcs) => ({
    tenants: {
      count: tenantRows.length,
      columns: {
        id: funcs.valuesFromArray({
          values: generatorValues(columnValues(tenantRows, "id")),
          isUnique: true,
          arraySize: tenantRows.length,
        }),
        name: funcs.valuesFromArray({
          values: generatorValues(columnValues(tenantRows, "name")),
          isUnique: true,
          arraySize: tenantRows.length,
        }),
        createdAt: funcs.valuesFromArray({
          values: generatorValues(columnValues(tenantRows, "createdAt")),
          isUnique: true,
          arraySize: tenantRows.length,
        }),
      },
    },
    roles: {
      count: roleRows.length,
      columns: {
        id: funcs.valuesFromArray({
          values: generatorValues(columnValues(roleRows, "id")),
          isUnique: true,
          arraySize: roleRows.length,
        }),
        role: funcs.valuesFromArray({
          values: generatorValues(columnValues(roleRows, "role")),
          isUnique: true,
          arraySize: roleRows.length,
        }),
      },
    },
    userStatus: {
      count: userStatusRows.length,
      columns: {
        id: funcs.valuesFromArray({
          values: generatorValues(columnValues(userStatusRows, "id")),
          isUnique: true,
          arraySize: userStatusRows.length,
        }),
        status: funcs.valuesFromArray({
          values: generatorValues(columnValues(userStatusRows, "status")),
          isUnique: true,
          arraySize: userStatusRows.length,
        }),
      },
    },
    users: {
      count: userRows.length,
      columns: {
        id: funcs.valuesFromArray({
          values: generatorValues(columnValues(userRows, "id")),
          isUnique: true,
          arraySize: userRows.length,
        }),
        tenantId: funcs.valuesFromArray({
          values: generatorValues(columnValues(userRows, "tenantId")),
          arraySize: userRows.length,
        }),
        email: funcs.valuesFromArray({
          values: generatorValues(columnValues(userRows, "email")),
          isUnique: true,
          arraySize: userRows.length,
        }),
        roleId: funcs.valuesFromArray({
          values: generatorValues(columnValues(userRows, "roleId")),
          arraySize: userRows.length,
        }),
        statusId: funcs.valuesFromArray({
          values: generatorValues(columnValues(userRows, "statusId")),
          arraySize: userRows.length,
        }),
      },
    },
    taxPlanCycle: {
      count: taxPlanCycleRows.length,
      columns: {
        id: funcs.valuesFromArray({
          values: generatorValues(columnValues(taxPlanCycleRows, "id")),
          isUnique: true,
          arraySize: taxPlanCycleRows.length,
        }),
        clientId: funcs.valuesFromArray({
          values: generatorValues(columnValues(taxPlanCycleRows, "clientId")),
          isUnique: true,
          arraySize: taxPlanCycleRows.length,
        }),
        tenantId: funcs.valuesFromArray({
          values: generatorValues(columnValues(taxPlanCycleRows, "tenantId")),
          arraySize: taxPlanCycleRows.length,
        }),
        planningPeriod: funcs.valuesFromArray({
          values: generatorValues(columnValues(taxPlanCycleRows, "planningPeriod")),
          isUnique: true,
          arraySize: taxPlanCycleRows.length,
        }),
        stage: funcs.valuesFromArray({
          values: generatorValues(columnValues(taxPlanCycleRows, "stage")),
          arraySize: taxPlanCycleRows.length,
        }),
        owner: funcs.valuesFromArray({
          values: generatorValues(columnValues(taxPlanCycleRows, "owner")),
          isUnique: true,
          arraySize: taxPlanCycleRows.length,
        }),
        priority: funcs.valuesFromArray({
          values: generatorValues(columnValues(taxPlanCycleRows, "priority")),
          arraySize: taxPlanCycleRows.length,
        }),
        dueDate: funcs.valuesFromArray({
          values: generatorValues(columnValues(taxPlanCycleRows, "dueDate")),
          isUnique: true,
          arraySize: taxPlanCycleRows.length,
        }),
        onHold: funcs.valuesFromArray({
          values: generatorValues(columnValues(taxPlanCycleRows, "onHold")),
          arraySize: taxPlanCycleRows.length,
        }),
        holdReason: funcs.valuesFromArray({
          values: generatorValues(columnValues(taxPlanCycleRows, "holdReason")),
          arraySize: taxPlanCycleRows.length,
        }),
      },
    },
    stageTransition: {
      count: stageTransitionRows.length,
      columns: {
        id: funcs.valuesFromArray({
          values: generatorValues(columnValues(stageTransitionRows, "id")),
          isUnique: true,
          arraySize: stageTransitionRows.length,
        }),
        caseId: funcs.valuesFromArray({
          values: generatorValues(columnValues(stageTransitionRows, "caseId")),
          arraySize: stageTransitionRows.length,
        }),
        fromStage: funcs.valuesFromArray({
          values: generatorValues(columnValues(stageTransitionRows, "fromStage")),
          arraySize: stageTransitionRows.length,
        }),
        toStage: funcs.valuesFromArray({
          values: generatorValues(columnValues(stageTransitionRows, "toStage")),
          arraySize: stageTransitionRows.length,
        }),
        actor: funcs.valuesFromArray({
          values: generatorValues(columnValues(stageTransitionRows, "actor")),
          arraySize: stageTransitionRows.length,
        }),
        occurredAt: funcs.valuesFromArray({
          values: generatorValues(columnValues(stageTransitionRows, "occurredAt")),
          arraySize: stageTransitionRows.length,
        }),
      },
    },
  }));

  await client.query(
    `
      SELECT setval(
        pg_get_serial_sequence('roles', 'id'),
        (SELECT COALESCE(MAX(id), 1) FROM roles),
        true
      )
    `,
  );
  await client.query(
    `
      SELECT setval(
        pg_get_serial_sequence('user_status', 'id'),
        (SELECT COALESCE(MAX(id), 1) FROM user_status),
        true
      )
    `,
  );
}

export async function main(): Promise<void> {
  const databaseUrl = getDatabaseUrlFromEnv();

  await withDatabaseClient(databaseUrl, async (client) => {
    await applySeed(client);
  });

  console.log("Applied drizzle-seed seed data");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.log('A') // Comment from me dont remove for now
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
