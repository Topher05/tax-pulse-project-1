import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { IncomeScreen, type IncomeEvent } from "../../pages/income/IncomePage.tsx";
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
      client_name: "Test Client",
      planning_period: "2026-Q2",
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

const existingIncome: IncomeEvent = {
  id: "income-event-1",
  date: "2026-08-01",
  source: "Acme Corporation",
  type: "w2",
  amount: 1_500,
  withholding: 300,
};

function IncomeScreenHarness() {
  const [incomeEvents, setIncomeEvents] = useState<IncomeEvent[]>([existingIncome]);

  return (
    <IncomeScreen
      incomeEvents={incomeEvents}
      queryState="data"
      onRetry={() => undefined}
      onCreateIncome={(payload) => {
        setIncomeEvents((current) => [
          ...current,
          {
            id: "income-event-2",
            date: "2026-08-04",
            source: payload.source,
            type: payload.type,
            amount: payload.amount,
            withholding: payload.withholding,
          },
        ]);
      }}
    />
  );
}

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
  test("reflects parent data updates after a successful create callback", async () => {
    render(<IncomeScreenHarness />);

    const table = screen.getByRole("table", { name: "Income events" });
    const summaries = screen.getByLabelText("Income source summaries");

    for (const heading of ["Date", "Source", "Type", "Amount", "Withholding"]) {
      expect(within(table).getByRole("columnheader", { name: heading })).toBeInTheDocument();
    }
    expect(within(table).getByText("Acme Corporation")).toBeInTheDocument();
    expect(screen.getByLabelText("W-2 total")).toHaveTextContent("$1,500.00");
    expect(screen.getByLabelText("1099 total")).toHaveTextContent("$0.00");

    fireEvent.click(screen.getByRole("button", { name: "Add Income" }));
    const dialog = screen.getByRole("dialog", { name: "Add Income" });
    fireEvent.change(within(dialog).getByLabelText("Source"), {
      target: { value: "Consulting" },
    });
    fireEvent.change(within(dialog).getByLabelText("Type"), {
      target: { value: "1099" },
    });
    fireEvent.change(within(dialog).getByLabelText("Amount"), {
      target: { value: "250.25" },
    });
    fireEvent.change(within(dialog).getByLabelText("Withholding"), {
      target: { value: "25" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Income" }));

    await waitFor(() => {
      expect(within(table).getByText("Consulting")).toBeInTheDocument();
    });
    expect(within(summaries).getByText("1099")).toBeInTheDocument();
    expect(screen.getByLabelText("1099 total")).toHaveTextContent("$250.25");
    expect(within(table).getByText("$25.00")).toBeInTheDocument();
  });

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
    expect(screen.getByRole("combobox", { name: "Tax plan" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Select a tax plan to load income events" }),
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

  test("persists the Add Income form and renders the refreshed row", async () => {
    const createdRow: IncomeApiRow = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8ca218",
      case_id: seededCaseId,
      date: "2026-08-31",
      source: "Consulting",
      type: "1099",
      amount: "250.25",
      withholding: "25.00",
    };
    let incomeRows = [...sampleIncomePayload];
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }
      if (path === `/v1/cases/${seededCaseId}/income-events`) {
        return Promise.resolve(incomeRows as never);
      }
      throw new Error(`Unexpected income request: ${path}`);
    });
    const send = vi.spyOn(caseApi, "caseApiSendJson").mockImplementation(async () => {
      incomeRows = [...incomeRows, createdRow];
      return createdRow as never;
    });

    renderIncomePage();
    expect(await screen.findByText("Acme W-2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Income" }));
    const dialog = screen.getByRole("dialog", { name: "Add Income" });
    fireEvent.change(within(dialog).getByLabelText("Source"), {
      target: { value: "Consulting" },
    });
    fireEvent.change(within(dialog).getByLabelText("Type"), {
      target: { value: "1099" },
    });
    fireEvent.change(within(dialog).getByLabelText("Amount"), {
      target: { value: "250.25" },
    });
    fireEvent.change(within(dialog).getByLabelText("Withholding"), {
      target: { value: "25" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Income" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add Income" })).toBeNull());
    expect(await screen.findByText("Consulting")).toBeInTheDocument();
    expect(send).toHaveBeenCalledWith(
      `/v1/cases/${seededCaseId}/income-events`,
      {
        method: "POST",
        body: {
          source: "Consulting",
          type: "1099",
          amount: 250.25,
          withholding: 25,
        },
      },
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
