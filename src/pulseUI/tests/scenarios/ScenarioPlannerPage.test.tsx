import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { taxPlanCycleRows } from "../../../typescript/shared/database/seed.model.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

const seededCaseId = taxPlanCycleRows[1].id;

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
});

function renderScenarioPlannerRoute(pathname: string) {
  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider>
        <RouterProvider router={createPulseRouter([pathname])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );
}

describe("ScenarioPlannerPage", () => {
  test("renders the case gate when caseId is missing", async () => {
    renderScenarioPlannerRoute("/scenarios");

    expect(await screen.findByText("Signed in as Advisor")).toBeInTheDocument();
    expect(await screen.findByRole("combobox", { name: "Case ID" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Select a case to load Scenario Planner" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New scenario" })).toBeDisabled();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose an accessible Tax Plan Cycle from the selector above before this tool fetches or changes case data.",
      ),
    ).toBeInTheDocument();
  });

  test("opens and closes the scenario modal when a caseId is present", async () => {
    renderScenarioPlannerRoute(`/scenarios?caseId=${seededCaseId}`);

    expect(await screen.findByText("Signed in as Advisor")).toBeInTheDocument();
    expect(await screen.findByRole("combobox", { name: "Case ID" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "New scenario" })).toBeEnabled();
    expect(await screen.findByText("Scenario workspace")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New scenario" }));
    expect(await screen.findByRole("dialog", { name: "New What-If Scenario" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "New What-If Scenario" })).not.toBeInTheDocument();
  });
});
