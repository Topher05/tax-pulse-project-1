export interface QuarterlyPaymentsMockCase {
  caseId: string;
  dueDate: string;
}

export interface QuarterlyEstimateMockRow {
  case_id: string;
  tax_year: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  due_date: string;
  estimated_payment: string;
  withholding_applied: string;
  covered_amount: string;
  remaining_due: string;
  status: "Paid" | "Due";
}

export type QuarterlyEstimateMockRows = ReadonlyArray<QuarterlyEstimateMockRow>;

export function buildQuarterlyEstimateMockRows(
  input: QuarterlyPaymentsMockCase,
): QuarterlyEstimateMockRows {
  const dueYear = Number(input.dueDate.slice(0, 4));
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
      withholding_applied: "0.00",
      covered_amount: "0.00",
      remaining_due: "3400.00",
      status: "Due",
    },
    {
      case_id: input.caseId,
      tax_year: taxYear,
      quarter: "Q4",
      due_date: `${dueYear + 1}-01-15`,
      estimated_payment: "3960.00",
      withholding_applied: "0.00",
      covered_amount: "0.00",
      remaining_due: "3960.00",
      status: "Due",
    },
  ] as QuarterlyEstimateMockRows;
}
