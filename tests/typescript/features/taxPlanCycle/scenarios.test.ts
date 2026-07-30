import { describe, expect, test, vi } from "vitest";

import {
  scenarioComparisonSummarySchema,
  scenarioComputedResultSchema,
  scenarioSchema,
  scenarioTypedFiguresSchema,
} from "../../../../src/typescript/index.js";
import {
  createScenarioModelingController,
  type ScenarioModelingControllerInput,
  type TaxEngineClient,
} from "../../../../src/typescript/features/taxPlanCycle/index.js";

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
  totalTax: "63000.00",
  deltaVBaseline: "-4500.00",
} as const;

describe("scenario persistence contract", () => {
  test("accepts typed figures and their computed calculation result", () => {
    expect(scenarioTypedFiguresSchema.parse(typedFigures)).toEqual(typedFigures);
    expect(scenarioComputedResultSchema.parse(computedResult)).toEqual(computedResult);
    expect(scenarioComparisonSummarySchema.parse(comparisonSummary)).toEqual(comparisonSummary);
    expect(scenarioComputedResultSchema.parse(comparisonSummary)).toEqual(comparisonSummary);
    expect(
      scenarioComparisonSummarySchema.safeParse({
        totalTax: "63,000.00",
        deltaVBaseline: "-4500.00",
      }).success,
    ).toBe(false);
    expect(
      scenarioSchema.parse({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d51",
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d31",
        name: "Increase retirement contributions",
        typed_figures: typedFigures,
        computed_result: computedResult,
        created_at: "2026-07-23T12:00:00.000Z",
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
        created_at: "2026-07-23T12:05:00.000Z",
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
    expect(
      scenarioComputedResultSchema.safeParse({
        totalTax: "63000.00",
        deltaVBaseline: "-4500.00",
        extra: true,
      }).success,
    ).toBe(false);
  });

  test("rejects raw dates and malformed timestamps for created_at", () => {
    expect(
      scenarioSchema.safeParse({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d53",
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d33",
        name: "Raw date object",
        typed_figures: typedFigures,
        computed_result: computedResult,
        created_at: new Date("2026-07-23T12:10:00.000Z"),
      }).success,
    ).toBe(false);
    expect(
      scenarioSchema.safeParse({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d54",
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d34",
        name: "Missing time",
        typed_figures: typedFigures,
        computed_result: comparisonSummary,
        created_at: "2026-07-23",
      }).success,
    ).toBe(false);
    expect(
      scenarioSchema.safeParse({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d55",
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d35",
        name: "Malformed timestamp",
        typed_figures: typedFigures,
        computed_result: comparisonSummary,
        created_at: "not-a-timestamp",
      }).success,
    ).toBe(false);
  });
});

describe("scenario modeling failure boundary", () => {
  test("maps upstream engine failures to 502 Problem Details and logs them", async () => {
    const cycle = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d81",
      client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d82",
      stage: "Modeling" as const,
      owner: "advisor-001",
      priority: "high" as const,
      due_date: "2026-07-27",
      on_hold: false,
    };
    const engineError = new Error("connect ECONNREFUSED 127.0.0.1:8000");
    const findByCaseId = vi.fn(async () => cycle);
    const createMany = vi.fn(async () => []);
    const taxEngineClient: TaxEngineClient = {
      calculateTax: vi.fn(async () => ({
        income: "0",
        deductions: "0",
        state: "CA",
        filing_status: "single" as const,
        taxable_income: "0",
        federal_liability: "0",
        state_liability: "0",
        total_liability: "0",
        effective_rate: "0",
        marginal_rate: "0",
        currency: "USD",
      })),
      compareScenarios: vi.fn(async () => {
        throw engineError;
      }),
    };
    const controller = createScenarioModelingController({
      taxPlanCycleRepository: { findByCaseId },
      scenarioRepository: { createMany },
      taxEngineClient,
    });
    const input: ScenarioModelingControllerInput = {
      tenantId: "tenant-001",
      caseId: cycle.id,
      authorizationHeader: "Bearer test-token",
      baseline: typedFigures,
      scenarios: [
        {
          name: "Increase deductions",
          typed_figures: {
            ...typedFigures,
            deductions: 36_000,
          },
        },
        {
          name: "Keep baseline",
          typed_figures: typedFigures,
        },
      ],
    };

    await expect(controller.model(input)).rejects.toMatchObject({
      type: "https://taxpulse.example/problems/tax-engine-unavailable",
      title: "Tax Engine Unavailable",
      status: 502,
      detail: "The liability engine request failed after retries.",
    });
    expect(findByCaseId).toHaveBeenCalledWith({
      tenantId: "tenant-001",
      caseId: cycle.id,
    });
    expect(createMany).not.toHaveBeenCalled();
  });
});
