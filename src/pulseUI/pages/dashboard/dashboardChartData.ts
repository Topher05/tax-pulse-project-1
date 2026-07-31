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

/**
 * TODO: Replace this synthetic fallback with a tenant-scoped dashboard BFF read-model.
 * Synthetic dashboard data is used until that dashboard BFF read-model is available.
 * A supplied calculation snapshot always takes precedence over this presentation data.
 */
export const defaultDashboardChartData: DashboardChartData = {
  calculationId: "dashboard-example-2026",
  quarterlyEstimates: [
    { quarter: "Q1", amount: 3_620 },
    { quarter: "Q2", amount: 3_620 },
    { quarter: "Q3", amount: 3_620 },
    { quarter: "Q4", amount: 3_760 },
  ],
  incomeBySource: [
    { source: "W-2 wages", amount: 125_000 },
    { source: "K-1 partnership income", amount: 82_000 },
    { source: "1099 interest", amount: 1_400 },
  ],
};
