import { z } from "zod";

import { createScenarioEntry, scenarioMaxCount, scenarioMinCount } from "./constants.ts";

function parseDecimalInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  return Number(trimmed);
}

function decimalFieldSchema(fieldLabel: string) {
  return z.preprocess(
    parseDecimalInput,
    z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? `${fieldLabel} is required`
            : `${fieldLabel} must be a number`,
      })
      .finite()
      .min(0, { message: `${fieldLabel} cannot be negative` })
      .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, {
        message: `${fieldLabel} must use 0.01 increments`,
      }),
  );
}

export const scenarioIncomeTypeSchema = z.enum(["rt", "cg", "se", "w2"]);

export const scenarioSchema = z.object({
  scenarioName: z.string().trim().min(1, "Scenario Name is required"),
  description: z.string().trim().min(1, "Description is required"),
  additionalIncome: decimalFieldSchema("Additional Income"),
  additionalDeductions: decimalFieldSchema("Additional Deductions"),
  incomeType: scenarioIncomeTypeSchema,
});

export const scenarioFormSchema = z.object({
  scenarios: z
    .array(scenarioSchema)
    .min(scenarioMinCount, { message: `Add at least ${scenarioMinCount} scenarios` })
    .max(scenarioMaxCount, { message: "Maximum allowed scenarios" }),
});

export type ScenarioFormInput = z.input<typeof scenarioFormSchema>;
export type ScenarioFormValues = z.output<typeof scenarioFormSchema>;

export function createScenarioDefaults(): ScenarioFormInput {
  return {
    scenarios: [createScenarioEntry()],
  };
}

