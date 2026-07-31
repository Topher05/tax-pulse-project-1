import "@testing-library/jest-dom/vitest";

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { DashboardPage } from "../../pages/dashboard/DashboardPage.tsx";
import { IncomeBreakdownChart } from "../../pages/dashboard/IncomeBreakdownChart.tsx";
import { QuarterlyTaxChart } from "../../pages/dashboard/QuarterlyTaxChart.tsx";
import type { DashboardChartData } from "../../pages/dashboard/dashboardChartData.ts";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

const initialChartData: DashboardChartData = {
  calculationId: "calculation-1",
  kpis: {
    estimatedTotalTax: 30_000,
    effectiveRate: 20,
    ytdGrossIncome: 150_000,
    outstandingPayments: 7_500,
  },
  taxBreakdown: {
    federalTax: 18_000,
    stateTax: 6_000,
    effectiveRate: 20,
  },
  yearOverYearTax: {
    currentYear: 2026,
    currentYearTax: 30_000,
    priorYear: 2025,
    priorYearTax: 27_000,
  },
  quarterlyEstimates: [
    { quarter: "Q1", amount: 1_000 },
    { quarter: "Q2", amount: 1_200 },
    { quarter: "Q3", amount: 1_400 },
    { quarter: "Q4", amount: 1_600 },
  ],
  incomeBySource: [
    { source: "Salary", amount: 80_000 },
    { source: "Dividends", amount: 20_000 },
  ],
};

const updatedChartData: DashboardChartData = {
  calculationId: "calculation-2",
  kpis: {
    estimatedTotalTax: 36_000,
    effectiveRate: 21,
    ytdGrossIncome: 180_000,
    outstandingPayments: 9_000,
  },
  taxBreakdown: {
    federalTax: 21_000,
    stateTax: 7_500,
    effectiveRate: 21,
  },
  yearOverYearTax: {
    currentYear: 2027,
    currentYearTax: 36_000,
    priorYear: 2026,
    priorYearTax: 30_000,
  },
  quarterlyEstimates: [
    { quarter: "Q1", amount: 1_500 },
    { quarter: "Q2", amount: 1_700 },
    { quarter: "Q3", amount: 1_900 },
    { quarter: "Q4", amount: 2_100 },
  ],
  incomeBySource: [
    { source: "Salary", amount: 75_000 },
    { source: "Capital gains", amount: 45_000 },
  ],
};

test("dashboard charts re-render when calculation data changes", () => {
  const { rerender } = render(
    <>
      <QuarterlyTaxChart estimates={initialChartData.quarterlyEstimates} />
      <IncomeBreakdownChart incomeBySource={initialChartData.incomeBySource} />
    </>,
  );

  expect(screen.getByText("$1,600")).toBeInTheDocument();
  expect(screen.getByText("Dividends")).toBeInTheDocument();

  rerender(
    <>
      <QuarterlyTaxChart estimates={updatedChartData.quarterlyEstimates} />
      <IncomeBreakdownChart incomeBySource={updatedChartData.incomeBySource} />
    </>,
  );

  expect(screen.getByText("$2,100")).toBeInTheDocument();
  expect(screen.getByText("Capital gains")).toBeInTheDocument();
  expect(screen.queryByText("$1,600")).not.toBeInTheDocument();
  expect(screen.queryByText("Dividends")).not.toBeInTheDocument();
});

test("dashboard renders tax summary visuals from the calculation snapshot", () => {
  const { rerender } = render(<DashboardPage chartData={initialChartData} />);

  expect(screen.getByText("Estimated Total Tax")).toBeInTheDocument();
  expect(screen.getAllByText("Effective Rate")).toHaveLength(2);
  expect(screen.getByText("YTD Gross Income")).toBeInTheDocument();
  expect(screen.getByText("Outstanding Payments")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Tax Breakdown" })).toBeInTheDocument();
  expect(screen.getByText("Federal Income Tax")).toBeInTheDocument();
  expect(screen.getByText("State Income Tax")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Year-over-year estimated total tax" })).toHaveTextContent(
    "2025$27,0002026$30,000",
  );

  rerender(<DashboardPage chartData={updatedChartData} />);

  expect(screen.getAllByText("$36,000")).toHaveLength(2);
  expect(screen.getByText("$180,000")).toBeInTheDocument();
  expect(screen.getByText("2027")).toBeInTheDocument();
  expect(screen.queryByText("$150,000")).not.toBeInTheDocument();
  expect(screen.queryByText("2025")).not.toBeInTheDocument();
});
