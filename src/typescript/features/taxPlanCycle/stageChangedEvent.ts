import { z } from "zod";

import { taxPlanCycleStageSchema } from "./taxPlanCycle.js";

export const stageChangedEventType =
  "com.taxpulse.tax_plan_cycle.stage_changed.v1";
export const stageChangedEventSource = "taxpulse.platform.tax-plan-cycle";
export const stageChangedEventDataSchema =
  "taxpulse://schemas/platform/stage-changed/v1";
export const stageChangedEventSchemaVersion = "1";

export const stageChangedEventDataSchemaV1 = z.strictObject({
  case_id: z.uuid(),
  tenant_id: z.uuid(),
  from_stage: taxPlanCycleStageSchema,
  to_stage: taxPlanCycleStageSchema,
  actor: z.string().min(1),
});

export const stageChangedCloudEventSchemaV1 = z.strictObject({
  specversion: z.literal("1.0"),
  id: z.string().min(1),
  source: z.literal(stageChangedEventSource),
  type: z.literal(stageChangedEventType),
  time: z.iso.datetime(),
  datacontenttype: z.literal("application/json"),
  dataschema: z.literal(stageChangedEventDataSchema),
  data: stageChangedEventDataSchemaV1,
});

export type StageChangedEventDataV1 = z.infer<
  typeof stageChangedEventDataSchemaV1
>;
export type StageChangedCloudEventV1 = z.infer<
  typeof stageChangedCloudEventSchemaV1
>;
