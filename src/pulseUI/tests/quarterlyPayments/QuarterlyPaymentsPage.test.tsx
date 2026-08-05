import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as caseApi from "../../shared/caseApi.ts";
import {
  QuarterlyPaymentsScreen,
  type QuarterlyEstimateRecord,
} from "../../pages/quarterlyPayments/QuarterlyPaymentsPage.tsx";
import { taxPlanCycleRows } from "../../../typescript/shared/database/seed.model.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

function buildFixtureEstimates(): readonly QuarterlyEstimateRecord[] {
  return [
    {
      id: "QP-001",
      quarter: "Q1",
      taxYear: "2026",
      dueDate: "2026-04-15",
      estimatedPayment: 3620,
      withholdingApplied: 3620,
      coveredAmount: 3620,
      remainingDue: 0,
      status: "Paid",
    },
    {
      id: "QP-002",
      quarter: "Q2",
      taxYear: "2026",
      dueDate: "2026-06-15",
      estimatedPayment: 3620,
      withholdingApplied: 3620,
      coveredAmount: 3620,
      remainingDue: 0,
      status: "Paid",
    },
    {
      id: "QP-003",
      quarter: "Q3",
      taxYear: "2026",
      dueDate: "2026-09-15",
      estimatedPayment: 3400,
      withholdingApplied: 0,
      coveredAmount: 0,
      remainingDue: 3400,
      status: "Due",
    },
    {
      id: "QP-004",
      quarter: "Q4",
      taxYear: "2026",
      dueDate: "2027-01-15",
      estimatedPayment: 3960,
      withholdingApplied: 0,
      coveredAmount: 0,
      remainingDue: 3960,
      status: "Due",
    },
  ] as const;
}

function buildTaxPlanCycleQueuePayload() {
  return [
    {
      id: taxPlanCycleRows[1].id,
      client_id: taxPlanCycleRows[1].clientId,
      stage: taxPlanCycleRows[1].stage,
      owner: taxPlanCycleRows[1].owner,
      priority: taxPlanCycleRows[1].priority,
      due_date: taxPlanCycleRows[1].dueDate.toISOString().slice(0, 10),
      on_hold: taxPlanCycleRows[1].onHold,
      hold_reason: taxPlanCycleRows[1].holdReason,
      is_overdue: false,
      updated_at: "2026-07-30T00:00:00.000Z",
    },
  ];
}

function buildQuarterlyEstimatePayload(caseId: string) {
  return [
    {
      case_id: caseId,
      tax_year: "2026",
      quarter: "Q1",
      due_date: "2026-04-15",
      estimated_payment: "3620.00",
      withholding_applied: "3620.00",
      covered_amount: "3620.00",
      remaining_due: "0.00",
      status: "Paid",
    },
  ] as const;
}

describe("QuarterlyPaymentsPage", () => {
  test("renders the quarterly payments route", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce(buildTaxPlanCycleQueuePayload() as never);

    render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider>
          <RouterProvider router={createPulseRouter(["/quarterly-payments"])} />
        </TestSessionProvider>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Quarterly Payments", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Case ID" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Select a case to load quarterly payments/i })).toBeInTheDocument();
  });

  test("loads selected quarterly estimates through the authenticated case API fetcher", async () => {
    const caseId = taxPlanCycleRows[1].id;
    const caseApiMock = vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/tax-plan-cycles/${caseId}/quarterly-estimates`) {
        return Promise.resolve(buildQuarterlyEstimatePayload(caseId) as never);
      }

      throw new Error(`Unexpected quarterly payments request: ${path}`);
    });

    render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider>
          <RouterProvider router={createPulseRouter(["/quarterly-payments"])} />
        </TestSessionProvider>
      </QueryClientProvider>,
    );

    const selector = await screen.findByRole("combobox", { name: "Case ID" });
    await screen.findByRole("option", { name: caseId });

    fireEvent.change(selector, { target: { value: caseId } });

    await waitFor(() => {
      expect(caseApiMock).toHaveBeenCalledWith(
        `/v1/tax-plan-cycles/${caseId}/quarterly-estimates`,
        expect.any(Function),
      );
    });
  });

  test("renders the read-only timeline and withholding placeholder", () => {
    render(<QuarterlyPaymentsScreen quarterlyEstimates={buildFixtureEstimates()} />);

    expect(screen.getByRole("heading", { name: "Timeline", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Withholding Progress", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Quarter timeline" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);

    const firstItem = screen.getAllByRole("listitem")[0]!;
    expect(within(firstItem).getByText("Apr")).toBeInTheDocument();
    expect(within(firstItem).getByText("15")).toBeInTheDocument();
    expect(within(firstItem).getByText("Q1 2026 Estimation")).toBeInTheDocument();
    expect(within(firstItem).getByText("Withholding applied: $3,620")).toBeInTheDocument();
    expect(within(firstItem).getByText("Paid")).toBeInTheDocument();

    expect(screen.getByText("$14,600")).toBeInTheDocument();
    expect(screen.getByText("$7,240")).toBeInTheDocument();
    expect(screen.getByText("$7,360")).toBeInTheDocument();
    expect(screen.getByText("49.6%")).toBeInTheDocument();
    expect(screen.getByText(/\$7,240.*\$14,600.*withholdings\./)).toBeInTheDocument();
  });

  test("does not scaffold payment recording actions", () => {
    render(<QuarterlyPaymentsScreen quarterlyEstimates={buildFixtureEstimates()} />);

    expect(screen.queryByRole("button", { name: /pay/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark paid/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Synthetic read-only estimate total")).not.toBeInTheDocument();
    expect(screen.queryByText("Withholding coverage applied")).not.toBeInTheDocument();
    expect(screen.queryByText("Estimated amount still payable")).not.toBeInTheDocument();
  });
});
