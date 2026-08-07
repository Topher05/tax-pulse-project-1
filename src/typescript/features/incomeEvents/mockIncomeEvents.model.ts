import type { IncomeEventRows } from "./incomeEvents.js";

export interface IncomeEventsMockCase {
  caseId: string;
  dueDate: string;
}

export function buildIncomeEventMockRows(
  input: IncomeEventsMockCase,
): IncomeEventRows {
  const taxYear = Number(input.dueDate.slice(0, 4));

  return [
    {
      id: `${input.caseId}-income-w2`,
      case_id: input.caseId,
      date: `${taxYear}-01-31`,
      source: "Synthetic W-2 wages",
      type: "w2",
      amount: "125000.50",
      withholding: "21500.25",
    },
    {
      id: `${input.caseId}-income-1099`,
      case_id: input.caseId,
      date: `${taxYear}-04-30`,
      source: "Synthetic consulting 1099",
      type: "1099",
      amount: "18500.00",
      withholding: "0.00",
    },
    {
      id: `${input.caseId}-income-capital-gains`,
      case_id: input.caseId,
      date: `${taxYear}-06-30`,
      source: "Synthetic brokerage capital gains",
      type: "capital-gains",
      amount: "9400.75",
      withholding: "1200.00",
    },
  ];
}

