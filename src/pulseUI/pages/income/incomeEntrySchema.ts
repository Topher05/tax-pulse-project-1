import { z } from "zod";

export const incomeSourceCategories = [
  "w2",
  "1099",
  "capital-gains",
  "rental",
  "other",
] as const;

export const maximumIncomeSourceLength = 200;

export type IncomeSourceCategory = (typeof incomeSourceCategories)[number];

function requiredCurrency(label: "Amount" | "Withholding") {
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();

        return trimmed.length === 0 ? undefined : Number(trimmed);
      }

      return value;
    },
    z
      .number({
        error: (issue) =>
          issue.input === undefined ? `${label} is required` : `${label} must be a number`,
      })
      .finite()
      .min(0, { message: `${label} cannot be negative` }),
  );
}

export const incomeEntrySchema = z.object({
  source: z
    .string()
    .trim()
    .min(1, "Source is required")
    .max(maximumIncomeSourceLength, "Source must be 200 characters or fewer"),
  type: z.enum(incomeSourceCategories, { error: "Type is required" }),
  amount: requiredCurrency("Amount"),
  withholding: requiredCurrency("Withholding"),
});

export type IncomeEntryFormInput = z.input<typeof incomeEntrySchema>;
export type IncomeCreatePayload = z.output<typeof incomeEntrySchema>;
