/**
 * Typed read-model boundary for the dashboard visuals.
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

export interface DashboardKpis {
  estimatedTotalTax: number;
  effectiveRate: number;
  ytdGrossIncome: number;
  outstandingPayments: number;
}

export interface DashboardTaxBreakdown {
  federalTax: number;
  stateTax: number;
  effectiveRate: number;
}

export interface DashboardYearOverYearTax {
  currentYear: number;
  currentYearTax: number;
  priorYear: number;
  priorYearTax: number;
}

export interface DashboardChartData {
  /** Identifies the calculation snapshot that produced these chart values. */
  calculationId: string;
  kpis: DashboardKpis;
  taxBreakdown: DashboardTaxBreakdown;
  yearOverYearTax: DashboardYearOverYearTax;
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
  kpis: {
    estimatedTotalTax: 58_420,
    effectiveRate: 22.8,
    ytdGrossIncome: 256_400,
    outstandingPayments: 14_620,
  },
  taxBreakdown: {
    federalTax: 31_200,
    stateTax: 10_540,
    effectiveRate: 22.8,
  },
  yearOverYearTax: {
    currentYear: 2026,
    currentYearTax: 58_420,
    priorYear: 2025,
    priorYearTax: 52_860,
  },
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
