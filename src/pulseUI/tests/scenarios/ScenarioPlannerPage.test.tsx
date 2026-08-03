import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { ScenarioPlannerPage } from "../../pages/scenarios/ScenarioPlannerPage.tsx";

beforeAll(() => {
  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
});

describe("ScenarioPlannerPage", () => {
  test("renders a single shared page header without case gating", () => {
    render(<ScenarioPlannerPage />);

    expect(screen.getAllByRole("heading", { name: "Scenario Planner" })).toHaveLength(1);
    expect(screen.queryByRole("combobox", { name: "Case ID" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Select a case to load/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New What-If Scenario" })).toBeEnabled();
  });

  test("opens and closes the scenario modal", async () => {
    render(<ScenarioPlannerPage />);

    fireEvent.click(screen.getByRole("button", { name: "New What-If Scenario" }));
    expect(await screen.findByRole("dialog", { name: "New What-If Scenario" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "New What-If Scenario" })).not.toBeInTheDocument();
  });
});
