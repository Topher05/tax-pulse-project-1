import { z } from "zod";

import {
  taxPlanCyclePrioritySchema,
  taxPlanCycleStageSchema,
} from "../taxPlanCycle.js";

// TODO: Analyze these
export const TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME = "taxpulse_plan_cycle_queue_projection";
export const TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY = "tenant_id";
export const TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY = "case_id";

export const taxPlanCycleQueueProjectionItemSchema = z.strictObject({
  tenant_id: z.uuid(),
  case_id: z.uuid(),
  client: z.uuid(),
  stage: taxPlanCycleStageSchema,
  owner: z.string().min(1),
  priority: taxPlanCyclePrioritySchema,
  due_date: z.iso.date(),
  is_overdue: z.boolean(),
});

export const taxPlanCycleQueueProjectionItemsSchema = z.array(
  taxPlanCycleQueueProjectionItemSchema,
);

export type TaxPlanCycleQueueProjectionItem = z.infer<
  typeof taxPlanCycleQueueProjectionItemSchema
>;
