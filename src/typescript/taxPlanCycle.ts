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
  return taxPlanCycleStages.indexOf(to) === taxPlanCycleStages.indexOf(from) + 1;
}

export const taxPlanCycleSchema = z
  .object({
    stage: taxPlanCycleStageSchema,
    owner: z.string().min(1),
    priority: taxPlanCyclePrioritySchema,
    due_date: z.iso.date(),
    on_hold: z.boolean(),
    hold_reason: z.string().min(1).optional(),
  })
  .superRefine((cycle, ctx) => {
    if (cycle.on_hold && cycle.hold_reason === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["hold_reason"],
        message: "hold_reason is required when on_hold is true",
      });
    }
  });

export type TaxPlanCycleStage = z.infer<typeof taxPlanCycleStageSchema>;
export type TaxPlanCyclePriority = z.infer<typeof taxPlanCyclePrioritySchema>;
export type TaxPlanCycle = z.infer<typeof taxPlanCycleSchema>;
