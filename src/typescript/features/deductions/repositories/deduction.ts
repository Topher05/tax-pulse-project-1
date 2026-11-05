import { z } from "zod";

const nonNegativeMoneyAmountSchema = z.number().nonnegative();

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

export const deductionTableRowSchema = z.object({
  id: z.string().min(1),
  case_id: z.string().min(1),
  date: z.iso.date(),
  description: z.string().min(1),
  category: deductionCategorySchema,
  amount: z.string().min(1),
  tax_impact: z.string().min(1),
  deleted: z.boolean(),
});

export const deductionTableRowsSchema = z.array(deductionTableRowSchema);

export const deductionCreateSchema = z.object({
  date: z.iso.date(),
  description: z.string().trim().min(1),
  category: deductionCategorySchema,
  amount: z.coerce.number().nonnegative(),
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
export type DeductionCreate = z.infer<typeof deductionCreateSchema>;
export type DeductionTableRow = z.infer<typeof deductionTableRowSchema>;
export type DeductionCategory = z.infer<typeof deductionCategorySchema>;
export type ClientDeductionAggregationPayload = z.infer<
  typeof clientDeductionAggregationPayloadSchema
>;
export type DeductionTableRows = z.infer<typeof deductionTableRowsSchema>;
