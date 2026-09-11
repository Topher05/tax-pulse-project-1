import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { axe } from "vitest-axe";

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
  vi.restoreAllMocks();
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
      route_key: taxPlanCycleRows[1].routeKey,
      client_id: taxPlanCycleRows[1].clientId,
      client_name: "Test Client",
      planning_period: "2026-Q2",
      cycle_label: "Test Client · Q2 2026 Tax Plan",
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
  return buildFixtureEstimates().map((estimate) => ({
      case_id: caseId,
      tax_year: estimate.taxYear,
      quarter: estimate.quarter,
      due_date: estimate.dueDate,
      estimated_payment: estimate.estimatedPayment.toFixed(2),
      withholding_applied: estimate.withholdingApplied.toFixed(2),
      covered_amount: estimate.coveredAmount.toFixed(2),
      remaining_due: estimate.remainingDue.toFixed(2),
      status: estimate.status,
    }));
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

function renderQuarterlyPaymentsPage(initialPath = "/quarterly-payments") {
  return render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider>
        <RouterProvider router={createPulseRouter([initialPath])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );
}

describe("QuarterlyPaymentsPage", () => {
  test("passes axe on the rendered screen", async () => {
    const { container } = render(
      <QuarterlyPaymentsScreen quarterlyEstimates={buildFixtureEstimates()} />,
    );

    const results = await axe(container, {
      rules: {
        "color-contrast": {
          enabled: false,
        },
      },
    });

    expect(results.violations).toHaveLength(0);
  });

  test("renders the quarterly payments route", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce(buildTaxPlanCycleQueuePayload() as never);

    renderQuarterlyPaymentsPage();

    expect(
      await screen.findByRole("heading", { name: "Quarterly Payments", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Tax plan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Select a tax plan to load quarterly payments/i })).toBeInTheDocument();
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

    renderQuarterlyPaymentsPage();

    const selector = await screen.findByRole("combobox", { name: "Tax plan" });
    await screen.findByRole("option", { name: "Test Client · Q2 2026 Tax Plan" });

    fireEvent.change(selector, { target: { value: caseId } });

    await waitFor(() => {
      expect(caseApiMock).toHaveBeenCalledWith(
        `/v1/tax-plan-cycles/${caseId}/quarterly-estimates`,
        expect.any(Function),
      );
    });

    await waitFor(() => {
      const timeline = screen.getByRole("list", { name: "Quarter timeline" });
      expect(within(timeline).getAllByRole("listitem")).toHaveLength(4);
    });

    const timelineItems = within(screen.getByRole("list", { name: "Quarter timeline" }))
      .getAllByRole("listitem");
    expect(within(timelineItems[0]!).getByText("Q1 2026 Estimation")).toBeInTheDocument();
    expect(within(timelineItems[0]!).getByText("$3,620")).toBeInTheDocument();
    expect(within(timelineItems[3]!).getByText("Q4 2026 Estimation")).toBeInTheDocument();
    expect(within(timelineItems[3]!).getByText("Jan")).toBeInTheDocument();
    expect(within(timelineItems[3]!).getByText("15")).toBeInTheDocument();
    expect(within(timelineItems[3]!).getByText("$3,960")).toBeInTheDocument();
  });

  test("renders loading skeleton while quarterly estimates are in flight and then renders data", async () => {
    const caseId = taxPlanCycleRows[1].id;
    const deferred = createDeferred<ReturnType<typeof buildQuarterlyEstimatePayload>>();
    const caseApiMock = vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/tax-plan-cycles/${caseId}/quarterly-estimates`) {
        return deferred.promise as never;
      }

      throw new Error(`Unexpected quarterly payments request: ${path}`);
    });

    const { container } = renderQuarterlyPaymentsPage(`/quarterly-payments?caseId=${caseId}`);

    expect(
      await screen.findByRole("heading", { name: "Quarterly Payments", level: 2 }),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-quarterly-query-state="loading"]')).not.toBeNull();
    expect(
      screen.getByRole("status", { name: "Loading quarterly estimates" }),
    ).toBeInTheDocument();

    await act(async () => {
      deferred.resolve(buildQuarterlyEstimatePayload(caseId));
    });

    await waitFor(() => {
      expect(container.querySelector('[data-quarterly-query-state="data"]')).not.toBeNull();
    });

    expect(screen.getByRole("heading", { name: "Timeline", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Quarter timeline" })).toBeInTheDocument();
    expect(screen.getByText("Q1 2026 Estimation")).toBeInTheDocument();
    expect(screen.getAllByText("$3,620")).toHaveLength(2);
    expect(caseApiMock).toHaveBeenCalledWith(
      `/v1/tax-plan-cycles/${caseId}/quarterly-estimates`,
      expect.any(Function),
    );
  });

  test("renders the empty state when no quarterly estimates exist for the period", async () => {
    const caseId = taxPlanCycleRows[1].id;
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/tax-plan-cycles/${caseId}/quarterly-estimates`) {
        return Promise.resolve([] as never);
      }

      throw new Error(`Unexpected quarterly payments request: ${path}`);
    });

    const { container } = renderQuarterlyPaymentsPage(`/quarterly-payments?caseId=${caseId}`);

    await waitFor(() => {
      expect(container.querySelector('[data-quarterly-query-state="empty"]')).not.toBeNull();
    });

    expect(screen.getByRole("heading", { name: "No quarterly estimates yet" })).toBeInTheDocument();
    expect(
      screen.getByText("This case has no quarterly estimates for the selected period."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Timeline", level: 2 })).not.toBeInTheDocument();
  });

  test("renders an error state with retry and recovers after a successful retry", async () => {
    const caseId = taxPlanCycleRows[1].id;
    let quarterlyRequestCount = 0;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path: string) => {
      if (path === "/v1/tax-plan-cycles") {
        return Promise.resolve(buildTaxPlanCycleQueuePayload() as never);
      }

      if (path === `/v1/tax-plan-cycles/${caseId}/quarterly-estimates`) {
        quarterlyRequestCount += 1;

        if (quarterlyRequestCount === 1) {
          return Promise.reject(new Error("quarterly estimates endpoint unavailable")) as never;
        }

        return Promise.resolve(buildQuarterlyEstimatePayload(caseId) as never);
      }

      throw new Error(`Unexpected quarterly payments request: ${path}`);
    });

    const { container } = renderQuarterlyPaymentsPage(`/quarterly-payments?caseId=${caseId}`);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Quarterly estimates could not load" }),
    ).toBeInTheDocument();
    expect(screen.getByText("quarterly estimates endpoint unavailable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(container.querySelector('[data-quarterly-query-state="data"]')).not.toBeNull();
    });

    expect(screen.getByRole("heading", { name: "Timeline", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Q1 2026 Estimation")).toBeInTheDocument();
    expect(quarterlyRequestCount).toBe(2);
  });

  test("renders the read-only timeline and withholding placeholder", () => {
    render(<QuarterlyPaymentsScreen quarterlyEstimates={buildFixtureEstimates()} />);

    expect(screen.getByRole("heading", { name: "Timeline", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Withholding Progress", level: 2 })).toBeInTheDocument();
    const timeline = screen.getByRole("list", { name: "Quarter timeline" });
    const timelineItems = within(timeline).getAllByRole("listitem");
    expect(timelineItems).toHaveLength(4);
    expect(within(timeline).getByText("Q1 2026 Estimation")).toBeInTheDocument();
    expect(within(timeline).getByText("Q2 2026 Estimation")).toBeInTheDocument();
    expect(within(timeline).getByText("Q3 2026 Estimation")).toBeInTheDocument();
    expect(within(timeline).getByText("Q4 2026 Estimation")).toBeInTheDocument();

    const firstItem = timelineItems[0]!;
    expect(within(firstItem).getByText("Apr")).toBeInTheDocument();
    expect(within(firstItem).getByText("15")).toBeInTheDocument();
    expect(within(firstItem).getByText("Q1 2026 Estimation")).toBeInTheDocument();
    expect(within(firstItem).getByText("Withholding applied: $3,620")).toBeInTheDocument();
    expect(within(firstItem).getByText("Paid")).toBeInTheDocument();

    const kpiRegion = screen.getByRole("region", { name: "Quarterly payments KPI region" });
    const kpiCards = within(kpiRegion).getAllByRole("article");
    expect(kpiCards).toHaveLength(3);
    expect(kpiCards[0]).toHaveTextContent("Total Estimated$14,600");
    expect(kpiCards[1]).toHaveTextContent("Paid So Far$7,240");
    expect(kpiCards[2]).toHaveTextContent("Remaining Due$7,360");
    expect(screen.getByText("49.6%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Estimated tax covered by withholding" }))
      .toHaveAttribute("aria-valuenow", "49.6");
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
