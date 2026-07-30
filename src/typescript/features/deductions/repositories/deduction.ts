import { z } from "zod";

const nonNegativeMoneyAmountSchema = z.number().finite().nonnegative();

export const incomeEventSchema = z.object({
  source: z.string().min(1),
  amount: nonNegativeMoneyAmountSchema,
  withholding: nonNegativeMoneyAmountSchema,
});

export const deductionSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  amount: nonNegativeMoneyAmountSchema,
});

export const clientDeductionAggregationPayloadSchema = z.object({
  clientId: z.string().min(1),
  incomeEvents: z.array(incomeEventSchema),
  deductions: z.array(deductionSchema),
});

export const deductionReadParamsSchema = z.object({
  clientId: z.string().min(1),
});

export type IncomeEvent = z.infer<typeof incomeEventSchema>;
export type Deduction = z.infer<typeof deductionSchema>;
export type ClientDeductionAggregationPayload = z.infer<
  typeof clientDeductionAggregationPayloadSchema
>;
