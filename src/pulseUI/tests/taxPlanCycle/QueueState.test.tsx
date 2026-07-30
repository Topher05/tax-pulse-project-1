import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import type { PlanCycleQueueRow } from "../../entities/taxPlanCycle.ts";
import * as queueQueries from "../../entities/taxPlanCycleQueries.ts";
import { AuthenticatedSessionProvider } from "../auth/AuthenticatedSessionProvider.tsx";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPlanCycle() {
  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <AuthenticatedSessionProvider>
        <RouterProvider router={createPulseRouter(["/cycles/queue"])} />
      </AuthenticatedSessionProvider>
    </QueryClientProvider>,
  );
}

function createDeferredQueue() {
  let resolveQueue: (items: readonly PlanCycleQueueRow[]) => void = () => undefined;
  const promise = new Promise<readonly PlanCycleQueueRow[]>((resolve) => {
    resolveQueue = resolve;
  });

  return { promise, resolveQueue };
}

describe("Plan Cycle Queue request states", () => {
  test("renders a loading skeleton while the queue request is in flight", async () => {
    const queueRequest = createDeferredQueue();
    vi.spyOn(queueQueries, "fetchTaxPlanCycleQueue").mockReturnValueOnce(queueRequest.promise);

    renderPlanCycle();

    expect(
      await screen.findByRole("status", { name: "Loading Plan Cycle Queue" }),
    ).toBeInTheDocument();
  });

  test("renders the empty state when the tenant has no open cycles", async () => {
    vi.spyOn(queueQueries, "fetchTaxPlanCycleQueue").mockResolvedValueOnce([]);

    renderPlanCycle();

    expect(await screen.findByRole("heading", { name: "No open plan cycles" })).toBeInTheDocument();
  });

  test("renders an error state with retry when the queue request fails", async () => {
    vi.spyOn(queueQueries, "fetchTaxPlanCycleQueue").mockRejectedValueOnce(
      new Error("Read model unavailable."),
    );

    renderPlanCycle();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  test("retries the queue request and can recover after failure", async () => {
    const fetchQueue = vi
      .spyOn(queueQueries, "fetchTaxPlanCycleQueue")
      .mockRejectedValueOnce(new Error("Temporary queue failure."))
      .mockResolvedValueOnce([]);

    renderPlanCycle();

    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(fetchQueue).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("heading", { name: "No open plan cycles" })).toBeInTheDocument();
  });

  test("renders the success branch when the queue request has data", async () => {
    vi.spyOn(queueQueries, "fetchTaxPlanCycleQueue").mockResolvedValueOnce([
      {
        caseId: "case-placeholder",
        client: "North Shore Family Office",
        stage: "Modeling",
        owner: "advisor-001",
        priority: "High",
        dueDate: "May 12, 2026",
        updatedDate: "May 11, 2026",
        overdue: false,
      },
    ]);

    renderPlanCycle();

    expect(await screen.findByText("North Shore Family Office")).toBeInTheDocument();
  });
});
