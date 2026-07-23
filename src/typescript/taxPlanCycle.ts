import { z } from "zod";

export const taxPlanCycleStages = [
  "Intake",
  "Data Aggregation",
  "Modeling",
  "Review",
  "Client Approval",
  "Executed",
  "Archived",
] as const;

export const taxPlanCycleStageSchema = z.enum(taxPlanCycleStages);

export const taxPlanCyclePrioritySchema = z.enum(["low", "medium", "high"]);

export function isLegalTaxPlanCycleStageTransition(
  from: TaxPlanCycleStage,
  to: TaxPlanCycleStage,
): boolean {
  if (from === "Review" && to === "Modeling") {
    return true;
  }

  return taxPlanCycleStages.indexOf(to) === taxPlanCycleStages.indexOf(from) + 1;
}

const taxPlanCycleBaseSchema = z.object({
  id: z.uuid(),
  client_id: z.uuid(),
  stage: taxPlanCycleStageSchema,
  owner: z.string().min(1),
  priority: taxPlanCyclePrioritySchema,
  due_date: z.iso.date(),
  on_hold: z.boolean(),
  hold_reason: z.string().min(1).optional(),
});

function requireHoldReasonWhenOnHold<
  T extends { on_hold: boolean; hold_reason?: string },
>(
  cycle: T,
  ctx: z.RefinementCtx,
): void {
  if (cycle.on_hold && cycle.hold_reason === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["hold_reason"],
      message: "hold_reason is required when on_hold is true",
    });
  }
}

export const taxPlanCycleSchema = taxPlanCycleBaseSchema.superRefine(
  requireHoldReasonWhenOnHold,
);

export const taxPlanCycleCreateSchema = z.strictObject({
  client_id: z.uuid(),
  planning_period: z.string().min(1),
  owner: z.string().min(1),
  priority: taxPlanCyclePrioritySchema,
  due_date: z.iso.date(),
});
export const taxPlanCycleReadParamsSchema = z.object({
  caseId: z.uuid(),
});
export const taxPlanCycleTransitionParamsSchema = z.object({
  caseId: z.uuid(),
});
export const taxPlanCycleTransitionSchema = z.strictObject({
  to_stage: taxPlanCycleStageSchema,
});

export type TaxPlanCycleStage = z.infer<typeof taxPlanCycleStageSchema>;
export type TaxPlanCyclePriority = z.infer<typeof taxPlanCyclePrioritySchema>;
export type TaxPlanCycle = z.infer<typeof taxPlanCycleSchema>;
export type TaxPlanCycleCreateInput = z.infer<typeof taxPlanCycleCreateSchema>;
export type TaxPlanCycleReadParams = z.infer<
  typeof taxPlanCycleReadParamsSchema
>;
export type TaxPlanCycleTransitionParams = z.infer<
  typeof taxPlanCycleTransitionParamsSchema
>;
export type TaxPlanCycleTransitionInput = z.infer<
  typeof taxPlanCycleTransitionSchema
>;
