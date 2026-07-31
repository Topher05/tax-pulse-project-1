import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as caseApi from "../../shared/caseApi.ts";

const deductionCategories = [
  "Business Expense",
  "Home Office",
  "Charitable Giving",
  "Health & Medical",
  "Education",
  "Retirement Contribution",
  "Other",
] as const;

function buildMockPayload() {
  return {
    caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
    incomeEvents: [
      {
        source: "W-2 wages",
        amount: 125000,
        withholding: 24500,
      },
      {
        source: "1099 interest",
        amount: 1400,
        withholding: 0,
      },
    ],
    deductions: Array.from({ length: 25 }, (_value, index) => ({
      id: `ded-${String(index + 1).padStart(3, "0")}`,
      date: "2026-07-30",
      description: `Synthetic deduction ${index + 1}`,
      category: deductionCategories[index % deductionCategories.length] ?? "Other",
      amount: 780 + index * 145,
    })),
  };
}

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderDeductionsPage() {
  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <RouterProvider router={createPulseRouter(["/deductions"])} />
    </QueryClientProvider>,
  );
}

describe("DeductionsPage", () => {
  test("renders the live deductions scaffold and opens the form modal", async () => {
    const payload = buildMockPayload();
    const caseApiSpy = vi
      .spyOn(caseApi, "caseApiGetJson")
      .mockResolvedValueOnce(payload as never);
    const consoleTableSpy = vi.spyOn(console, "table").mockImplementation(() => undefined);

    renderDeductionsPage();

    expect(
      await screen.findByRole("heading", { name: "Deductions & Expenses", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Deduction" })).toBeInTheDocument();
    expect(screen.getByText("Track deductible expenses to reduce your tax liability")).toBeInTheDocument();
    expect(await screen.findByText("Estimated Tax Savings")).toBeInTheDocument();
    expect(screen.getByText("$950.55")).toBeInTheDocument();
    expect(screen.getByText("Deduction Method")).toBeInTheDocument();
    expect(screen.getByText("Standard ($12,500)")).toBeInTheDocument();
    expect(await screen.findByRole("table", { name: "Deduction records" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(26);
    expect(screen.getAllByRole("columnheader")).toHaveLength(6);
    expect(screen.getByRole("columnheader", { name: "ACTION" })).toBeInTheDocument();
    expect(screen.getAllByText("2026-07-30")).toHaveLength(25);
    expect(screen.getByText("Synthetic deduction 1")).toBeInTheDocument();
    expect(screen.getAllByText("Business Expense").length).toBeGreaterThan(0);
    expect(screen.getByText("$63,000")).toBeInTheDocument();
    expect(screen.getByText("-$780")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(25);

    await waitFor(() => {
      expect(caseApiSpy).toHaveBeenCalledWith("/v1/cases/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22/deductions");
    });

    await waitFor(() => {
      expect(consoleTableSpy).toHaveBeenCalledWith(payload.deductions);
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Deduction" }));

    expect(await screen.findByRole("dialog", { name: "New Deduction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Deduction" })).toBeInTheDocument();
  });
});
