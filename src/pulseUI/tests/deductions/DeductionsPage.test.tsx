import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as caseApi from "../../shared/caseApi.ts";
import { taxPlanCycleRows } from "../../../typescript/shared/database/seed.model.ts";

const seededCaseId = taxPlanCycleRows[1].id;

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
  return Array.from({ length: 25 }, (_value, index) => ({
    id: `ded-${String(index + 1).padStart(3, "0")}`,
    case_id: seededCaseId,
    date: "2026-07-30",
    description: `Synthetic deduction ${index + 1}`,
    category: deductionCategories[index % deductionCategories.length] ?? "Other",
    amount: String(780 + index * 145),
    tax_impact: String(195 + index * 35),
    deleted: false,
  }));
}

function buildParsedPayload() {
  return buildMockPayload().map((row) => ({
    ...row,
    amount: Number(row.amount),
    tax_impact: Number(row.tax_impact),
  }));
}

function buildTaxPlanCycleQueuePayload() {
  return taxPlanCycleRows.map((row) => ({
    id: row.id,
    client_id: row.clientId,
    stage: row.stage,
    owner: row.owner,
    priority: row.priority,
    due_date: row.dueDate.toISOString().slice(0, 10),
    on_hold: row.onHold,
    hold_reason: row.holdReason,
    is_overdue: false,
    updated_at: "2026-07-30T00:00:00.000Z",
  }));
}

function mockCaseApi(payload = buildMockPayload()) {
  return vi.spyOn(caseApi, "caseApiGetJson").mockImplementation(async (path) => {
    if (path === "/v1/tax-plan-cycles") {
      return buildTaxPlanCycleQueuePayload() as never;
    }

    if (path === `/v1/cases/${seededCaseId}/deductions`) {
      return payload as never;
    }

    throw new Error(`Unexpected request: ${path}`);
  });
}

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderDeductionsPage(initialPath = "/deductions") {
  const router = createPulseRouter([initialPath]);

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

describe("DeductionsPage", () => {
  test("blocks deductions fetch and form launch until a case is selected", async () => {
    const caseApiSpy = mockCaseApi();

    renderDeductionsPage();

    expect(
      await screen.findByRole("heading", { name: "Deductions & Expenses", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Select a case to load deductions" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Deduction" })).toBeDisabled();

    await waitFor(() => {
      expect(caseApiSpy).toHaveBeenCalledWith("/v1/tax-plan-cycles");
    });
    expect(caseApiSpy).not.toHaveBeenCalledWith(`/v1/cases/${seededCaseId}/deductions`);
  });

  test("selecting a case updates router search and fetches deductions for that case", async () => {
    const payload = buildMockPayload();
    const parsedPayload = buildParsedPayload();
    const caseApiSpy = mockCaseApi(payload);
    const consoleTableSpy = vi.spyOn(console, "table").mockImplementation(() => undefined);

    const router = renderDeductionsPage();

    expect(
      await screen.findByRole("heading", { name: "Deductions & Expenses", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Deduction" })).toBeDisabled();

    fireEvent.change(await screen.findByRole("combobox", { name: "Case ID" }), {
      target: { value: seededCaseId },
    });

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ caseId: seededCaseId });
    });

    expect(screen.getByRole("button", { name: "Add Deduction" })).toBeEnabled();
    expect(screen.getByText("Track deductible expenses to reduce your tax liability")).toBeInTheDocument();
    expect(await screen.findByText("Estimated Tax Savings")).toBeInTheDocument();
    expect(screen.getByText("$950.55")).toBeInTheDocument();
    expect(screen.getByText("Deduction Method")).toBeInTheDocument();
    expect(screen.getByText("Standard ($12,500)")).toBeInTheDocument();
    expect(screen.getByText("Deduction table wiring is disabled pending scrum-115.")).toBeInTheDocument();
    expect(screen.getByText("$63,000")).toBeInTheDocument();

    await waitFor(() => {
      expect(caseApiSpy).toHaveBeenCalledWith(`/v1/cases/${seededCaseId}/deductions`);
    });

    await waitFor(() => {
      expect(consoleTableSpy).toHaveBeenCalledWith(parsedPayload);
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Deduction" }));

    expect(await screen.findByRole("dialog", { name: "New Deduction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Deduction" })).toBeInTheDocument();
  });

  test("loads deductions immediately when the route already has a valid case ID", async () => {
    const caseApiSpy = mockCaseApi();

    renderDeductionsPage(`/deductions?caseId=${seededCaseId}`);

    await waitFor(() => {
      expect(caseApiSpy).toHaveBeenCalledWith(`/v1/cases/${seededCaseId}/deductions`);
    });
    expect(await screen.findByRole("button", { name: "Add Deduction" })).toBeEnabled();
  });
});
