/**
 * Typed read-model boundary for the two dashboard charts.
 *
 * A BFF consumer should parse its response here before passing it to DashboardPage.
 * Keeping this data independent of the visual components lets a new calculation
 * replace the snapshot and cause each chart to render from the new values.
 */
export interface DashboardQuarterEstimate {
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  amount: number;
}

export interface DashboardIncomeSource {
  source: string;
  amount: number;
}

export interface DashboardChartData {
  /** Identifies the calculation snapshot that produced these chart values. */
  calculationId: string;
  quarterlyEstimates: readonly [
    DashboardQuarterEstimate,
    DashboardQuarterEstimate,
    DashboardQuarterEstimate,
    DashboardQuarterEstimate,
  ];
  incomeBySource: readonly DashboardIncomeSource[];
}
