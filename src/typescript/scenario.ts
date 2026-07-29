import { z } from "zod";

const nonNegativeFiniteAmountSchema = z.number().finite().nonnegative();
const decimalStringPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const nonNegativeDecimalStringSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);
const signedDecimalStringSchema = z
  .string()
  .regex(decimalStringPattern);

/** Figures manually entered by an advisor for a modeled tax scenario. */
export const scenarioTypedFiguresSchema = z.strictObject({
  income: nonNegativeFiniteAmountSchema,
  deductions: nonNegativeFiniteAmountSchema,
  state: z.string().min(1),
  filing_status: z.enum([
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
    "qualifying_surviving_spouse",
  ]),
});

/** Tax-calculation output stored with the figures that produced it. */
export const scenarioComparisonSummarySchema = z.strictObject({
  totalTax: nonNegativeDecimalStringSchema,
  deltaVBaseline: signedDecimalStringSchema,
});

const scenarioComputedResultDetailedSchema = z.strictObject({
  federal_liability: nonNegativeFiniteAmountSchema,
  state_liability: nonNegativeFiniteAmountSchema,
  effective_rate: z.number().min(0).max(1),
  marginal_rate: z.number().min(0).max(1),
  quarterly_estimate: nonNegativeFiniteAmountSchema,
  total_tax: nonNegativeFiniteAmountSchema,
  delta_vs_baseline: z.number(),
});

export const scenarioComputedResultSchema = z.union([
  scenarioComputedResultDetailedSchema,
  scenarioComparisonSummarySchema,
]);

export const scenarioSchema = z.strictObject({
  id: z.uuid(),
  case_id: z.uuid(),
  name: z.string().min(1),
  typed_figures: scenarioTypedFiguresSchema,
  computed_result: scenarioComputedResultSchema,
  created_at: z.iso.datetime(),
});

export type ScenarioTypedFigures = z.infer<typeof scenarioTypedFiguresSchema>;
export type ScenarioComparisonSummary = z.infer<
  typeof scenarioComparisonSummarySchema
>;
export type ScenarioComputedResult = z.infer<typeof scenarioComputedResultSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
