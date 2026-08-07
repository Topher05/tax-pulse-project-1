import { describe, expect, test } from "vitest";

import { buildIncomeEventMockRows } from "../../../../src/typescript/features/incomeEvents/index.js";

describe("buildIncomeEventMockRows", () => {
  test("returns deterministic synthetic income events for a tax plan cycle", () => {
    const rows = buildIncomeEventMockRows({
      caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
      dueDate: "2026-12-31",
    });

    expect(rows).toHaveLength(3);
    expect(rows).toEqual([
      expect.objectContaining({
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
        date: "2026-01-31",
        source: "Synthetic W-2 wages",
        type: "w2",
        amount: "125000.50",
        withholding: "21500.25",
      }),
      expect.objectContaining({
        date: "2026-04-30",
        source: "Synthetic consulting 1099",
        type: "1099",
      }),
      expect.objectContaining({
        date: "2026-06-30",
        source: "Synthetic brokerage capital gains",
        type: "capital-gains",
      }),
    ]);
  });
});

