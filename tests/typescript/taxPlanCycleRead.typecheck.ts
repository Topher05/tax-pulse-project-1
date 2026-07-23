import type { Client } from "pg";

import {
  createTaxPlanCycleReadHelper,
  createTaxPlanCycleRepository,
} from "../../src/typescript/index.js";

declare const client: Client;

const readHelper = createTaxPlanCycleReadHelper(client);
const repository = createTaxPlanCycleRepository(client);

// @ts-expect-error tenantId is required for every cycle read
readHelper.findByCaseId({ caseId: "case-123" });

void readHelper.findByCaseId({
  tenantId: "tenant-123",
  caseId: "case-123",
});

// @ts-expect-error tenantId is required for queue reads
repository.listQueue({});

void repository.listQueue({
  tenantId: "tenant-123",
});

void repository.listQueue({
  tenantId: "tenant-123",
  asOfDate: "2026-07-15",
});

// @ts-expect-error tenantId is required for every cycle create
repository.create({
  planningPeriod: "2026-Q1",
  clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
  owner: "advisor-123",
  priority: "low",
  dueDate: "2026-09-30",
  actor: "advisor-123",
});

repository.create({
  tenantId: "tenant-123",
  planningPeriod: "2026-Q1",
  clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
  owner: "advisor-123",
  priority: "low",
  dueDate: "2026-09-30",
  actor: "advisor-123",
  // @ts-expect-error create persists Intake and does not accept caller-selected stage
  stage: "Review",
});

void repository.create({
  tenantId: "tenant-123",
  planningPeriod: "2026-Q1",
  clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
  owner: "advisor-123",
  priority: "low",
  dueDate: "2026-09-30",
  actor: "advisor-123",
});

repository.insert({
  tenantId: "tenant-123",
  planningPeriod: "2026-Q1",
  cycle: {
    // @ts-expect-error generated IDs are returned by the database and omitted on insert
    id: "case-123",
    client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
    stage: "Intake",
    owner: "advisor-123",
    priority: "low",
    due_date: "2026-09-30",
    on_hold: false,
  },
});
