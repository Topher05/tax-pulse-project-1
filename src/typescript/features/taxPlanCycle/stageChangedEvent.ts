import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  taxPlanCycleStageSchema,
  type TaxPlanCycleStage,
} from "./taxPlanCycle.js";

export const stageChangedEventType =
  "com.taxpulse.tax_plan_cycle.stage_changed.v1";
export const stageChangedEventSource = "taxpulse.platform.tax-plan-cycle";
export const stageChangedEventDataSchema =
  "taxpulse://schemas/platform/stage-changed/v1";
export const stageChangedEventSchemaVersion = "1";

export interface StageChangedEventPublishInput {
  tenantId: string;
  caseId: string;
  fromStage: TaxPlanCycleStage;
  toStage: TaxPlanCycleStage;
  actor: string;
}

export interface CreateStageChangedCloudEventOptions {
  idFactory?: () => string;
  now?: () => Date;
}

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
export interface StageChangedEventPublishInput {
  tenantId: string;
  caseId: string;
  fromStage: TaxPlanCycleStage;
  toStage: TaxPlanCycleStage;
  actor: string;
}

export interface CreateStageChangedCloudEventOptions {
  idFactory?: () => string;
  now?: () => Date;
}

export function createStageChangedCloudEventV1(
  input: StageChangedEventPublishInput,
  options: CreateStageChangedCloudEventOptions = {},
): StageChangedCloudEventV1 {
  const idFactory = options.idFactory ?? randomUUID;
  const now = options.now ?? (() => new Date());

  return stageChangedCloudEventSchemaV1.parse({
    specversion: "1.0",
    id: `stage-transition-${idFactory()}`,
    source: stageChangedEventSource,
    type: stageChangedEventType,
    time: now().toISOString(),
    datacontenttype: "application/json",
    dataschema: stageChangedEventDataSchema,
    data: {
      case_id: input.caseId,
      tenant_id: input.tenantId,
      from_stage: input.fromStage,
      to_stage: input.toStage,
      actor: input.actor,
    },
  });
}
