import { describe, expect, test } from "vitest";

import {
  scenarioComparisonSummarySchema,
  scenarioComputedResultSchema,
  scenarioSchema,
  scenarioTypedFiguresSchema,
} from "../../../../src/typescript/scenario.js";

const typedFigures = {
  income: 250_000,
  deductions: 30_000,
  state: "CA",
  filing_status: "married_filing_jointly",
} as const;

const computedResult = {
  federal_liability: 45_000,
  state_liability: 18_000,
  effective_rate: 0.252,
  marginal_rate: 0.32,
  quarterly_estimate: 15_750,
  total_tax: 63_000,
  delta_vs_baseline: -4_500,
} as const;

const comparisonSummary = {
  totalTax: 63_000,
  deltaVBaseline: -4_500,
} as const;

describe("scenario persistence contract", () => {
  test("accepts typed figures and their computed calculation result", () => {
    expect(scenarioTypedFiguresSchema.parse(typedFigures)).toEqual(typedFigures);
    expect(scenarioComputedResultSchema.parse(computedResult)).toEqual(computedResult);
    expect(scenarioComparisonSummarySchema.parse(comparisonSummary)).toEqual(comparisonSummary);
    expect(scenarioComputedResultSchema.parse(comparisonSummary)).toEqual(comparisonSummary);
    expect(
      scenarioSchema.parse({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d51",
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d31",
        name: "Increase retirement contributions",
        typed_figures: typedFigures,
        computed_result: computedResult,
        created_at: new Date("2026-07-23T12:00:00.000Z"),
      }),
    ).toMatchObject({
      name: "Increase retirement contributions",
      typed_figures: typedFigures,
      computed_result: computedResult,
    });
    expect(
      scenarioSchema.parse({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d52",
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d32",
        name: "Keep baseline",
        typed_figures: typedFigures,
        computed_result: comparisonSummary,
        created_at: new Date("2026-07-23T12:05:00.000Z"),
      }),
    ).toMatchObject({
      name: "Keep baseline",
      typed_figures: typedFigures,
      computed_result: comparisonSummary,
    });
  });

  test("rejects invalid manually entered figures and results", () => {
    expect(
      scenarioTypedFiguresSchema.safeParse({ ...typedFigures, income: -1 }).success,
    ).toBe(false);
    expect(
      scenarioComputedResultSchema.safeParse({ ...computedResult, effective_rate: 1.01 }).success,
    ).toBe(false);
    expect(
      scenarioComputedResultSchema.safeParse({ ...computedResult, total_tax: -1 }).success,
    ).toBe(false);
    expect(
      scenarioComputedResultSchema.safeParse({ ...computedResult, delta_vs_baseline: Infinity }).success,
    ).toBe(false);
  });
});
