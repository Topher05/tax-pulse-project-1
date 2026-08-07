import { z } from "zod";

import type { ScenarioFormValues } from "../components/scenario-form/schema.ts";
import { caseApiPostJson } from "../shared/caseApi.ts";

const currencyValueSchema = z.union([z.number(), z.string()]).transform((value, context) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    context.addIssue({
      code: "custom",
      message: "Expected a finite currency amount.",
    });
    return z.NEVER;
  }

  return parsed;
});

const scenarioResultApiRowSchema = z.object({
  id: z.string().min(1),
  case_id: z.string().min(1),
  name: z.string().min(1),
  typed_figures: z.object({
    income: currencyValueSchema,
    deductions: currencyValueSchema,
    state: z.string().min(1),
    filing_status: z.string().min(1),
  }),
  computed_result: z.object({
    totalTax: currencyValueSchema,
    deltaVBaseline: currencyValueSchema,
  }),
  created_at: z.string().min(1),
});

const scenarioResultApiResponseSchema = z.array(scenarioResultApiRowSchema);

export interface ScenarioBaselineView {
  income: number;
  deductions: number;
  taxableIncome: number;
  totalTax: number | null;
}

export interface ScenarioResultRow {
  id: string;
  name: string;
  taxableIncome: number;
  totalTax: number;
  deltaVsBaseline: number;
}

export interface ScenarioResultsView {
  baseline: ScenarioBaselineView;
  rows: readonly ScenarioResultRow[];
}

export const scenarioBaseline: ScenarioBaselineView = {
  income: 125_000,
  deductions: 27_700,
  taxableIncome: 97_300,
  totalTax: null,
};

const baselinePayload = {
  income: scenarioBaseline.income,
  deductions: scenarioBaseline.deductions,
  state: "CA",
  filing_status: "married_filing_jointly",
} as const;

function toScenarioPayload(values: ScenarioFormValues) {
  return {
    baseline: baselinePayload,
    scenarios: values.scenarios.map((scenario) => ({
      name: scenario.scenarioName,
      typed_figures: {
        income: scenarioBaseline.income + scenario.additionalIncome,
        deductions: scenarioBaseline.deductions + scenario.additionalDeductions,
        state: baselinePayload.state,
        filing_status: baselinePayload.filing_status,
      },
    })),
  };
}

function toScenarioResultsView(
  payload: unknown,
  baseline: ScenarioBaselineView = scenarioBaseline,
): ScenarioResultsView {
  const parsed = scenarioResultApiResponseSchema.parse(payload);
  const rows = parsed.map((row) => ({
    id: row.id,
    name: row.name,
    taxableIncome: Math.max(0, row.typed_figures.income - row.typed_figures.deductions),
    totalTax: row.computed_result.totalTax,
    deltaVsBaseline: row.computed_result.deltaVBaseline,
  }));
  const firstRow = rows[0];
  const totalTax =
    firstRow === undefined ? null : firstRow.totalTax - firstRow.deltaVsBaseline;

  return {
    baseline: {
      ...baseline,
      totalTax,
    },
    rows,
  };
}

export async function submitScenarioResults(
  caseId: string,
  values: ScenarioFormValues,
  fetcher?: typeof fetch,
): Promise<ScenarioResultsView> {
  const payload = await caseApiPostJson<unknown>(
    `/v1/tax-plan-cycles/${caseId}/scenarios`,
    toScenarioPayload(values),
    fetcher,
  );

  return toScenarioResultsView(payload);
}
