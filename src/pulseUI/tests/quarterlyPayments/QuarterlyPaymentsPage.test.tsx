import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import {
  QuarterlyPaymentsScreen,
  type QuarterlyEstimateRecord,
} from "../../pages/quarterlyPayments/QuarterlyPaymentsPage.tsx";

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
      dueDate: "2026-04-15",
      estimatedPayment: 3620,
      withholdingApplied: 2140,
      status: "Paid",
    },
    {
      id: "QP-002",
      dueDate: "2026-06-15",
      estimatedPayment: 3620,
      withholdingApplied: 2060,
      status: "Paid",
    },
    {
      id: "QP-003",
      dueDate: "2026-09-15",
      estimatedPayment: 3620,
      withholdingApplied: 1820,
      status: "Due Soon",
    },
    {
      id: "QP-004",
      dueDate: "2027-01-15",
      estimatedPayment: 3740,
      withholdingApplied: 1640,
      status: "Upcoming",
    },
    {
      id: "QP-005",
      dueDate: "2027-04-15",
      estimatedPayment: 3740,
      withholdingApplied: 1680,
      status: "Projected",
    },
    {
      id: "QP-006",
      dueDate: "2027-06-15",
      estimatedPayment: 3740,
      withholdingApplied: 1740,
      status: "Projected",
    },
    {
      id: "QP-007",
      dueDate: "2027-09-15",
      estimatedPayment: 3860,
      withholdingApplied: 1790,
      status: "Projected",
    },
  ] as const;
}

describe("QuarterlyPaymentsPage", () => {
  test("renders the quarterly payments route", async () => {
    localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");

    render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <RouterProvider router={createPulseRouter(["/quarterly-payments"])} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Quarterly Payments", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Case ID" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Select a case to load/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quarter Timeline", level: 2 })).toBeInTheDocument();
  });

  test("renders the read-only timeline and withholding placeholder", () => {
    render(<QuarterlyPaymentsScreen quarterlyEstimates={buildFixtureEstimates()} />);

    expect(screen.getByRole("heading", { name: "Quarter Timeline", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Withholding Progress", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("TBD")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Quarter timeline" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(7);

    const firstItem = screen.getAllByRole("listitem")[0]!;
    expect(within(firstItem).getByText("Apr")).toBeInTheDocument();
    expect(within(firstItem).getByText("15")).toBeInTheDocument();
    expect(within(firstItem).getByText("Estimated quarterly payment")).toBeInTheDocument();
    expect(within(firstItem).getByText("Withholding applied: $2,140")).toBeInTheDocument();
    expect(within(firstItem).getByText("Paid")).toBeInTheDocument();

    expect(screen.getByText("$25,940")).toBeInTheDocument();
    expect(screen.getByText("$12,870")).toBeInTheDocument();
    expect(screen.getByText("$13,070")).toBeInTheDocument();
    expect(screen.queryByText("remaining")).not.toBeInTheDocument();
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
