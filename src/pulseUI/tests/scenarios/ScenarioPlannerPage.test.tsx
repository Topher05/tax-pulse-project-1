import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderScenarioPlanner() {
  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <RouterProvider router={createPulseRouter(["/scenarios"])} />
    </QueryClientProvider>,
  );
}

describe("Scenario Planner page", () => {
  test("renders the launch button and opens the modal", async () => {
    renderScenarioPlanner();

    const launchButton = await screen.findByRole("button", { name: "New What-If Scenario" });
    expect(launchButton.querySelector("svg")).toBeInTheDocument();

    fireEvent.click(launchButton);

    expect(
      await screen.findByRole("dialog", { name: "New What-If Scenario" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Scenario" })).toBeInTheDocument();
  });

  test("closes the modal from the cancel button", async () => {
    renderScenarioPlanner();

    fireEvent.click(await screen.findByRole("button", { name: "New What-If Scenario" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "New What-If Scenario" })).not.toBeInTheDocument();
  });

  test("shows inline validation errors and logs invalid submission attempts", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderScenarioPlanner();

    fireEvent.click(await screen.findByRole("button", { name: "New What-If Scenario" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create Scenario" }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    expect(
      within(screen.getByRole("dialog", { name: "New What-If Scenario" })).getByText(
        "Scenario Name is required",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(screen.getByText("Additional Income is required")).toBeInTheDocument();
    expect(screen.getByText("Additional Deductions is required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Scenario" })).toBeDisabled();
    expect(screen.getByLabelText("Scenario Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Scenario Name").closest("[data-invalid='true']")).toBeInTheDocument();
  });

  test("defaults income type to W-2 and logs submitted data with console.table", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleTableSpy = vi.spyOn(console, "table").mockImplementation(() => {});

    renderScenarioPlanner();

    fireEvent.click(await screen.findByRole("button", { name: "New What-If Scenario" }));

    const dialog = screen.getByRole("dialog", { name: "New What-If Scenario" });
    expect(within(dialog).getByRole("combobox", { name: "Income Type" })).toHaveValue("w2");

    fireEvent.change(screen.getByLabelText("Scenario Name"), {
      target: { value: "Take a freelance project" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Additional $20k freelance income" },
    });
    fireEvent.change(screen.getByLabelText("Additional Income"), {
      target: { value: "20000.00" },
    });
    fireEvent.change(screen.getByLabelText("Additional Deductions"), {
      target: { value: "1500.00" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Scenario" }));

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleTableSpy).toHaveBeenCalledTimes(1);
      expect(consoleTableSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          scenarioName: "Take a freelance project",
          description: "Additional $20k freelance income",
          additionalIncome: 20000,
          additionalDeductions: 1500,
          incomeType: "w2",
        }),
      );
    });
    expect(screen.queryByRole("dialog", { name: "New What-If Scenario" })).not.toBeInTheDocument();
  });

  test("blocks negative decimal values inline", async () => {
    renderScenarioPlanner();

    fireEvent.click(await screen.findByRole("button", { name: "New What-If Scenario" }));

    fireEvent.change(screen.getByLabelText("Scenario Name"), {
      target: { value: "Take a freelance project" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Additional $20k freelance income" },
    });
    fireEvent.change(screen.getByLabelText("Additional Income"), {
      target: { value: "-1" },
    });
    fireEvent.change(screen.getByLabelText("Additional Deductions"), {
      target: { value: "-5" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Scenario" }));

    expect(await screen.findByText("Additional Income cannot be negative")).toBeInTheDocument();
    expect(await screen.findByText("Additional Deductions cannot be negative")).toBeInTheDocument();
    expect(screen.getByLabelText("Additional Income")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Additional Deductions")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Create Scenario" })).toBeDisabled();
  });
});
