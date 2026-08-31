import { z } from "zod";

export const incomeEventTypeValues = [
  "w2",
  "1099",
  "capital-gains",
  "rental",
  "other",
] as const;

export const incomeEventTypeSchema = z.enum(incomeEventTypeValues);

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

const maximumIncomeCurrencyValue = 999_999_999_999.99;
export const maximumIncomeEventSourceLength = 200;

export const incomeEventCreateSchema = z.strictObject({
  source: z.string().trim().min(1).max(maximumIncomeEventSourceLength),
  type: incomeEventTypeSchema,
  amount: z.coerce
    .number()
    .finite()
    .nonnegative()
    .max(maximumIncomeCurrencyValue),
  withholding: z.coerce
    .number()
    .finite()
    .nonnegative()
    .max(maximumIncomeCurrencyValue),
});

export const incomeEventReadParamsSchema = z.object({
  caseId: z.uuid(),
});

export type IncomeEventType = z.infer<typeof incomeEventTypeSchema>;
export type IncomeEventCreate = z.infer<typeof incomeEventCreateSchema>;
export type IncomeEventRow = z.infer<typeof incomeEventRowSchema>;
export type IncomeEventRows = z.infer<typeof incomeEventRowsSchema>;

