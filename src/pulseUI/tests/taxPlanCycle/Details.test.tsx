import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
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
  test("renders the blank details placeholder", async () => {
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

    expect(
      await screen.findByText(`hello Details page ${String.fromCodePoint(0x1f680)}`),
    ).toBeInTheDocument();
  });

  test("renders fetched case details beneath the placeholder", async () => {
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

    expect(await screen.findByText("North Shore Family Office")).toBeInTheDocument();
  });
});
