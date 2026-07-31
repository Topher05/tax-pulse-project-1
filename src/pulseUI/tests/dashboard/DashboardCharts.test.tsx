import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { IncomeBreakdownChart } from "../../pages/dashboard/IncomeBreakdownChart.tsx";
import { QuarterlyTaxChart } from "../../pages/dashboard/QuarterlyTaxChart.tsx";
import type { DashboardChartData } from "../../pages/dashboard/dashboardChartData.ts";

const initialChartData: DashboardChartData = {
  calculationId: "calculation-1",
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
