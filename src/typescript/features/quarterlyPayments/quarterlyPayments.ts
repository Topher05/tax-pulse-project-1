import { z } from "zod";

export const quarterlyEstimateQuarterSchema = z.enum(["Q1", "Q2", "Q3", "Q4"]);

export const quarterlyEstimateSchema = z.object({
  case_id: z.string().min(1),
  quarter: quarterlyEstimateQuarterSchema,
  due_date: z.string().min(1),
  estimated_payment: z.string().min(1),
  withholding_applied: z.string().min(1),
  covered_amount: z.string().min(1),
  remaining_due: z.string().min(1),
});

export const quarterlyEstimateRowsSchema = z.array(quarterlyEstimateSchema);

export const quarterlyEstimateReadParamsSchema = z.object({
  caseId: z.string().min(1),
});

export type QuarterlyEstimateQuarter = z.infer<typeof quarterlyEstimateQuarterSchema>;
export type QuarterlyEstimateRow = z.infer<typeof quarterlyEstimateSchema>;
export type QuarterlyEstimateRows = z.infer<typeof quarterlyEstimateRowsSchema>;
