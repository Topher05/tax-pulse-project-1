import { z } from "zod";

import {
  taxPlanCyclePrioritySchema,
  taxPlanCycleSchema,
  taxPlanCycleStageSchema,
} from "../../../../src/typescript/taxPlanCycle.js";

export const wellFormedCycle = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
  client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
  stage: "Review",
  owner: "advisor-123",
  priority: "high",
  due_date: "2026-12-31",
  on_hold: false,
} as const;

export const expectedTaxPlanCycleColumns = [
  "id",
  "client_id",
  "tenant_id",
  "planning_period",
  "stage",
  "owner",
  "priority",
  "due_date",
  "on_hold",
  "hold_reason",
] as const;

export const expectedTaxPlanCycleColumnTypes = {
  id: "uuid",
  client_id: "uuid",
  tenant_id: "uuid",
  planning_period: "text",
  stage: "text",
  owner: "text",
  priority: "text",
  due_date: "date",
  on_hold: "boolean",
  hold_reason: "text",
} as const;

export const sampleTenant = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11",
  name: "North Shore Advisors",
  createdAt: new Date("2026-06-29T12:00:00Z"),
} as const;

export const sampleClientIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d21",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
] as const;

export const sampleCycleIds = [
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d31",
  "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d32",
] as const;

export const sampleStageTransitionCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d33";
export const sampleMissingCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d24";
export const sampleStageTransitionId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d34";

export const expectedTaxPlanCycleRows = [
  {
    id: sampleCycleIds[0],
    client_id: sampleClientIds[0],
    tenant_id: sampleTenant.id,
    planning_period: "2026-Q3",
    stage: "Intake",
    owner: "advisor-001",
    priority: "high",
    due_date: "2026-07-15",
    on_hold: false,
  },
  {
    id: sampleCycleIds[1],
    client_id: sampleClientIds[1],
    tenant_id: sampleTenant.id,
    planning_period: "2026-Q4",
    stage: "Review",
    owner: "advisor-002",
    priority: "medium",
    due_date: "2026-08-20",
    on_hold: true,
    hold_reason: "Awaiting broker statements",
  },
] as const;

export const expectedStageTransitionColumns = [
  "id",
  "case_id",
  "from_stage",
  "to_stage",
  "actor",
  "occurred_at",
] as const;

export const expectedStageTransitionRows = [
  {
    id: sampleStageTransitionId,
    case_id: sampleStageTransitionCaseId,
    from_stage: "Intake",
    to_stage: "Data Aggregation",
    actor: "advisor-001",
    occurred_at: new Date("2026-07-01T14:00:00.000Z"),
  },
] as const;

export const taxPlanCycleDbRowSchema = z
  .object({
    id: z.uuid(),
    client_id: z.uuid(),
    tenant_id: z.uuid(),
    planning_period: z.string().min(1),
    stage: taxPlanCycleStageSchema,
    owner: z.string().min(1),
    priority: taxPlanCyclePrioritySchema,
    due_date: z.union([z.iso.date(), z.date()]),
    on_hold: z.boolean(),
    hold_reason: z.string().min(1).nullable().optional(),
  })
  .transform(({ due_date, hold_reason, ...row }) => ({
    ...row,
    due_date:
      due_date instanceof Date ? due_date.toISOString().slice(0, 10) : due_date,
    ...(hold_reason == null ? {} : { hold_reason }),
  }));

export const taxPlanCycleDbRowsSchema = z.array(taxPlanCycleDbRowSchema);

export const stageTransitionDbRowSchema = z
  .object({
    id: z.uuid(),
    case_id: z.uuid(),
    from_stage: taxPlanCycleStageSchema,
    to_stage: taxPlanCycleStageSchema,
    actor: z.string().min(1),
    occurred_at: z.union([z.date(), z.string()]),
  })
  .transform(({ occurred_at, ...row }) => ({
    ...row,
    occurred_at:
      occurred_at instanceof Date ? occurred_at : new Date(occurred_at),
  }));

export const stageTransitionDbRowsSchema = z.array(stageTransitionDbRowSchema);

export const taxPlanCycleRepositoryQueueItemSchema = taxPlanCycleSchema.and(
  z.object({
    is_overdue: z.boolean(),
  }),
);

export const taxPlanCycleRepositoryQueueItemsSchema = z.array(
  taxPlanCycleRepositoryQueueItemSchema,
);
