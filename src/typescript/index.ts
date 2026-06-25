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

export type TaxPlanCycleStage = (typeof taxPlanCycleStages)[number];

const nonNegativeMoneyAmountSchema = z.number().finite().nonnegative();

export const incomeEventSchema = z.object({
  source: z.string().min(1),
  amount: nonNegativeMoneyAmountSchema,
  withholding: nonNegativeMoneyAmountSchema,
});

export const deductionSchema = z.object({
  category: z.string().min(1),
  amount: nonNegativeMoneyAmountSchema,
});

export const clientIncomeDeductionAggregationPayloadSchema = z.object({
  clientId: z.string().min(1),
  incomeEvents: z.array(incomeEventSchema),
  deductions: z.array(deductionSchema),
});

export type IncomeEvent = z.infer<typeof incomeEventSchema>;
export type Deduction = z.infer<typeof deductionSchema>;
export type ClientIncomeDeductionAggregationPayload = z.infer<
  typeof clientIncomeDeductionAggregationPayloadSchema
>;

export function createGreeting(runtime: string = "TypeScript"): string {
  return `hello from ${runtime}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(createGreeting());
}
