import { z } from "zod";

const nonNegativeMoneyAmountSchema = z.number().finite().nonnegative();

export const deductionCategoryValues = [
  "Business Expense",
  "Home Office",
  "Charitable Giving",
  "Health & Medical",
  "Education",
  "Retirement Contribution",
  "Other",
] as const;

export const deductionCategorySchema = z.enum(deductionCategoryValues);

export const incomeEventSchema = z.object({
  source: z.string().min(1),
  amount: nonNegativeMoneyAmountSchema,
  withholding: nonNegativeMoneyAmountSchema,
});

export const deductionSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  description: z.string().min(1),
  category: deductionCategorySchema,
  amount: nonNegativeMoneyAmountSchema,
});

export const clientDeductionAggregationPayloadSchema = z.object({
  caseId: z.string().min(1),
  incomeEvents: z.array(incomeEventSchema),
  deductions: z.array(deductionSchema),
});

export const deductionReadParamsSchema = z.object({
  caseId: z.string().min(1),
});

export type IncomeEvent = z.infer<typeof incomeEventSchema>;
export type Deduction = z.infer<typeof deductionSchema>;
export type DeductionCategory = z.infer<typeof deductionCategorySchema>;
export type ClientDeductionAggregationPayload = z.infer<
  typeof clientDeductionAggregationPayloadSchema
>;
