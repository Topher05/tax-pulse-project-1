import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ScenarioPlanningForm } from "../../components/ScenarioPlanningForm.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderScenarioPlanningForm() {
  render(<ScenarioPlanningForm onClose={vi.fn()} />);
}

describe("ScenarioPlanningForm", () => {
  test("renders the modal and default fields", () => {
    renderScenarioPlanningForm();

    expect(screen.getByRole("dialog", { name: "New What-If Scenario" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Scenario" })).not.toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Income Type" })).toHaveValue("w2");
  });

  test("shows inline validation errors and logs invalid submission attempts", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderScenarioPlanningForm();

    fireEvent.click(screen.getByRole("button", { name: "Create Scenario" }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    const dialog = screen.getByRole("dialog", { name: "New What-If Scenario" });
    expect(within(dialog).getByText("Scenario Name is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(screen.getByText("Additional Income is required")).toBeInTheDocument();
    expect(screen.getByText("Additional Deductions is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Scenario Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Create Scenario" })).toBeDisabled();
  });

  test("logs successful payloads with console.table", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleTableSpy = vi.spyOn(console, "table").mockImplementation(() => {});

    renderScenarioPlanningForm();

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
    });
  });

  test("blocks negative decimal values inline", async () => {
    renderScenarioPlanningForm();

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
  });

  test("calls the close handler on escape", () => {
    const onClose = vi.fn();

    render(<ScenarioPlanningForm onClose={onClose} />);

    expect(screen.getByRole("dialog", { name: "New What-If Scenario" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
