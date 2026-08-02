import type { QuarterlyEstimateRows } from "./quarterlyPayments.js";

export interface QuarterlyPaymentsMockCase {
  caseId: string;
  dueDate: string;
}

export function buildQuarterlyEstimateMockRows(
  input: QuarterlyPaymentsMockCase,
): QuarterlyEstimateRows {
  const dueYear = Number(input.dueDate.slice(0, 4));
  const nextYear = dueYear + 1;
  const taxYear = String(dueYear);

  // TODO: Table Generation and persistence of this entity isn't confirmed yet, documented in Jira-204
  return [
    {
      case_id: input.caseId,
      tax_year: taxYear,
      quarter: "Q1",
      due_date: `${dueYear}-04-15`,
      estimated_payment: "3620.00",
      withholding_applied: "3620.00",
      covered_amount: "3620.00",
      remaining_due: "0.00",
      status: "Paid",
    },
    {
      case_id: input.caseId,
      tax_year: taxYear,
      quarter: "Q2",
      due_date: `${dueYear}-06-15`,
      estimated_payment: "3620.00",
      withholding_applied: "3620.00",
      covered_amount: "3620.00",
      remaining_due: "0.00",
      status: "Paid",
    },
    {
      case_id: input.caseId,
      tax_year: taxYear,
      quarter: "Q3",
      due_date: `${dueYear}-09-15`,
      estimated_payment: "3400.00",
      withholding_applied: "1820.00",
      covered_amount: "1820.00",
      remaining_due: "1580.00",
      status: "Due",
    },
    {
      case_id: input.caseId,
      tax_year: String(nextYear),
      quarter: "Q4",
      due_date: `${nextYear}-01-15`,
      estimated_payment: "3960.00",
      withholding_applied: "1640.00",
      covered_amount: "1640.00",
      remaining_due: "2320.00",
      status: "Due",
    },
  ] as const;
}
