import { describe, expect, test } from "vitest";

import { buildQuarterlyEstimateMockRows } from "../../../../src/typescript/features/quarterlyPayments/repositories/mockPayments.model.js";

describe("buildQuarterlyEstimateMockRows", () => {
  test("returns the four-row Paid/Due quarterly estimate mock", () => {
    const rows = buildQuarterlyEstimateMockRows({
      caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
      dueDate: "2026-12-31",
    });

    expect(rows).toHaveLength(4);
    expect(rows).toEqual([
      expect.objectContaining({
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
        tax_year: "2026",
        quarter: "Q1",
        due_date: "2026-04-15",
        estimated_payment: "3620.00",
        withholding_applied: "3620.00",
        covered_amount: "3620.00",
        remaining_due: "0.00",
        status: "Paid",
      }),
      expect.objectContaining({
        quarter: "Q2",
        status: "Paid",
      }),
      expect.objectContaining({
        quarter: "Q3",
        status: "Due",
      }),
      expect.objectContaining({
        quarter: "Q4",
        due_date: "2027-01-15",
        tax_year: "2026",
        status: "Due",
      }),
    ]);
  });
});
