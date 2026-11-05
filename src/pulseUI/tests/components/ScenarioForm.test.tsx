import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ScenarioForm } from "../../components/ScenarioForm.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderScenarioForm() {
  render(<ScenarioForm onClose={vi.fn()} />);
}

describe("ScenarioForm", () => {
  test("renders the modal and default controls", () => {
    renderScenarioForm();

    expect(screen.getByRole("dialog", { name: "New What-If Scenario" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Scenario" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Add additional scenario" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Income Type" })).toHaveValue("w2");
    expect(screen.getByText("4 scenario slots left 1 additional scenario required")).toBeInTheDocument();
    expect(screen.getByText("New Scenarios")).toBeInTheDocument();
    expect(screen.queryByText("Case ID")).not.toBeInTheDocument();
  });

  test("shows inline validation errors and logs invalid submission attempts", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderScenarioForm();

    fireEvent.click(screen.getByRole("button", { name: "Create Scenario" }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    expect(screen.getByText("Add at least 2 scenarios")).toBeInTheDocument();
    expect(screen.getByText("Scenario Name is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(screen.getByText("Additional Income is required")).toBeInTheDocument();
    expect(screen.getByText("Additional Deductions is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Scenario Name")).toHaveAttribute("aria-invalid", "true");
  });

  test("logs successful payloads with console.info after two scenarios are entered", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    renderScenarioForm();

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

    fireEvent.click(screen.getByRole("button", { name: "Add additional scenario" }));
    expect(screen.getAllByRole("separator")).toHaveLength(1);

    const scenarioNameInputs = screen.getAllByLabelText("Scenario Name");
    const descriptionInputs = screen.getAllByLabelText("Description");
    const incomeInputs = screen.getAllByLabelText("Additional Income");
    const deductionInputs = screen.getAllByLabelText("Additional Deductions");
    const incomeTypeSelects = screen.getAllByLabelText("Income Type");

    expect(scenarioNameInputs).toHaveLength(2);
    expect(descriptionInputs).toHaveLength(2);
    expect(incomeInputs).toHaveLength(2);
    expect(deductionInputs).toHaveLength(2);
    expect(incomeTypeSelects).toHaveLength(2);

    fireEvent.change(scenarioNameInputs[1]!, {
      target: { value: "Sell a rental property" },
    });
    fireEvent.change(descriptionInputs[1]!, {
      target: { value: "Capture a capital gain event" },
    });
    fireEvent.change(incomeInputs[1]!, {
      target: { value: "12000.00" },
    });
    fireEvent.change(deductionInputs[1]!, {
      target: { value: "2500.00" },
    });
    fireEvent.change(incomeTypeSelects[1]!, {
      target: { value: "cg" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Scenario" }));

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });
  });

  test("starts with a clean form when reopened after validation errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<ScenarioForm onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Scenario" }));
    expect(await screen.findByText("Scenario Name is required")).toBeInTheDocument();

    unmount();
    renderScenarioForm();

    expect(screen.queryByText("Scenario Name is required")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Scenario Name")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
  });

  test("disables the add scenario control after five total scenarios", () => {
    renderScenarioForm();

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Add additional scenario" }));
    }

    expect(screen.getByText("Scenario 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add additional scenario" })).toBeDisabled();
    expect(screen.getByText("0 scenario slots left, Maximum allowed scenarios")).toBeInTheDocument();
  });

  test("calls the close handler on escape", () => {
    const onClose = vi.fn();

    render(<ScenarioForm onClose={onClose} />);

    expect(screen.getByRole("dialog", { name: "New What-If Scenario" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
