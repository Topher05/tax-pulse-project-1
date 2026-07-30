import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { AuthenticatedSessionProvider } from "../auth/AuthenticatedSessionProvider.tsx";
import * as queueQueries from "../../entities/taxPlanCycleQueries.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderQueue() {
  vi.spyOn(queueQueries, "fetchTaxPlanCycleQueue").mockResolvedValue([
    {
      caseId: "TP-24018",
      client: "North Shore Family Office",
      stage: "Modeling",
      owner: "Maya Reed",
      priority: "High",
      dueDate: "May 12, 2026",
      updatedDate: "May 11, 2026",
      overdue: true,
    },
    {
      caseId: "TP-24021",
      client: "Harbor Point Advisors",
      stage: "Review",
      owner: "Jordan Kim",
      priority: "Medium",
      dueDate: "Jun 03, 2026",
      updatedDate: "May 29, 2026",
      overdue: false,
    },
    {
      caseId: "TP-24027",
      client: "Cedar Ridge Wealth",
      stage: "Modeling",
      owner: "Avery Chen",
      priority: "Low",
      dueDate: "Jun 06, 2026",
      updatedDate: "May 31, 2026",
      overdue: false,
    },
    {
      caseId: "TP-24033",
      client: "Summit View Partners",
      stage: "Executed",
      owner: "Noah Patel",
      priority: "High",
      dueDate: "Jun 09, 2026",
      updatedDate: "Jun 01, 2026",
      overdue: false,
    },
    {
      caseId: "TP-24038",
      client: "Beacon Street Group",
      stage: "Review",
      owner: "Isla Torres",
      priority: "Medium",
      dueDate: "Jun 12, 2026",
      updatedDate: "Jun 04, 2026",
      overdue: false,
    },
  ]);

  vi.spyOn(queueQueries, "fetchTaxPlanCycleDetails").mockResolvedValue({
    caseId: "TP-24018",
    client: "North Shore Family Office",
    stage: "Modeling",
    owner: "Maya Reed",
    priority: "High",
    dueDate: "May 12, 2026",
    scenarioCount: 3,
    onHold: false,
    overdue: true,
  });

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <AuthenticatedSessionProvider>
        <RouterProvider router={createPulseRouter(["/cycles/queue"])} />
      </AuthenticatedSessionProvider>
    </QueryClientProvider>,
  );
}

describe("Tax Plan Cycle queue page", () => {
  test("renders the Open Cycles KPI", async () => {
    renderQueue();

    expect(await screen.findByText("Open Cycles")).toBeInTheDocument();
  });

  test("renders the tax plan cycle cases table heading", async () => {
    renderQueue();

    expect(
      await screen.findByRole("heading", { name: "Tax Plan Cycle Cases" }),
    ).toBeInTheDocument();
  });

  test("renders five open action buttons", async () => {
    renderQueue();

    const table = await screen.findByRole("table", { name: "Tax Plan Cycle Cases" });

    expect(within(table).getAllByRole("button", { name: "Open" })).toHaveLength(5);
  });

  test("renders the expected number of visible table rows", async () => {
    renderQueue();

    const table = await screen.findByRole("table", { name: "Tax Plan Cycle Cases" });

    expect(within(table).getAllByRole("row")).toHaveLength(6);
  });

  test("routes the open button to the details view", async () => {
    renderQueue();

    const table = await screen.findByRole("table", { name: "Tax Plan Cycle Cases" });
    fireEvent.click(within(table).getAllByRole("button", { name: "Open" })[0]!);

    expect(
      await screen.findByRole("heading", {
        name: "North Shore Family Office - Q2 2026 Tax Plan",
      }),
    ).toBeInTheDocument();
  });
});
