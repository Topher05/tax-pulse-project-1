import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { taxPlanCycleRows } from "../../../typescript/shared/database/seed.model.ts";

const seededCaseId = taxPlanCycleRows[1].id;

beforeAll(() => {
  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
});

function renderScenarioPlannerRoute(pathname: string) {
  render(<RouterProvider router={createPulseRouter([pathname])} />);
}

describe("ScenarioPlannerPage", () => {
  test("renders the case gate when caseId is missing", async () => {
    renderScenarioPlannerRoute("/scenarios");

    expect(
      await screen.findByRole("heading", { name: "Select a case to load Scenario Planner" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose an accessible Tax Plan Cycle from the selector above before this tool fetches or changes case data.",
      ),
    ).toBeInTheDocument();
  });

  test("opens and closes the scenario modal when a caseId is present", async () => {
    renderScenarioPlannerRoute(`/scenarios?caseId=${seededCaseId}`);

    expect(await screen.findByRole("button", { name: "New What-If Scenario" })).toBeEnabled();
    expect(await screen.findByText("Scenario workspace")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New What-If Scenario" }));
    expect(await screen.findByRole("dialog", { name: "New What-If Scenario" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "New What-If Scenario" })).not.toBeInTheDocument();
  });
});
