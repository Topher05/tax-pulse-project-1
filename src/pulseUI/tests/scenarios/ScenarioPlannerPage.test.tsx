import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
});

function renderScenarioPlanner() {
  localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <RouterProvider router={createPulseRouter(["/scenarios"])} />
    </QueryClientProvider>,
  );
}

describe("Scenario Planner page", () => {
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
