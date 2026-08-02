import { z } from "zod";

import {
  createScenarioPlanningEntry,
  scenarioPlanningMaxCount,
  scenarioPlanningMinCount,
} from "./constants.ts";

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
      .refine((value) => {
        const scaledValue = value * 100;
        return Math.abs(Math.round(scaledValue) - scaledValue) < 1e-8;
      }, { message: `${fieldLabel} must use 0.01 increments` }),
  );
}

export const scenarioPlanningIncomeTypeSchema = z.enum(["rt", "cg", "se", "w2"]);

export const scenarioPlanningScenarioSchema = z.object({
  scenarioName: z.string().trim().min(1, "Scenario Name is required"),
  description: z.string().trim().min(1, "Description is required"),
  additionalIncome: decimalFieldSchema("Additional Income"),
  additionalDeductions: decimalFieldSchema("Additional Deductions"),
  incomeType: scenarioPlanningIncomeTypeSchema,
});

export const scenarioPlanningFormSchema = z.object({
  scenarios: z
    .array(scenarioPlanningScenarioSchema)
    .min(scenarioPlanningMinCount, {
      message: `Add at least ${scenarioPlanningMinCount} scenarios`,
    })
    .max(scenarioPlanningMaxCount, {
      message: "Maximum allowed scenarios",
    }),
});

export type ScenarioPlanningFormInput = z.input<typeof scenarioPlanningFormSchema>;
export type ScenarioPlanningFormValues = z.output<typeof scenarioPlanningFormSchema>;

export function createScenarioPlanningDefaults(): ScenarioPlanningFormInput {
  return {
    scenarios: [createScenarioPlanningEntry()],
  };
}

