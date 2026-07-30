import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";
import {
  QuarterlyPaymentsScreen,
  type QuarterlyEstimateRecord,
} from "../../pages/quarterlyPayments/QuarterlyPaymentsPage.tsx";

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
      quarter: "Q1 2026",
      dueDate: "2026-04-15",
      estimatedPayment: 3620,
      withholdingApplied: 2140,
      status: "Paid",
    },
    {
      id: "QP-002",
      quarter: "Q2 2026",
      dueDate: "2026-06-15",
      estimatedPayment: 3620,
      withholdingApplied: 2060,
      status: "Paid",
    },
    {
      id: "QP-003",
      quarter: "Q3 2026",
      dueDate: "2026-09-15",
      estimatedPayment: 3620,
      withholdingApplied: 1820,
      status: "Due Soon",
    },
    {
      id: "QP-004",
      quarter: "Q4 2026",
      dueDate: "2027-01-15",
      estimatedPayment: 3740,
      withholdingApplied: 1640,
      status: "Upcoming",
    },
    {
      id: "QP-005",
      quarter: "Q1 2027",
      dueDate: "2027-04-15",
      estimatedPayment: 3740,
      withholdingApplied: 1680,
      status: "Projected",
    },
    {
      id: "QP-006",
      quarter: "Q2 2027",
      dueDate: "2027-06-15",
      estimatedPayment: 3740,
      withholdingApplied: 1740,
      status: "Projected",
    },
    {
      id: "QP-007",
      quarter: "Q3 2027",
      dueDate: "2027-09-15",
      estimatedPayment: 3860,
      withholdingApplied: 1790,
      status: "Projected",
    },
  ] as const;
}

describe("QuarterlyPaymentsPage", () => {
  test("renders the quarterly payments route", async () => {
    render(<RouterProvider router={createPulseRouter(["/quarterly-payments"])} />);

    expect(
      await screen.findByRole("heading", { name: "Quarterly Payments", level: 2 }),
    ).toBeInTheDocument();
  });

  test("renders the read-only timeline and withholding placeholder", () => {
    render(<QuarterlyPaymentsScreen quarterlyEstimates={buildFixtureEstimates()} />);

    expect(screen.getByRole("heading", { name: "Quarter Timeline", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Withholding Progress", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("TBD")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Quarter timeline" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByText("$25,940")).toBeInTheDocument();
    expect(screen.getByText("$12,870")).toBeInTheDocument();
    expect(screen.getByText("$13,070")).toBeInTheDocument();
  });

  test("does not scaffold payment recording actions", () => {
    render(<QuarterlyPaymentsScreen quarterlyEstimates={buildFixtureEstimates()} />);

    expect(screen.queryByRole("button", { name: /pay/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark paid/i })).not.toBeInTheDocument();
  });
});
