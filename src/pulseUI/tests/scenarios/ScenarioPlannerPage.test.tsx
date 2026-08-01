import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as caseApi from "../../shared/caseApi.ts";
import { taxPlanCycleRows } from "../../../typescript/shared/database/seed.model.ts";

const seededCaseId = taxPlanCycleRows[1].id;

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

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderScenarioPlanner(initialPath = `/scenarios?caseId=${seededCaseId}`) {
  vi.spyOn(caseApi, "caseApiGetJson").mockImplementation(async (path) => {
    if (path === "/v1/tax-plan-cycles") {
      return buildTaxPlanCycleQueuePayload() as never;
    }

    throw new Error(`Unexpected request: ${path}`);
  });

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <RouterProvider router={createPulseRouter([initialPath])} />
    </QueryClientProvider>,
  );
}

describe("Scenario Planner page", () => {
  test("blocks scenario form launch until a case is selected", async () => {
    renderScenarioPlanner("/scenarios");

    expect(
      await screen.findByRole("heading", { name: "Select a case to load scenarios" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New What-If Scenario" })).toBeDisabled();
  });

  test("renders the launch button and opens the modal", async () => {
    renderScenarioPlanner();

    fireEvent.click(await screen.findByRole("button", { name: "New What-If Scenario" }));

    expect(
      await screen.findByRole("dialog", { name: "New What-If Scenario" }),
    ).toBeInTheDocument();
  });

  test("closes the modal from the launch-page state by cancel button", async () => {
    renderScenarioPlanner();

    fireEvent.click(await screen.findByRole("button", { name: "New What-If Scenario" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "New What-If Scenario" })).not.toBeInTheDocument();
  });
});
