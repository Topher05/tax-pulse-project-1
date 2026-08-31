import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as caseApi from "../../shared/caseApi.ts";
import { isUuid } from "../../shared/planToolCase.ts";
import { taxPlanCycleRows } from "../../../typescript/shared/database/seed.model.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

const seededCaseId = taxPlanCycleRows[1].id;

type DeductionApiRow = {
  id: string;
  case_id: string;
  date: string;
  description: string;
  category: string;
  amount: string;
  tax_impact: string;
  deleted: boolean;
};

if (!isUuid(seededCaseId)) {
  throw new Error("DeductionsPage test fixture must use a UUID-shaped case ID.");
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

const sampleDeductionPayload: readonly DeductionApiRow[] = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    case_id: seededCaseId,
    date: "2026-07-30",
    description: "Mortgage interest",
    category: "Home Office",
    amount: "18500.00",
    tax_impact: "4625.00",
    deleted: false,
  },
] as const;

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function renderDeductionsPage(initialPath: string) {
  return render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider>
        <RouterProvider router={createPulseRouter([initialPath])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
});

describe("DeductionsPage", () => {
  test("renders the case gate when the case ID is missing", async () => {
    const caseApiMock = vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      throw new Error(`Unexpected deductions request: ${path}`);
    });

    renderDeductionsPage("/deductions");

    expect(await screen.findByText("Signed in as Advisor")).toBeInTheDocument();
    expect(await screen.findByRole("combobox", { name: "Case ID" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Select a case to load deductions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose an accessible Tax Plan Cycle from the selector above before this tool fetches or changes case data.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Deduction" })).not.toBeInTheDocument();
    expect(caseApiMock.mock.calls.some(([path]) => String(path).startsWith("/v1/cases/"))).toBe(
      false,
    );
  });

  test("fetches deductions once a valid case ID is selected and renders loading then data state", async () => {
    const deferred = createDeferred<readonly DeductionApiRow[]>();
    const caseApiMock = vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/cases/${seededCaseId}/deductions`) {
        return deferred.promise as never;
      }

      throw new Error(`Unexpected deductions request: ${path}`);
    });

    const { container } = renderDeductionsPage("/deductions");

    expect(await screen.findByText("Signed in as Advisor")).toBeInTheDocument();
    const selector = await screen.findByRole("combobox", { name: "Case ID" });
    await screen.findByRole("option", { name: seededCaseId });

    fireEvent.change(selector, { target: { value: seededCaseId } });

    expect(selector).toHaveValue(seededCaseId);
    expect(container.querySelector('[data-deductions-query-state="loading"]')).not.toBeNull();
    expect(screen.getByRole("status", { name: "Loading deductions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Deduction" })).toBeEnabled();

    await act(async () => {
      deferred.resolve(sampleDeductionPayload);
    });

    await waitFor(() => {
      expect(container.querySelector('[data-deductions-query-state="data"]')).not.toBeNull();
    });

    expect(screen.getAllByText("$18,500")).toHaveLength(2);
    expect(screen.getAllByText("$4,625")).toHaveLength(2);
    expect(screen.getByRole("table", { name: "Recorded deductions" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tax Impact" })).toBeInTheDocument();
    expect(screen.getByText("Jul 30, 2026")).toBeInTheDocument();
    expect(screen.getByText("Mortgage interest")).toBeInTheDocument();
    expect(screen.getByText("Home Office")).toBeInTheDocument();
    expect(
      screen.queryByText("Deduction table wiring is disabled pending scrum-115."),
    ).not.toBeInTheDocument();
    expect(caseApiMock).toHaveBeenCalledWith(
      `/v1/cases/${seededCaseId}/deductions`,
      expect.any(Function),
    );
  });

  test("renders the empty state when the selected case has no deductions", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/cases/${seededCaseId}/deductions`) {
        return Promise.resolve([] as never);
      }

      throw new Error(`Unexpected deductions request: ${path}`);
    });

    const { container } = renderDeductionsPage("/deductions");

    expect(await screen.findByText("Signed in as Advisor")).toBeInTheDocument();
    const selector = await screen.findByRole("combobox", { name: "Case ID" });
    await screen.findByRole("option", { name: seededCaseId });

    fireEvent.change(selector, { target: { value: seededCaseId } });

    await waitFor(() => {
      expect(container.querySelector('[data-deductions-query-state="empty"]')).not.toBeNull();
    });

    expect(screen.getByRole("heading", { name: "No deductions yet" })).toBeInTheDocument();
    expect(screen.getByText("This case has no recorded deductions.")).toBeInTheDocument();
    expect(screen.getAllByText("$0")).toHaveLength(2);
    expect(
      screen.queryByText("Deduction table wiring is disabled pending scrum-115."),
    ).not.toBeInTheDocument();
  });

  test("renders the error state with retry when the deductions request fails", async () => {
    const deferred = createDeferred<readonly DeductionApiRow[]>();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/cases/${seededCaseId}/deductions`) {
        return deferred.promise as never;
      }

      throw new Error(`Unexpected deductions request: ${path}`);
    });

    const { container } = renderDeductionsPage("/deductions");

    expect(await screen.findByText("Signed in as Advisor")).toBeInTheDocument();
    const selector = await screen.findByRole("combobox", { name: "Case ID" });
    await screen.findByRole("option", { name: seededCaseId });

    fireEvent.change(selector, { target: { value: seededCaseId } });

    expect(selector).toHaveValue(seededCaseId);

    await act(async () => {
      deferred.reject(new Error("deductions endpoint unavailable"));
    });

    await waitFor(() => {
      expect(container.querySelector('[data-deductions-query-state="error"]')).not.toBeNull();
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deductions could not load" })).toBeInTheDocument();
    expect(screen.getByText("deductions endpoint unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(
      screen.queryByText("Deduction table wiring is disabled pending scrum-115."),
    ).not.toBeInTheDocument();
  });

  test("retries the deductions request and can recover after failure", async () => {
    let deductionsRequestCount = 0;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const caseApiMock = vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/cases/${seededCaseId}/deductions`) {
        deductionsRequestCount += 1;

        if (deductionsRequestCount === 1) {
          return Promise.reject(new Error("Temporary deductions failure.")) as never;
        }

        return Promise.resolve([] as never);
      }

      throw new Error(`Unexpected deductions request: ${path}`);
    });

    const { container } = renderDeductionsPage("/deductions");

    expect(await screen.findByText("Signed in as Advisor")).toBeInTheDocument();
    const selector = await screen.findByRole("combobox", { name: "Case ID" });
    await screen.findByRole("option", { name: seededCaseId });

    fireEvent.change(selector, { target: { value: seededCaseId } });

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(container.querySelector('[data-deductions-query-state="empty"]')).not.toBeNull();
    });

    expect(screen.getByRole("heading", { name: "No deductions yet" })).toBeInTheDocument();
    expect(caseApiMock).toHaveBeenCalledWith(
      `/v1/cases/${seededCaseId}/deductions`,
      expect.any(Function),
    );
    expect(deductionsRequestCount).toBe(2);
  });

  test("creates a deduction and renders it after the successful refetch", async () => {
    const createdDeduction = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e04",
      case_id: seededCaseId,
      date: "2026-08-01",
      description: "Advisor conference fee",
      category: "Education",
      amount: "900.00",
      tax_impact: "225.00",
      deleted: false,
    };
    let deductions: readonly DeductionApiRow[] = [];

    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/cases/${seededCaseId}/deductions`) {
        return Promise.resolve(deductions as never);
      }

      throw new Error(`Unexpected deductions request: ${path}`);
    });
    const createMock = vi.spyOn(caseApi, "caseApiSendJson").mockImplementation((path, init) => {
      if (path === `/v1/cases/${seededCaseId}/deductions`) {
        deductions = [createdDeduction];
        return Promise.resolve(createdDeduction as never);
      }

      throw new Error(`Unexpected deductions create request: ${path} ${JSON.stringify(init)}`);
    });

    renderDeductionsPage("/deductions");

    const selector = await screen.findByRole("combobox", { name: "Case ID" });
    await screen.findByRole("option", { name: seededCaseId });

    fireEvent.change(selector, { target: { value: seededCaseId } });

    await screen.findByRole("heading", { name: "No deductions yet" });
    fireEvent.click(screen.getByRole("button", { name: "Add Deduction" }));

    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-08-01" },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Education" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Advisor conference fee" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "900" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Deduction" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "New Deduction" })).not.toBeInTheDocument();
      expect(screen.getByText("Aug 1, 2026")).toBeInTheDocument();
    });

    expect(screen.getByRole("table", { name: "Recorded deductions" })).toBeInTheDocument();
    expect(screen.getByText("Advisor conference fee")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getAllByText("$900")).toHaveLength(2);
    expect(screen.getAllByText("$225")).toHaveLength(2);
    expect(createMock).toHaveBeenCalledWith(
      `/v1/cases/${seededCaseId}/deductions`,
      {
        method: "POST",
        body: {
          date: "2026-08-01",
          category: "Education",
          description: "Advisor conference fee",
          amount: 900,
        },
      },
      expect.any(Function),
    );
  });
});
