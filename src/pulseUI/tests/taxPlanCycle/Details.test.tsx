import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as detailQueries from "../../pages/taxPlanCycle/queries.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Tax Plan Cycle details page", () => {
  test("renders the case header and stage stepper", async () => {
    vi.spyOn(detailQueries, "fetchTaxPlanCycleDetails").mockResolvedValue({
      caseId: "TP-24018",
      client: "North Shore Family Office",
      stage: "Review",
      owner: "Maya Reed",
      priority: "High",
      dueDate: "May 12, 2026",
      scenarioCount: 2,
      onHold: false,
      overdue: true,
    });

    render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <RouterProvider router={createPulseRouter(["/cycles/TP-24018"])} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "North Shore Family Office - Q2 2026 Tax Plan",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Advance Stage →" })).toBeInTheDocument();

    const stepper = screen.getByLabelText("Case stage progression");
    expect(within(stepper).getByText("Review")).toBeInTheDocument();
  });

  test("renders overview and side panel content after the case loads", async () => {
    vi.spyOn(detailQueries, "fetchTaxPlanCycleDetails").mockResolvedValue({
      caseId: "TP-24018",
      client: "North Shore Family Office",
      stage: "Modeling",
      owner: "Maya Reed",
      priority: "High",
      dueDate: "May 12, 2026",
      scenarioCount: 2,
      onHold: false,
      overdue: true,
    });

    render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <RouterProvider router={createPulseRouter(["/cycles/TP-24018"])} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Q2 2026 (April-June)")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Case Properties" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run new scenario" })).toBeInTheDocument();
  });
});
