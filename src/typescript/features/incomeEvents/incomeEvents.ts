import { z } from "zod";

export const incomeEventTypeSchema = z.enum([
  "w2",
  "1099",
  "capital-gains",
  "rental",
  "other",
]);

export const incomeEventRowSchema = z.object({
  id: z.string().min(1),
  case_id: z.string().min(1),
  date: z.iso.date(),
  source: z.string().min(1),
  type: incomeEventTypeSchema,
  amount: z.string().min(1),
  withholding: z.string().min(1),
});

export const incomeEventRowsSchema = z.array(incomeEventRowSchema);

export const incomeEventReadParamsSchema = z.object({
  caseId: z.string().min(1),
});

export type IncomeEventType = z.infer<typeof incomeEventTypeSchema>;
export type IncomeEventRow = z.infer<typeof incomeEventRowSchema>;
export type IncomeEventRows = z.infer<typeof incomeEventRowsSchema>;

