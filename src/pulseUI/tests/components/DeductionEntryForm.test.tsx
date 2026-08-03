import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { DeductionEntryForm } from "../../components/DeductionEntryForm.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DeductionEntryForm", () => {
  test("renders the modal with the default category", () => {
    render(<DeductionEntryForm onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "New Deduction" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue("Business Expense");
    expect(screen.getByRole("button", { name: "Create Deduction" })).toBeEnabled();
  });

  test("shows inline validation errors and disables submit when required fields are missing", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<DeductionEntryForm onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Deduction" }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    expect(screen.getByText("Date is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(screen.getByText("Amount is required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Deduction" })).toBeDisabled();
  });

  test("logs a successful payload with console.table and closes the modal", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleTableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
    const onClose = vi.fn();

    render(<DeductionEntryForm onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-07-30" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Home office desk and chair" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "1850.55" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Deduction" }));

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleTableSpy).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  test("closes from escape and cancel actions", () => {
    const onClose = vi.fn();

    render(<DeductionEntryForm onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
