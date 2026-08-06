import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as caseApi from "../../shared/caseApi.ts";
import { taxPlanCycleRows } from "../../../typescript/shared/database/seed.model.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

const seededCaseId = taxPlanCycleRows[1].id;

type IncomeApiRow = {
  id: string;
  case_id: string;
  date: string;
  source: string;
  type: "w2" | "1099" | "capital-gains" | "rental" | "other";
  amount: string;
  withholding: string;
};

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

const sampleIncomePayload: readonly IncomeApiRow[] = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8ca107",
    case_id: seededCaseId,
    date: "2026-08-01",
    source: "Acme W-2",
    type: "w2",
    amount: "125000.50",
    withholding: "21500.25",
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

function renderIncomePage(initialPath = `/income?caseId=${seededCaseId}`) {
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
  cleanup();
  vi.restoreAllMocks();
});

describe("IncomePage", () => {
  test("renders the case gate when the case ID is missing", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      throw new Error(`Unexpected income request: ${path}`);
    });

    renderIncomePage("/income");

    expect(
      await screen.findByRole("heading", { name: "Income Events", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Case ID" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Select a case to load income events" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Income" })).not.toBeInTheDocument();
  });

  test("renders loading skeleton while income events are in flight and then renders data", async () => {
    const deferred = createDeferred<readonly IncomeApiRow[]>();
    const caseApiMock = vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/cases/${seededCaseId}/income-events`) {
        return deferred.promise as never;
      }

      throw new Error(`Unexpected income request: ${path}`);
    });

    const { container } = renderIncomePage();

    expect(
      await screen.findByRole("heading", { name: "Income Events", level: 2 }),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-income-query-state="loading"]')).not.toBeNull();
    expect(screen.getByRole("status", { name: "Loading income events" })).toBeInTheDocument();

    await act(async () => {
      deferred.resolve(sampleIncomePayload);
    });

    await waitFor(() => {
      expect(container.querySelector('[data-income-query-state="data"]')).not.toBeNull();
    });

    expect(screen.getByRole("table", { name: "Income events" })).toBeInTheDocument();
    expect(screen.getByText("Acme W-2")).toBeInTheDocument();
    expect(screen.getByText("Aug 1, 2026")).toBeInTheDocument();
    expect(screen.getAllByText("W-2")).toHaveLength(2);
    expect(screen.getAllByText("$125,000.50")).toHaveLength(2);
    expect(screen.getByText("$21,500.25")).toBeInTheDocument();
    expect(caseApiMock).toHaveBeenCalledWith(
      `/v1/cases/${seededCaseId}/income-events`,
      expect.any(Function),
    );
  });

  test("renders the empty state when the selected case has no income events", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/cases/${seededCaseId}/income-events`) {
        return Promise.resolve([] as never);
      }

      throw new Error(`Unexpected income request: ${path}`);
    });

    const { container } = renderIncomePage();

    await waitFor(() => {
      expect(container.querySelector('[data-income-query-state="empty"]')).not.toBeNull();
    });

    expect(screen.getByRole("heading", { name: "No income events yet" })).toBeInTheDocument();
    expect(
      screen.getByText("Add your first income event to start tracking your tax liability."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Income Event" })).toBeInTheDocument();
  });

  test("renders an error state with retry and recovers after a successful retry", async () => {
    let incomeRequestCount = 0;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/cases/${seededCaseId}/income-events`) {
        incomeRequestCount += 1;

        if (incomeRequestCount === 1) {
          return Promise.reject(new Error("income endpoint unavailable")) as never;
        }

        return Promise.resolve(sampleIncomePayload as never);
      }

      throw new Error(`Unexpected income request: ${path}`);
    });

    const { container } = renderIncomePage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Income events could not load" }),
    ).toBeInTheDocument();
    expect(screen.getByText("income endpoint unavailable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(container.querySelector('[data-income-query-state="data"]')).not.toBeNull();
    });

    expect(screen.getByRole("table", { name: "Income events" })).toBeInTheDocument();
    expect(screen.getByText("Acme W-2")).toBeInTheDocument();
    expect(incomeRequestCount).toBe(2);
  });
});
