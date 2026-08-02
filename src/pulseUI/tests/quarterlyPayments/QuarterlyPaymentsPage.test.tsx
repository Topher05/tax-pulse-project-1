import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as caseApi from "../../shared/caseApi.ts";
import {
  QuarterlyPaymentsScreen,
  type QuarterlyEstimateRecord,
} from "../../pages/quarterlyPayments/QuarterlyPaymentsPage.tsx";
import { taxPlanCycleRows } from "../../../typescript/shared/database/seed.model.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  localStorage.clear();
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
      status: "Paid",
    },
    {
      id: "QP-002",
      quarter: "Q2",
      taxYear: "2026",
      dueDate: "2026-06-15",
      estimatedPayment: 3620,
      withholdingApplied: 3620,
      status: "Paid",
    },
    {
      id: "QP-003",
      quarter: "Q3",
      taxYear: "2026",
      dueDate: "2026-09-15",
      estimatedPayment: 3400,
      withholdingApplied: 0,
      status: "Due",
    },
    {
      id: "QP-004",
      quarter: "Q4",
      taxYear: "2026",
      dueDate: "2027-01-15",
      estimatedPayment: 3960,
      withholdingApplied: 0,
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

describe("QuarterlyPaymentsPage", () => {
  test("renders the quarterly payments route", async () => {
    localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce(buildTaxPlanCycleQueuePayload() as never);

    render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <RouterProvider router={createPulseRouter(["/quarterly-payments"])} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Quarterly Payments", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Case ID" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Select a case to load quarterly payments/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quarter Timeline", level: 2 })).toBeInTheDocument();
  });

  test("renders the read-only timeline and withholding placeholder", () => {
    render(<QuarterlyPaymentsScreen quarterlyEstimates={buildFixtureEstimates()} />);

    expect(screen.getByRole("heading", { name: "Quarter Timeline", level: 2 })).toBeInTheDocument();
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
    expect(
      screen.getByText(
        "Paid so far of estimated tax covered by withholdings: $7,240 of $14,600. Remaining due: $7,360.",
      ),
    ).toBeInTheDocument();
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
